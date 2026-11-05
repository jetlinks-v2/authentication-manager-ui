import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'
const require = createRequire(import.meta.url), vue = require('vue'), { build } = require('esbuild')
const root = fileURLToPath(new URL('../', import.meta.url))
const bundled = await build({ entryPoints: [path.join(root, 'views/resources/Dashboard/useResourceSupplemental.ts')], bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', plugins: [{ name: 'boundaries', setup(api) {
  const stubs = {
    'ant-design-vue': 'export const theme={useToken:()=>({token:context.vue.ref({colorPrimary:"blue",colorSuccess:"green",colorError:"red",colorTextQuaternary:"grey"})})}',
    'vue-i18n': 'export const useI18n=()=>({t:(key,params)=>params ? `${key}:${Object.values(params).join(",")}` : key})',
    '@jetlinks-web-core/store/menu': 'export const useMenuStore=()=>context.menu',
    '../../../visDashboard/Base/shared/navigation': 'export const HOME_TARGETS={devices:{menus:["iot-user-device-list"]},video:{menus:["video/resources"]}}',
    './services/resourcePageAccess': 'export const hasGrantedResourceMenu=()=>false',
    './services/resourceSupplemental': 'export const loadResourceSupplemental=(...args)=>context.load(...args)',
  }
  api.onResolve({ filter: /.*/ }, args => stubs[args.path] ? { path: args.path, namespace: 'stub' } : undefined)
  api.onLoad({ filter: /.*/, namespace: 'stub' }, args => ({ contents: stubs[args.path], loader: 'js' }))
} }] })
const tick = async () => { await vue.nextTick(); await new Promise(setImmediate) }
const data = (rows, total) => ({ rows, total, pools: [], devices: [], series: [] })
function fixture(kind, response, granted = true) {
  const calls = [], menu = { getMenu: code => granted && code === 'data-collect' ? {} : undefined, jumpPage: (...args) => calls.push(args) }
  const context = { vue, menu, load: async () => response }
  const mod = { exports: {} }
  Function('module', 'exports', 'require', 'context', bundled.outputFiles[0].text)(mod, mod.exports, require, context)
  const scope = vue.effectScope()
  const state = scope.run(() => mod.exports.useResourceSupplemental(vue.ref(kind), vue.ref(true), vue.ref('scope')))
  return { state, calls, scope }
}

test('distribution bars scale by maximum while labels divide by total, including zero and small values', async () => {
  for (const kind of ['points', 'protocols']) {
    const rows = [{ id: 'a', name: 'A', value: 2000, tone: 'success' }, { id: 'b', name: 'B', value: 1 }, { id: 'c', name: 'C', value: 0 }]
    const f = fixture(kind, data(rows, 2001))
    await tick()
    assert.deepEqual(f.state.distributionRows.value.map(row => row.barPercent), [100, 2, 0])
    assert.deepEqual(f.state.distributionRows.value.map(row => row.percentText), ['100.0%', '0.0%', '0.0%'])
    assert.match(f.state.distributionRows.value[0].valueText, /2,000/)
    assert.equal(f.state.distributionRows.value[0].color, 'green')
    assert.equal(f.state.distributionRows.value[1].color, 'blue')
    f.scope.stop()
  }
})

test('zero totals produce finite zero percentages, and a balanced distribution uses the total denominator', async () => {
  for (const [rows, total, bars, percents] of [
    [[{ id: 'a', name: 'A', value: 0 }, { id: 'b', name: 'B', value: 0 }], 0, [0, 0], ['0.0%', '0.0%']],
    [[{ id: 'a', name: 'A', value: 3 }, { id: 'b', name: 'B', value: 2 }], 5, [100, 67], ['60.0%', '40.0%']],
  ]) {
    const f = fixture('protocols', data(rows, total)); await tick()
    assert.deepEqual(f.state.distributionRows.value.map(row => row.barPercent), bars)
    assert.deepEqual(f.state.distributionRows.value.map(row => row.percentText), percents)
    f.scope.stop()
  }
})

test('points and protocols navigate only with the actual data-collect menu', async () => {
  for (const kind of ['points', 'protocols']) for (const granted of [true, false]) {
    const f = fixture(kind, data([{ id: 'x', name: 'X', value: 1 }], 1), granted)
    await tick()
    assert.equal(f.state.canOpen.value, granted)
    f.state.open()
    assert.deepEqual(f.calls, granted ? [['data-collect', { query: undefined }]] : [])
    f.scope.stop()
  }
})
