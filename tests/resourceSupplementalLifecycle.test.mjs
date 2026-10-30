import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'

const require = createRequire(import.meta.url)
const { build } = require('esbuild')
const vue = require('vue')
const root = fileURLToPath(new URL('../', import.meta.url))
const bundled = await build({
  entryPoints: [path.join(root, 'views/resources/Dashboard/useResourceSupplemental.ts')],
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  plugins: [{ name: 'supplemental-boundary', setup(api) {
    const boundaries = {
      'ant-design-vue': 'export const theme={useToken:()=>({token:context.vue.ref({})})}',
      'vue-i18n': 'export const useI18n=()=>({t:key=>key})',
      '@jetlinks-web-core/store/menu': 'export const useMenuStore=()=>({getMenu:()=>({}),jumpPage:()=>{}})',
      './services/resourceSupplemental': 'export const loadResourceSupplemental=(...args)=>context.load(...args)',
    }
    api.onResolve({ filter: /^(ant-design-vue|vue-i18n|@jetlinks-web-core\/store\/menu|\.\/services\/resourceSupplemental)$/ }, args => ({ path: args.path, namespace: 'fixture' }))
    api.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: boundaries[args.path], loader: 'js' }))
  } }],
})
const tick = async () => { await vue.nextTick(); await new Promise(setImmediate) }
const empty = () => ({ series: [], pools: [], devices: [], rows: [], total: 0 })

test('disabled panel sends no request; scope changes and disposal discard late responses', async () => {
  const pending = []
  const context = { vue, load: (kind, range, signal) => new Promise(resolve => pending.push({ kind, range, signal, resolve })) }
  const module = { exports: {} }
  Function('module', 'exports', 'require', 'context', bundled.outputFiles[0].text)(module, module.exports, require, context)
  const enabled = vue.ref(false), scopeKey = vue.ref('first'), kind = vue.ref('online')
  const scope = vue.effectScope()
  const state = scope.run(() => module.exports.useResourceSupplemental(kind, enabled, scopeKey))
  await tick()
  assert.equal(pending.length, 0)
  enabled.value = true
  await tick()
  assert.equal(pending.length, 1)
  scopeKey.value = 'second'
  await tick()
  assert.equal(pending.length, 2)
  assert.equal(pending[0].signal.aborted, true)
  pending[0].resolve({ ...empty(), series: [{ time: 'old', value: 88 }] })
  await tick()
  assert.deepEqual(state.data.value.series, [])
  pending[1].resolve({ ...empty(), series: [{ time: 'new', value: 42 }] })
  await tick()
  assert.equal(state.data.value.series[0].value, 42)
  void state.refresh()
  await tick()
  assert.equal(pending.length, 3)
  scope.stop()
  assert.equal(pending[2].signal.aborted, true)
  pending[2].resolve({ ...empty(), series: [{ time: 'late', value: 99 }] })
  await tick()
  assert.equal(state.data.value.series[0].value, 42)
})
