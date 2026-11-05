import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'
const require = createRequire(import.meta.url), vue = require('vue'), { build } = require('esbuild')
const root = fileURLToPath(new URL('../', import.meta.url))
const compiled = await build({ entryPoints: [path.join(root, 'views/resources/Dashboard/useResourcePage.ts')], bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', define: {'import.meta.env.DEV':'false'}, plugins: [{ name: 'boundaries', setup(api) {
  const stubs = {
    'vue-router':'export const useRoute=()=>({query:{}})',
 'vue-i18n': 'export const useI18n=()=>({t:key=>key})',
    '@jetlinks-web-core/utils/consts': 'export const isSaaS=false',
    '@jetlinks-web-core/locales': 'export default {global:{t:key=>key}}',
    '@jetlinks-web-core/store/menu': 'export const useMenuStore=()=>context.menu',
    '@jetlinks-web-core/utils/module-registry': 'export const moduleRegistry={hasModule:()=>true}',
    '@jetlinks-web-core/components/DashBoardCanvas/dashboard-sources': 'export const dashboardSources=new Map()',
    '@jetlinks-web-core/components/DashBoardCanvas/discovery': 'export const useDashboardCatalog=()=>({catalog:context.vue.ref({components:{}}),loading:context.vue.ref(false),reload:()=>{}})',
    '../../../visDashboard/ResourceCenter/hooks/useResourceCapabilities': 'export const useResourceCapabilities=()=>context.capabilities;export const provideResourceCapabilities=()=>{}',
    '../../../visDashboard/ResourceCenter/hooks/videoSummaryContext': 'export const provideVideoSummary=()=>{}',
    './useResourceSummary': 'export const useResourceSummary=()=>({})',
    './services/resourceSummary': 'export const getResourceSummaryKinds=a=>[a.iot&&"iot",a.video&&"video",a.edge&&"edge",a.collection&&"collection"].filter(Boolean)',
    '../../../../api/overview': 'export const buildOverviewDeviceTerms=kind=>[{column:"kind",value:kind}]',
    '../../../../visDashboard/Base/shared/navigation': 'export const HOME_TARGETS={devices:{menus:["iot-user-device-list"]},video:{menus:["video/resources"]},gateway:{menus:["iot-user-device-list"]},screen:{menus:["visualization/project"]},collector:{menus:["data-collect"]},card:{menus:["iot-card/CardManagement"]}}',
    './components/ResourceDashboardWidget.vue': 'export default {}',
  }
  api.onResolve({ filter: /.*/ }, args => stubs[args.path] ? { path: args.path, namespace: 'stub' } : undefined)
  api.onLoad({ filter: /.*/, namespace: 'stub' }, args => ({ contents: stubs[args.path], loader: 'js' }))
} }] })
const context = { vue, calls: [], menu: null, capabilities: { scope: vue.ref('scope'), modules: vue.ref({}), loading: vue.ref(false), errors: vue.ref([]) } }
const mod = { exports: {} }
Function('module', 'exports', 'require', 'context', compiled.outputFiles[0].text)(mod, mod.exports, id => id === 'vue' ? { ...vue, provide: () => {} } : require(id), context)

test('private no-resource redirect requires the granted overview menu, not a registered hidden route', async () => {
  context.calls = []
  context.menu = vue.reactive({ initialized: true, loading: false, menuResultCache: [], getMenu: () => true, jumpPage: code => context.calls.push(code) })
  const scope = vue.effectScope()
  const state = scope.run(() => mod.exports.useResourcePage(vue.ref(1440)))
  assert.equal(state.hasContent.value, false)
  assert.deepEqual(context.calls, [])
  context.menu.menuResultCache = [{ code: 'root', children: [{ code: 'project/Overview' }] }]
  await vue.nextTick()
  assert.deepEqual(context.calls, ['project/Overview'])
  scope.stop()
})

test('a granted resource keeps its page even with overview authorization', () => {
  context.calls = []
  context.menu = vue.reactive({ initialized: true, loading: false, menuResultCache: [{ code: 'project/Overview' }, { code: 'data-collect' }], getMenu: () => true, jumpPage: code => context.calls.push(code) })
  const scope = vue.effectScope()
  const state = scope.run(() => mod.exports.useResourcePage(vue.ref(1440)))
  assert.equal(state.hasContent.value, true)
  assert.deepEqual(context.calls, [])
  scope.stop()
})
