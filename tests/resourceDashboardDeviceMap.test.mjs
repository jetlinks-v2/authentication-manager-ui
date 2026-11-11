import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { build } = require('esbuild')
const vue = require('vue')
const root = fileURLToPath(new URL('../../../', import.meta.url))
const dashboard = path.join(root, 'modules/authentication-manager-ui/views/resources/Dashboard')
const storage = () => {
  const values = new Map()
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
}
async function fixture(t) {
  const bundled = await build({
    stdin: { contents: `export * from ${JSON.stringify(path.join(dashboard, 'resourceLayoutStorage.ts'))};
      export { useDashboardState } from '@jetlinks-web-core/components/DashBoardCanvas/composables/useDashboardState'`, resolveDir: root, loader: 'ts' },
    bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
    plugins: [{ name: 'core-paths', setup(api) {
      api.onResolve({ filter: /^@jetlinks-web-core\// }, args => {
        const target = path.join(root, 'jetlinks-web-core/src', args.path.replace('@jetlinks-web-core/', ''))
        return { path: existsSync(`${target}.ts`) ? `${target}.ts` : path.join(target, 'index.ts') }
      })
    } }],
  })
  const module = { exports: {} }
  Function('module', 'exports', 'require', bundled.outputFiles[0].text)(module, module.exports, require)
  const saved = storage(), previousStorage = globalThis.localStorage
  globalThis.localStorage = saved
  t.after(() => { if (previousStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = previousStorage })
  return { api: module.exports, saved }
}

test('distribution migration preserves union or moves conflicting and scattered layouts below other cards', async t => {
  const { api } = await fixture(t)
  const widgets = [{ id: 'other', kind: 'message', gridItem: {} }, { id: 'resource-panel-distribution', kind: 'distribution', gridItem: { h: 18, minW: 12, minH: 18, maxH: 72 } }]
  const map = { i: 'resource-panel-map', x: 0, y: 10, w: 16, h: 18 }
  const offline = { i: 'resource-panel-offline', x: 16, y: 10, w: 8, h: 18 }
  const other = { i: 'other', x: 0, y: 0, w: 24, h: 8 }
  for (const [records, expected] of [
    [[other, map, offline], { x: 0, y: 10, w: 24, h: 18 }],
    [[{ ...other, y: 12 }, map, offline], { x: 0, y: 20, w: 24, h: 18 }],
    [[other, map, { ...offline, y: 40 }], { x: 0, y: 8, w: 24, h: 18 }],
  ]) {
    const saved = storage(), raw = JSON.stringify(records)
    saved.setItem('old', raw)
    api.migrateResourceDistributionLayout(saved, 'new', 'old', widgets)
    const result = JSON.parse(saved.getItem('new'))
    assert.deepEqual(result[0], records[0])
    assert.deepEqual(result[1], { i: 'resource-panel-distribution', ...expected })
    assert.equal(saved.getItem('old'), raw)
    saved.setItem('new', 'existing')
    api.migrateResourceDistributionLayout(saved, 'new', 'old', widgets)
    assert.equal(saved.getItem('new'), 'existing')
  }
  for (const invalid of ['bad json', JSON.stringify([other, map]), JSON.stringify([other, map, map])]) {
    const saved = storage(); saved.setItem('old', invalid)
    api.migrateResourceDistributionLayout(saved, 'new', 'old', widgets)
    assert.equal(saved.getItem('new'), null)
  }
})

test('canvas saves and restores one distribution widget after moving and resizing', async t => {
  const { api, saved } = await fixture(t)
  const scope = vue.effectScope(); t.after(() => scope.stop())
  const widget = { id: 'resource-panel-distribution', type: 'resourceSaasWidget', componentProps: { gridItem: { x: 0, y: 0, w: 24, h: 18, minW: 12, minH: 18, maxH: 72 }, resourcePage: { kind: 'distribution' } } }
  const value = { canvas: { gridLayout: { colNum: 24 } }, components: [widget] }
  const options = { value: () => value, catalog: () => ({ groups: [], components: {} }), editable: () => false, layoutEditable: () => true, storageKey: () => 'test-distribution', onChange: () => assert.fail('business config changed') }
  const state = scope.run(() => api.useDashboardState(options))
  state.updateLayout([{ i: widget.id, x: 2, y: 5, w: 18, h: 24 }])
  assert.deepEqual(JSON.parse(saved.getItem('test-distribution')), [{ i: widget.id, x: 2, y: 5, w: 18, h: 24 }])
  const restored = scope.run(() => api.useDashboardState(options)).value.value.components
  assert.equal(restored.length, 1)
  assert.equal(restored[0].id, widget.id)
  assert.deepEqual(['x','y','w','h'].map(k => restored[0].componentProps.gridItem[k]), [2, 5, 18, 24])
})

// Exercise the current page host with core's real discovery implementation.
test('resource page discovers only an authorized map and retries a failed entry', async t => {
  const entry = path.join(dashboard, 'useResourcePage.ts')
  const core = path.join(root, 'jetlinks-web-core/src')
  const bundled = await build({
    stdin: { contents: `export { useResourcePage } from ${JSON.stringify(entry)}; export { resourcePageContextKey } from ${JSON.stringify(path.join(dashboard, 'resourcePageContext.ts'))}`, resolveDir: dashboard, loader: 'ts' },
    bundle: true, write: false, platform: 'node', format: 'cjs',
    packages: 'external', external: ['vue'], define: { 'import.meta.env.DEV': 'false' },
    plugins: [{ name: 'resource-map-host', setup(b) {
      const stubs = {
        'vue-i18n': `export const useI18n=()=>({t:key=>key})`,
        'vue-router': `export const useRoute=()=>({query:{}})`,
        // Keep the real device-scope and overview term builders, while isolating their app runtime imports.
        '@jetlinks-web-core/locales': `export default {global:{t:key=>key}}`,
        '@jetlinks-web/core': `export const request=new Proxy({}, {get(){throw Error('unexpected request')}})`,
        '@jetlinks-web-core/utils/consts': `export const isSaaS=true`,
        '@jetlinks-web-core/utils/deployment': `export const isPrivateDeployment=()=>false`,
        '@jetlinks-web-core/store/menu': `export const useMenuStore=()=>context.menu`,
        '@jetlinks-web-core/utils/module-registry': `export const moduleRegistry={hasModule:()=>true}`,
        '@jetlinks-web-core/components/DashBoardCanvas/dashboard-sources': `export const dashboardSources=context.sources`,
        '../../../visDashboard/ResourceCenter/hooks/useResourceCapabilities': `export const useResourceCapabilities=()=>context.capabilities; export const provideResourceCapabilities=()=>{}`,
        '../../../visDashboard/ResourceCenter/hooks/videoSummaryContext': `export const provideVideoSummary=()=>{}`,
        './useResourceSummary': `export const useResourceSummary=()=>({})`,
        './services/resourceSummary': `export const getResourceSummaryKinds=()=>[]`,
      }
      b.onResolve({ filter: /.*/ }, args => {
        if (stubs[args.path]) return { path: args.path, namespace: 'host-stub' }
        if (args.path.endsWith('.vue')) return { path: args.path, namespace: 'host-view' }
        if (args.path.startsWith('@jetlinks-web-core/')) {
          const target = path.join(core, args.path.slice('@jetlinks-web-core/'.length))
          return { path: existsSync(`${target}.ts`) ? `${target}.ts` : path.join(target, 'index.ts') }
        }
      })
      b.onLoad({ filter: /.*/, namespace: 'host-stub' }, args => ({ contents: stubs[args.path], loader: 'js' }))
      b.onLoad({ filter: /.*/, namespace: 'host-view' }, () => ({ contents: 'export default {}', loader: 'js' }))
    } }],
  })
  const mapEntry = 'device-manager-ui/visDashboard/DeviceManagement/DeviceMapCard'
  const definition = { DeviceMapCard: { name: 'deviceMapCard', component: {} }, DeviceMapCardConfig: [],
    DeviceMapCardConfigProps: { type: 'deviceMapCard', componentProps: { deviceMapCard: { interval: 60 } } } }
  const tick = async () => { await vue.nextTick(); await new Promise(setImmediate); await vue.nextTick() }
  function mount({ available = true, authorized = true, failFirst = false } = {}) {
    let attempts = 0, pageContext
    const loader = async () => { attempts++; if (failFirst && attempts === 1) throw Error('map unavailable'); return definition }
    const source = { directory: 'visDashboard', name: 'Map', sort: 0, entries: available ? { [mapEntry]: loader } : {} }
    const context = {
      menu: vue.reactive({ initialized: true, loading: false, menuResultCache: authorized ? [{ code: 'iot-user-device-list' }] : [], getMenu: () => undefined }),
      capabilities: { modules: vue.ref({}), scope: vue.ref('user/project'), loading: vue.ref(false), errors: vue.ref([]) },
      sources: new Map([['device-manager-ui', { 'visDashboard/DeviceManagement': source }]]),
    }
    const mod = { exports: {} }
    Function('module', 'exports', 'require', 'context', bundled.outputFiles[0].text)(mod, mod.exports, require, context)
    const renderer = vue.createRenderer({
      createElement: type => ({ type, children: [] }), createText: text => ({ text }), createComment: text => ({ text }),
      setText: () => {}, setElementText: () => {}, patchProp: () => {}, remove: () => {},
      insert: (child, parent) => { parent.children.push(child) }, parentNode: () => null, nextSibling: () => null,
    })
    const Child = { setup() { pageContext = vue.inject(mod.exports.resourcePageContextKey); return () => null } }
    const app = renderer.createApp({ setup() { mod.exports.useResourcePage(vue.ref(1400)); return () => vue.h(Child) } })
    app.mount({ children: [] }); t.after(() => app.unmount())
    return { pageContext, context, attempts: () => attempts }
  }
  const live = mount(); await tick()
  assert.equal(live.attempts(), 1)
  assert.equal(live.pageContext.mapLoading.value, false)
  assert.equal(live.pageContext.mapWidget.value.type, 'deviceMapCard')
  assert.equal(live.pageContext.mapWidget.value.componentProps.deviceMapCard.interval, 60)
  assert.equal(live.pageContext.mapWidget.value.componentProps.deviceMapCard.scope, 'user/project')
  assert.deepEqual(live.pageContext.mapWidget.value.componentProps.deviceMapCard.deviceTerms, live.pageContext.deviceScope.value.terms)
  assert.equal(live.pageContext.deviceScope.value.terms[0].terms[0].terms[0].column, 'productId$product-info')
  const absent = mount({ available: false }); await tick()
  assert.equal(absent.attempts(), 0); assert.equal(absent.pageContext.mapWidget.value, undefined)
  const denied = mount({ authorized: false }); await tick()
  assert.equal(denied.attempts(), 0); assert.equal(denied.pageContext.mapWidget.value, undefined)
  const retry = mount({ failFirst: true }); await tick()
  assert.equal(retry.attempts(), 1); assert.equal(retry.pageContext.mapLoading.value, false)
  assert.equal(retry.pageContext.mapWidget.value, undefined)
  retry.pageContext.reloadMap(); await tick()
  assert.equal(retry.attempts(), 2); assert.equal(retry.pageContext.mapWidget.value.type, 'deviceMapCard')
})
