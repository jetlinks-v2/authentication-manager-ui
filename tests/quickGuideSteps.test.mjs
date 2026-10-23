import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
import { ref } from 'vue'

const translations = JSON.parse(readFileSync(new URL('../locales/lang/zh.json', import.meta.url), 'utf8'))
const built = await build({
  entryPoints: [fileURLToPath(new URL('../visDashboard/Base/QuickGuide/useQuickGuideSteps.ts', import.meta.url))],
  bundle: true, write: false, format: 'cjs', platform: 'node', external: ['vue'],
  plugins: [{
    name: 'quick-guide-runtime-fixture',
    setup(plugin) {
      const modules = {
        'vue-i18n': 'export const useI18n = () => ({ t: key => globalThis.quickGuideFixture.translations[key] ?? key })',
        '@jetlinks-web-core/store/menu': 'export const useMenuStore = () => globalThis.quickGuideFixture.menu',
        '@jetlinks-web-core/utils/deployment': 'export const isPrivateDeployment = () => globalThis.quickGuideFixture.privateDeployment',
        '../shared/useHomeRuntime': 'export const useHomeRuntime = (...args) => globalThis.quickGuideFixture.runtime(...args)',
      }
      plugin.onResolve({ filter: /^(vue-i18n|@jetlinks-web-core\/store\/menu|@jetlinks-web-core\/utils\/deployment|\.\.\/shared\/useHomeRuntime)$/ },
        args => ({ path: args.path, namespace: 'fixture' }))
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: modules[args.path] }))
    },
  }],
})
function fixture(t, allowed = true, privateDeployment = false) {
  const jumps = [], subscriptions = []
  globalThis.quickGuideFixture = {
    translations, privateDeployment,
    menu: {
      getMenu: code => allowed && ({ code }),
      jumpPage: (...args) => jumps.push(args),
    },
    runtime: (feature, _edit, _interval, _refreshKey, polling) => {
      subscriptions.push({ feature, polling })
      return { rows: ref([]), loading: ref(false), error: ref(false) }
    },
  }
  t.after(() => { delete globalThis.quickGuideFixture })
  const loaded = { exports: {} }
  new Function('require', 'module', 'exports', built.outputFiles[0].text)(createRequire(import.meta.url), loaded, loaded.exports)
  return { jumps, subscriptions, useQuickGuideSteps: loaded.exports.useQuickGuideSteps }
}

test('the six prototype steps use their business actions and the confirmed menu destinations', t => {
  const { jumps, subscriptions, useQuickGuideSteps } = fixture(t)
  const polling = {}
  const guide = useQuickGuideSteps(() => false, polling)
  assert.deepEqual(guide.steps.value.map(step => step.title), ['配置空间', '接入网关', '接入设备', '配置算法', '配置告警', '创建应用'])
  assert.deepEqual(guide.steps.value.map(step => step.actionText), ['去配置', '去接入', '去接入', '去配置', '去配置', '去创建'])
  const alarm = guide.steps.value.find(step => step.key === 'alarm')
  const application = guide.steps.value.find(step => step.key === 'application')
  guide.handleAction(alarm)
  guide.handleAction({ ...application, status: 'complete' })
  assert.deepEqual(jumps, [
    ['machine-vision/VisualAlarm', { params: undefined, query: undefined }],
    ['application-center/ProjectApplication', { params: undefined, query: undefined }],
  ])
  assert.deepEqual(subscriptions.map(item => item.feature), ['DeviceAccess', 'AiCenter', 'QuickGuide', 'Applications'])
  assert.ok(subscriptions.every(item => item.polling === polling))
})

test('steps without menu permissions and editor previews cannot navigate', t => {
  const { jumps, useQuickGuideSteps } = fixture(t, false)
  const guide = useQuickGuideSteps(() => false)
  assert.ok(guide.steps.value.every(step => step.disabled))
  guide.steps.value.forEach(guide.handleAction)
  const preview = useQuickGuideSteps(() => true)
  preview.steps.value.forEach(preview.handleAction)
  assert.deepEqual(jumps, [])
})

test('private deployment never exposes the guide or creates subscriptions, including editor previews', t => {
  const { jumps, subscriptions, useQuickGuideSteps } = fixture(t, true, true)
  for (const isEdit of [false, true]) {
    const guide = useQuickGuideSteps(() => isEdit)
    assert.equal(guide.available, false)
    assert.equal(guide.showGuide.value, false)
    assert.deepEqual(guide.steps.value, [])
    guide.handleAction({ key: 'alarm', target: { menus: ['machine-vision/VisualAlarm'] } })
  }
  assert.deepEqual(subscriptions, [])
  assert.deepEqual(jumps, [])
})

