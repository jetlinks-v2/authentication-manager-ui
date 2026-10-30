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
      '@jetlinks-web-core/utils/module-registry': 'export const moduleRegistry={getResourceItem:()=>context.detailComponent}',
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
  const jumps = [], grants = vue.reactive(new Set(['iot-user-device-list/GatewayDetail', 'algorithm-center']))
  const context = { capabilities, detailComponent: {}, visibility: vue.ref('visible'), menu: { getMenu: code => grants.has(code), jumpPage: (...args) => jumps.push(args) },
    load: (metric, current) => new Promise((resolve, reject) => calls.push({ metric, current, resolve, reject })) }
  const module = { exports: {} }
  Function('module', 'exports', 'require', 'context', compiled.outputFiles[0].text)(module, module.exports, require, context)
  const scope = vue.effectScope(), edit = vue.ref(preview)
  const state = scope.run(() => module.exports.useVisionTaskRanking(vue.ref(undefined), edit))
  t.after(() => scope.stop())
  return { state, calls, capabilities, edit, jumps, grants, context }
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


test('latency uses ms with missing unit and unsupported catalog remains distinct from an empty ranking', async t => {
  const { state, calls } = fixture(t)
  resolve(calls[0], 'sample'); await tick()
  assert.equal(state.rows.value[0].text, '10 ms')
  void state.refresh()
  calls[1].resolve({ rows: [], metadataFailed: false, limited: false, supported: false, unit: '' })
  await tick()
  assert.equal(state.unsupported.value, true)
  assert.deepEqual(state.rows.value, [])
})

test('only confirmed online tasks with identity open detail; preview, missing component and permissions prevent it', async t => {
  const { state, calls, jumps, capabilities, edit, context } = fixture(t)
  resolve(calls[0], 'live'); await tick()
  const live = row('live')
  state.openTask(live)
  assert.equal(state.selected.value, live)
  for (const item of [{ ...live, online: false }, { ...live, detailAvailable: false }, { ...live, gatewayId: '' }, { ...live, taskId: '' }]) {
    state.selected.value = undefined; state.openTask(item); assert.equal(state.selected.value, undefined)
  }
  assert.deepEqual(jumps, [])
  capabilities.modules.value = { edge: true, vision: false }
  state.openTask(live); assert.equal(state.selected.value, undefined)
  capabilities.modules.value = { edge: true, vision: true }
  edit.value = true; state.openTask(live); assert.equal(state.selected.value, undefined)
  edit.value = false
  // Registry lookup is evaluated again after availability changes.
  capabilities.modules.value = { edge: true, vision: false }; context.detailComponent = undefined
  capabilities.modules.value = { edge: true, vision: true }
  state.openTask(live); assert.equal(state.selected.value, undefined)
})

test('scope, metric, visibility, preview and capability changes clear selected detail and stale responses', async t => {
  const { state, calls, capabilities, edit, context } = fixture(t)
  resolve(calls[0], 'first'); await tick()
  for (const change of [
    () => { capabilities.scope.value = 'account-b' },
    () => { state.metric.value = 'backlog' },
    () => { context.visibility.value = 'hidden' },
    () => { edit.value = true },
    () => { capabilities.modules.value = { edge: true, vision: false } },
  ]) {
    state.selected.value = row('selected')
    const pending = calls.at(-1)
    change()
    assert.equal(state.selected.value, undefined)
    if (pending) { resolve(pending, 'stale'); await tick(); assert.notEqual(state.rows.value[0]?.name, 'stale') }
  }
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

test('no-task state requires a complete zero directory and clears on missing metrics or incomplete scope', async t => {
  const {state,calls} = fixture(t)
  const base={metadataFailed:false,limited:false,supported:true,unit:'ms'}
  calls[0].resolve({...base,rows:[],taskCount:0,directoryIncomplete:false}); await tick()
  assert.equal(state.noTasks.value,true)
  void state.refresh()
  calls[1].resolve({...base,rows:[{...row('pending'),value:undefined}],taskCount:1,directoryIncomplete:false}); await tick()
  assert.equal(state.noTasks.value,false); assert.equal(state.rows.value[0].value,undefined)
  void state.refresh()
  calls[2].resolve({...base,rows:[],taskCount:undefined,directoryIncomplete:true}); await tick()
  assert.equal(state.noTasks.value,false); assert.equal(state.directoryIncomplete.value,true)
})


test('identity shows scene and algorithm only and latency uses ms independently of backend unit', async t => {
  const {state,calls} = fixture(t)
  const rows = [
    {...row('first'),sceneName:'消防通道',algorithmName:'杂物检测',sourceName:'来源',name:'任务'},
    {...row('second'),algorithmName:'车辆检测',name:'任务二',sourceName:'模型'},
    {...row('third'),name:'任务三',sourceName:'模型三'},
  ]
  calls[0].resolve({rows,metadataFailed:false,limited:false,supported:true,unit:'ms'}); await tick()
  assert.deepEqual(state.rows.value.map(r=>[r.caption,r.label,r.text]),[['gateway','消防通道 · 杂物检测','10 ms'],['gateway','车辆检测','10 ms'],['gateway','—','10 ms']])
  state.metric.value='backlog'
  calls.at(-1).resolve({rows,metadataFailed:false,limited:false,supported:true,unit:'条'}); await tick()
  assert.equal(state.rows.value[0].text,'10 条')
})
