import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { build } from 'esbuild'

const require = createRequire(import.meta.url)
const vue = require('vue')
const compiled = await build({
  entryPoints: [fileURLToPath(new URL('../visDashboard/ResourceCenter/hooks/useVisionTaskRanking.ts', import.meta.url))],
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  plugins: [{ name: 'hook-boundaries', setup(api) {
    const boundaries = {
      'vue-i18n': 'export const useI18n=()=>({t:key=>key})',
      '@vueuse/core': 'export const useDocumentVisibility=()=>context.visibility',
      '@jetlinks-web-core/store/menu': 'export const useMenuStore=()=>context.menu',
      '@jetlinks-web-core/utils/module-registry': 'export const moduleRegistry={getResourceItem:()=>({})}',
      './useResourceCapabilities': 'export const useResourceCapabilities=()=>context.capabilities',
      '../shared': 'export const settingsOf=()=>({limit:5,refreshSeconds:0})',
      '../services/visionTaskRanking': `export const visionRankingMetrics=['latency','discard','backlog'];export const loadVisionTaskRanking=(...args)=>context.load(...args)`,
    }
    api.onResolve({ filter: /.*/ }, args => boundaries[args.path] ? { path: args.path, namespace: 'stub' } : undefined)
    api.onLoad({ filter: /.*/, namespace: 'stub' }, args => ({ contents: boundaries[args.path], loader: 'js' }))
  } }],
})
const tick = async () => { await vue.nextTick(); await new Promise(setImmediate) }
const row = name => ({ id: name, gatewayId: 'g', gatewayName: 'gateway', taskId: name, name, sourceName: '', value: 10, detailAvailable: true })
function fixture(t, preview = false) {
  const calls = [], capabilities = { modules: vue.ref({ edge: true, vision: true }), scope: vue.ref('account-a') }
  const context = { capabilities, visibility: vue.ref('visible'), menu: { getMenu: () => true, jumpPage() {} },
    load: (metric, current) => new Promise((resolve, reject) => calls.push({ metric, current, resolve, reject })) }
  const module = { exports: {} }
  Function('module', 'exports', 'require', 'context', compiled.outputFiles[0].text)(module, module.exports, require, context)
  const scope = vue.effectScope(), edit = vue.ref(preview)
  const state = scope.run(() => module.exports.useVisionTaskRanking(vue.ref(undefined), edit))
  t.after(() => scope.stop())
  return { state, calls, capabilities, edit }
}
const resolve = (call, name) => call.resolve({ rows: [row(name)], metadataFailed: false, limited: false, supported: true, unit: '' })

test('preview generates data without requests and transitions to live fetching', async t => {
  const { state, calls, edit } = fixture(t, true)
  await tick()
  assert.equal(calls.length, 0)
  assert.equal(state.rows.value.length, 8)
  for (const metric of ['discard', 'backlog']) {
    state.metric.value = metric
    await tick()
    assert.equal(state.rows.value.length, 8)
    assert.equal(state.unsupported.value, false)
    assert.equal(calls.length, 0)
  }
  edit.value = false
  await tick()
  assert.equal(calls.length, 1)
  resolve(calls[0], 'live'); await tick()
  assert.equal(state.rows.value[0].name, 'live')
})

test('permission revocation clears data and prevents a pending response from restoring it', async t => {
  const { state, calls, capabilities } = fixture(t)
  assert.equal(calls.length, 1)
  capabilities.modules.value = { edge: true, vision: false }
  assert.equal(calls[0].current(), false)
  resolve(calls[0], 'stale'); await tick()
  assert.equal(state.available.value, false)
  assert.deepEqual(state.rows.value, [])
  assert.equal(calls.length, 1)
})

test('scope and metric changes invalidate older requests even if they complete last', async t => {
  const { state, calls, capabilities } = fixture(t)
  capabilities.scope.value = 'account-b'
  assert.equal(calls.length, 2)
  assert.equal(calls[0].current(), false)
  resolve(calls[1], 'new-scope'); await tick()
  resolve(calls[0], 'old-scope'); await tick()
  assert.equal(state.rows.value[0].name, 'new-scope')
  state.metric.value = 'backlog'
  assert.equal(calls.length, 3)
  resolve(calls[2], 'backlog'); await tick()
  assert.equal(state.rows.value[0].name, 'backlog')
})


test('missing unit renders no suffix and unsupported catalog remains distinct from an empty ranking', async t => {
  const { state, calls } = fixture(t)
  resolve(calls[0], 'sample'); await tick()
  assert.equal(state.rows.value[0].text, '10')
  void state.refresh()
  calls[1].resolve({ rows: [], metadataFailed: false, limited: false, supported: false, unit: '' })
  await tick()
  assert.equal(state.unsupported.value, true)
  assert.deepEqual(state.rows.value, [])
})

test('opening expands gateways and refresh preserves collapsed groups while expanding newly arriving gateways', async t => {
  const { state, calls } = fixture(t)
  const result = ids => ({ rows: ids.map(id => ({ ...row(id), gatewayId: id, gatewayName: id })), metadataFailed: false, limited: false, supported: true, unit: '' })
  calls[0].resolve(result(['g1', 'g2']))
  await tick()
  state.moreOpen.value = true
  await tick()
  assert.deepEqual(state.expanded.value, ['g1', 'g2'])
  state.expanded.value = ['g2']
  void state.refresh()
  calls[1].resolve(result(['g1', 'g2', 'g3']))
  await tick()
  assert.deepEqual(state.expanded.value, ['g2', 'g3'])
  void state.refresh()
  calls[2].resolve(result(['g1', 'g3']))
  await tick()
  assert.deepEqual(state.expanded.value, ['g3'])
})


test('a retry failure clears a previous unsupported state and exposes the error', async t => {
  const { state, calls } = fixture(t)
  calls[0].resolve({ rows: [], metadataFailed: false, limited: false, supported: false, unit: '' })
  await tick()
  assert.equal(state.unsupported.value, true)
  void state.refresh()
  assert.equal(state.unsupported.value, false)
  calls[1].reject(new Error('network error'))
  await tick()
  assert.equal(state.unsupported.value, false)
  assert.equal(state.error.value, true)
  assert.equal(state.loading.value, false)
})