const dashboardBuilt = await build({
  entryPoints: [fileURLToPath(new URL('../views/project/Overview/useOverviewDashboard.ts', import.meta.url))],
  bundle: true, write: false, format: 'cjs', platform: 'node', external: ['vue'],
  plugins: [{
    name: 'overview-deployment-boundaries',
    setup(plugin) {
      const boundaries = {
        '@jetlinks-web-core/utils/consts': 'export const isSaaS = context.saas',
        '@jetlinks-web-core/utils/deployment': 'export const isPrivateDeployment = () => context.privateDeployment',
        '@jetlinks-web-core/components/DashBoardCanvas/dashboard-sources': 'export const dashboardSources = []',
        '@jetlinks-web-core/components/DashBoardCanvas/discovery': 'export const useDashboardCatalog = () => context.catalogState',
        '@jetlinks-web-core/components/DashBoardCanvas/utils/layoutStorage': 'export const readDashboardLayout = () => undefined',
        '../../../visDashboard/useDashboardModules': 'import { computed } from "vue"; export const useDashboardModules = () => computed(() => ({ model: true, edge: true }))',
      }
      plugin.onResolve({ filter: /.*/ }, args => {
        if (boundaries[args.path]) return { path: args.path, namespace: 'overview-boundary' }
        if (args.path.startsWith('../../../visDashboard/Base/') && args.path.endsWith('/index')) {
          return { path: args.path, namespace: 'overview-component' }
        }
      })
      plugin.onLoad({ filter: /.*/, namespace: 'overview-boundary' }, args => ({ contents: boundaries[args.path] }))
      plugin.onLoad({ filter: /.*/, namespace: 'overview-component' }, args => {
        const feature = args.path.split('/').at(-2)
        const name = 'ProjectHome' + feature
        return { contents: `export const ${name} = { component: {} }; export const ${name}Config = []; export const ${name}ConfigProps = { componentProps: { gridItem: {} } };` }
      })
    },
  }],
})

function overviewFixture(privateDeployment) {
  // Discovery deliberately includes the guide, as an old catalog/cache may still do.
  const components = Object.fromEntries([
    'QuickGuide', 'DeviceAccess', 'QuickActions', 'Applications', 'Collection', 'Visualization',
    'Operations', 'AiCenter', 'RuleEngine', 'Quotas', 'Announcements',
  ].map(feature => ['projectHome' + feature, {
    component: {}, defaultConfig: { componentProps: { gridItem: {} } }, defaultGridItem: {},
  }]))
  const context = {
    privateDeployment, saas: !privateDeployment,
    catalogState: { catalog: ref({ components }), loading: ref(false), errors: ref([]), reload: () => {} },
  }
  const builtModule = { exports: {} }
  new Function('require', 'module', 'exports', 'context', 'localStorage', dashboardBuilt.outputFiles[0].text)(
    createRequire(import.meta.url), builtModule, builtModule.exports, context, { getItem: () => null, setItem: () => {} },
  )
  return { context, useOverviewDashboard: builtModule.exports.useOverviewDashboard }
}

test('private overview excludes the guide from both the catalog and instances even when completion asks to show it', () => {
  const { context, useOverviewDashboard } = overviewFixture(true)
  const overview = useOverviewDashboard(ref(true))
  assert.ok(context.catalogState.catalog.value.components.projectHomeQuickGuide)
  assert.equal(overview.catalog.value.components.projectHomeQuickGuide, undefined)
  assert.equal(overview.dashboard.value.components.some(component => component.type === 'projectHomeQuickGuide'), false)
  assert.ok(overview.dashboard.value.components.some(component => component.type === 'projectHomeApplications'))
})

test('SaaS overview keeps the six-step guide and still hides it after completion', () => {
  const { useOverviewDashboard } = overviewFixture(false)
  const show = ref(true)
  const overview = useOverviewDashboard(show)
  assert.ok(overview.catalog.value.components.projectHomeQuickGuide)
  assert.equal(overview.dashboard.value.components.find(component => component.type === 'projectHomeQuickGuide').visible, true)
  show.value = false
  assert.equal(overview.dashboard.value.components.find(component => component.type === 'projectHomeQuickGuide').visible, false)
})
