import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { build } = require('esbuild')
const vue = require('vue')
const { renderToString } = require('vue/server-renderer')
const packageRoot = fileURLToPath(new URL('../', import.meta.url))
const coreRoot = path.resolve(packageRoot, '../../jetlinks-web-core/src')
const group = path.join(packageRoot, 'visDashboard/ResourceCenter')
const dashboard = path.join(packageRoot, 'views/resources/Dashboard')
const kinds = ['EdgeNodes', 'IotDevices', 'VideoDevices', 'Visualization', 'QuickStart', 'AlgorithmCoverage', 'VideoPlaybackTrend', 'MessageTrend', 'Collection', 'NetworkCards', 'DeviceDistribution', 'VisionTaskRanking']
const bundles = new Map()

async function bundle(saas) {
  if (bundles.has(saas)) return bundles.get(saas)
  const overviewKinds = ['QuickGuide','DeviceAccess','Collection','RuleEngine','AiCenter','QuickActions','Applications','Visualization','Operations','Announcements','Quotas']
  const overviewImports = overviewKinds.map(kind => `import { config as Overview${kind} } from ${JSON.stringify(path.join(group, '../Base', kind, 'config.ts'))}`).join('\n')
  const configImports = kinds.map(kind => `import { config as ${kind} } from ${JSON.stringify(path.join(group, kind, 'config.ts'))}`).join('\n')
  const result = await build({
    stdin: { contents: `
      export * from ${JSON.stringify(path.join(group, '../useDashboardModules.ts'))}
      export { useHomeRuntime } from ${JSON.stringify(path.join(group, '../Base/shared/useHomeRuntime.ts'))}
      export { createHomePolling } from ${JSON.stringify(path.join(group, '../Base/shared/homePolling.ts'))}
      export { visualizationGroups, resourceRowAvailable, homeFeatureAvailable, homeTitleKey } from ${JSON.stringify(path.join(group, '../Base/shared/resources.ts'))}
      export * from ${JSON.stringify(path.join(group, '../Base/shared/apiResources.ts'))}
      export * from ${JSON.stringify(path.join(group, '../Base/shared/apiAlgorithms.ts'))}
      export * from ${JSON.stringify(path.join(group, 'services/quickStart.ts'))}
      export * from ${JSON.stringify(path.join(group, 'services/capabilities.ts'))}
      export * from ${JSON.stringify(path.join(group, 'hooks/useResourceCapabilities.ts'))}
      export * from ${JSON.stringify(path.join(group, 'hooks/useQuickStart.ts'))}
      export * from ${JSON.stringify(path.join(group, 'hooks/useGatewayStatus.ts'))}
      export * from ${JSON.stringify(path.join(group, 'hooks/useResourceWidget.ts'))}
      export * from ${JSON.stringify(path.join(dashboard, '../../project/Overview/overviewDashboardLayout.ts'))}
      export * from ${JSON.stringify(path.join(dashboard, 'resourceDashboardLayout.ts'))}
      export * from ${JSON.stringify(path.join(dashboard, 'resourceLayoutStorage.ts'))}
      export { normalizeGridItem } from '@jetlinks-web-core/components/DashBoardCanvas/utils/layout'
      ${configImports}
      ${overviewImports}
      export const overviewConfigs = { ${overviewKinds.map(kind => `${kind}: Overview${kind}`).join(', ')} }
      export const configs = { ${kinds.join(', ')} }
    `, resolveDir: packageRoot, loader: 'ts' },
    bundle: true, write: false, platform: 'node', format: 'cjs', target: 'node22', packages: 'external',
    tsconfigRaw: { compilerOptions: {} },
    define: { 'import.meta.env.VITE_APP_ENVIRONMENT': JSON.stringify(saas ? 'saas' : '') },
    plugins: [{ name: 'resource-dashboard-test-boundaries', setup(buildApi) {
      const boundaries = {
        '@jetlinks-web/core': 'export const request = context.request',
        '@jetlinks-web-core/utils/module-registry': 'export const moduleRegistry = context.moduleRegistry',
        '@jetlinks-web-core/store/menu': 'export const useMenuStore = () => context.menu',
        '@jetlinks-web-core/store/user': 'export const useUserStore = () => context.user',
        '@jetlinks-web-core/router/globModules': 'export const getGlobModules = async () => context.routes',
        '@jetlinks-web-core/utils/consts': 'export const isSaaS = context.saas',
        '@jetlinks-web-core/utils/project-runtime': 'export const getProjectCodeFromLocation = () => context.runtime.project; export const getApplicationRuntimeEntry = () => ({})',
        '@jetlinks-web-core/utils/request-context': 'export const getBaseApi = () => context.runtime.api',
        '@jetlinks-web-core/locales': 'export default { global: { t: key => key } }',
      }
      buildApi.onResolve({ filter: /^\.\.\/\.\.\/\.\.\/api\/overview$/ }, args => args.importer.endsWith('/Base/shared/apiResources.ts') ? ({ path: 'overview', namespace: 'overview-test' }) : undefined)
      buildApi.onLoad({ filter: /.*/, namespace: 'overview-test' }, () => ({ contents: `export const queryOverviewGatewaySummary=()=>context.summary('gateway');export const queryOverviewIotDeviceSummary=()=>context.summary('devices');export const queryOverviewChannelSummary=()=>context.summary('video')`, loader: 'js' }))
      buildApi.onResolve({ filter: /^\.\/api$/ }, args => /Base\/shared\/(useHomeRuntime|homePollingContext)\.ts$/.test(args.importer)
        ? { path: 'home-loader', namespace: 'home-runtime-test' } : undefined)
      buildApi.onLoad({ filter: /.*/, namespace: 'home-runtime-test' }, () => ({ contents: 'export const loadHomeRows=feature=>context.homeLoad(feature)', loader: 'js' }))
      buildApi.onResolve({ filter: /\.\.\/services\/gatewayStatus$/ }, () => ({ path: 'gateway-service', namespace: 'gateway-hook-test' }))
      buildApi.onResolve({ filter: /^(vue-router|vue-i18n|@vueuse\/core)$/ }, args => ({ path: args.path, namespace: 'gateway-hook-test' }))
      buildApi.onLoad({ filter: /.*/, namespace: 'gateway-hook-test' }, args => ({ contents: args.path === 'gateway-service'
        ? `export const gatewayMetrics=['queue','cpu','memory','disk'];export const loadGatewayDirectory=async()=>context.gatewayDirectory;export const loadGatewayNodeStatuses=async(directory,metrics)=>context.gatewayLoad(metrics[0]);export const loadGatewayStatuses=(metric)=>context.gatewayLoad(metric);export const loadGatewayHistory=async()=>[]`
        : args.path === 'vue-router' ? 'export const useRoute=()=>({params:{},query:{}})'
          : args.path === 'vue-i18n' ? 'export const useI18n=()=>({t:key=>key})'
            : `export const useDocumentVisibility=()=>context.vue.ref('visible')`, loader: 'js' }))
      buildApi.onResolve({ filter: /^@jetlinks-web(\/core$|-core\/)/ }, args => {
        if (boundaries[args.path]) return { path: args.path, namespace: 'resource-dashboard-test' }
        const relative = args.path.replace('@jetlinks-web-core/', '')
        return { path: path.join(coreRoot, `${relative}.ts`) }
      })
      buildApi.onLoad({ filter: /.*/, namespace: 'resource-dashboard-test' }, args => ({ contents: boundaries[args.path], loader: 'js' }))
    } }],
  })
  bundles.set(saas, result.outputFiles[0].text)
  return result.outputFiles[0].text
}

async function fixture(saas = false) {
  const calls = []
  const menu = vue.reactive({
    initialized: true, loading: false,
    menuResultCache: [{ code: 'root', children: ['iot-user-device-list', 'visualization/resource/model', 'algorithm-center', 'data-collect', 'iot-card/CardManagement'].map(code => ({ code })) }],
    menusMap: new Map([['data-collect', {}], ['iot-card/CardManagement', {}], ['iot-user-device-list', {}]]),
    getMenu(code) { return this.menusMap.get(code) },
    jumpPage(...args) { calls.push({ navigation: args }) },
  })
  const context = {
    saas, menu, calls, vue,
    modules: new Set(['edge-master-ui', 'visualization-model-ui']),
    listeners: new Set(),
    user: vue.reactive({ userInfo: { id: 'user-a' } }),
    runtime: vue.reactive({ project: 'project-a', api: '/api' }),
    routes: { 'data-collect': () => {}, 'iot-card/CardManagement': () => {} },
    responses: { collection: true, networkCards: true },
  }
  context.summary = async id => { calls.push({ summary: id }); return { total: 0, online: 0 } }
  context.homeLoad = async feature => { calls.push({ home: feature }); return [] }
  context.gatewayDirectory = Array.from({ length: 4 }, (_, i) => ({ id: String(i), online: true }))
  context.gatewayLoad = async metric => { calls.push({ gateway: metric }); return { gateways: [], unit: '条' } }
  context.moduleRegistry = {
    hasModule: id => context.modules.has(id),
    onChange: listener => { context.listeners.add(listener); return () => context.listeners.delete(listener) },
  }
  context.setModules = (...ids) => { context.modules.clear(); ids.forEach(id => context.modules.add(id)); context.listeners.forEach(listener => listener()) }
  context.request = { post: async (endpoint, body) => { calls.push({ endpoint, body }); return { success: true, result: { total: 0, data: [] } } }, get: async endpoint => {
    calls.push({ endpoint })
    return { success: true, result: endpoint.includes('collectorService') ? context.responses.collection : context.responses.networkCards }
  } }
  const module = { exports: {} }
  Function('module', 'exports', 'require', 'context', await bundle(saas))(module, module.exports, require, context)
  return Object.assign(context, { api: module.exports })
}

const tick = async () => { await vue.nextTick(); await new Promise(setImmediate) }
const error = status => Object.assign(new Error(`HTTP ${status}`), { response: { status } })
const storage = () => {
  const values = new Map()
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
}
const visibleKinds = (collection, networkCards) => kinds.filter(kind => kind === 'Collection' ? collection : kind === 'NetworkCards' ? networkCards : true)
const profile = (overrides = {}) => {
  const capabilities = overrides.capabilities ?? { collection: true, networkCards: true }
  return { scope: 'user-a/project-a', saas: false, mode: 'wide', capabilities, widgets: visibleKinds(capabilities.collection, capabilities.networkCards), ...overrides }
}

function assertFilledLayout(api, layout, description, columns = 24) {
  const boxes = layout.map(([kind, x, y, w, h]) => ({
    ...api.normalizeGridItem({ ...api.configs[kind].componentProps.gridItem, x, y, w, h }, columns), kind,
  }))
  for (const item of boxes) assert.ok(item.x >= 0 && item.x + item.w <= columns)
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j]
    assert.ok(!(a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y), `${description}:${a.kind}/${b.kind}`)
  }
  for (const y of new Set(boxes.map(item => item.y))) {
    const widths = boxes.filter(item => item.y === y).map(item => item.w)
    assert.ok(Math.max(...widths) - Math.min(...widths) <= 1, `${description}:equal widths at ${y}`)
  }
  const bottom = Math.max(0, ...boxes.map(item => item.y + item.h))
  for (let y = 0; y < bottom; y++) assert.equal(boxes.filter(item => item.y <= y && item.y + item.h > y).reduce((sum, item) => sum + item.w, 0), columns, `${description}:row ${y}`)
}

test('all capability combinations produce normalized non-overlapping full-width rows', async () => {
  const { api } = await fixture()
  for (const width of [360, 640, 900, 1600]) for (const collection of [false, true]) for (const networkCards of [false, true]) {
    const layout = api.buildPrivateResourceLayout(visibleKinds(collection, networkCards), width)
    assert.equal(layout.some(item => item[0] === 'Collection'), collection)
    assert.equal(layout.some(item => item[0] === 'NetworkCards'), networkCards)
    assertFilledLayout(api, layout, `${width}:${collection}/${networkCards}`)
  }
})

test('any widget subset fills equal-width rows after real grid constraints, including empty rows and singletons', async () => {
  const { api } = await fixture()
  for (const width of [360, 640, 900, 1600]) for (let mask = 0; mask < 2 ** kinds.length; mask++) {
    const visible = kinds.filter((_, index) => mask & (1 << index))
    const layout = api.buildPrivateResourceLayout(visible, width)
    assert.deepEqual(layout.map(item => item[0]).sort(), [...visible].sort())
    assertFilledLayout(api, layout, `${width}:subset ${mask}`)
  }
})

test('remaining siblings have equal widths, single widgets fill the row, and empty rows move up', async () => {
  const { api } = await fixture()
  const layout = visible => Object.fromEntries(api.buildPrivateResourceLayout(visible, 1600).map(([kind, ...grid]) => [kind, grid]))
  const metrics = layout(['EdgeNodes', 'VideoDevices', 'Visualization'])
  assert.deepEqual(Object.values(metrics), [[0, 0, 8, 4], [8, 0, 8, 4], [16, 0, 8, 4]])
  const body = layout(['QuickStart', 'Collection', 'MessageTrend'])
  assert.deepEqual(body.QuickStart.slice(0, 3), [0, 0, 12])
  assert.deepEqual(body.MessageTrend.slice(0, 3), [12, 0, 12])
  assert.deepEqual(body.Collection.slice(0, 3), [0, body.QuickStart[3], 24])
  assert.deepEqual(layout(['NetworkCards']).NetworkCards, [0, 0, 24, 14])
  assert.deepEqual(api.buildPrivateResourceLayout([], 1600), [])
})

test('the wide profile follows the canvas row order and keeps quick-start height for reduced capabilities', async () => {
  const { api } = await fixture()
  const full = Object.fromEntries(api.buildPrivateResourceLayout(kinds, 1600).map(([kind, ...grid]) => [kind, grid]))
  assert.deepEqual(full.QuickStart, [0, 4, 12, 9])
  assert.deepEqual(full.MessageTrend, [12, 4, 12, 9])
  assert.deepEqual(full.VideoPlaybackTrend, [0, 13, 12, 9])
  assert.deepEqual(full.VisionTaskRanking, [12, 13, 12, 9])
  assert.deepEqual(full.AlgorithmCoverage, [0, 22, 12, 9])
  assert.deepEqual(full.DeviceDistribution, [12, 22, 12, 9])
  assert.deepEqual(full.Collection, [0, 31, 12, 14])
  assert.deepEqual(full.NetworkCards, [12, 31, 12, 14])
  const reduced = Object.fromEntries(api.buildPrivateResourceLayout(visibleKinds(false, false), 1600).map(([kind, ...grid]) => [kind, grid]))
  assert.deepEqual(reduced.QuickStart, [0, 4, 12, 9])
  assert.deepEqual(reduced.MessageTrend, [12, 4, 12, 9])
})

test('SaaS fixed layout follows the same requested row order', async () => {
  const { api } = await fixture(true)
  assert.deepEqual(api.saasResourceLayout, [
    ['EdgeNodes', 0, 0, 3, 4], ['IotDevices', 3, 0, 3, 4], ['VideoDevices', 6, 0, 3, 4], ['Visualization', 9, 0, 3, 4],
    ['QuickStart', 0, 4, 6, 9], ['MessageTrend', 6, 4, 6, 9], ['VideoPlaybackTrend', 0, 13, 6, 9],
    ['VisionTaskRanking', 6, 13, 6, 9], ['AlgorithmCoverage', 0, 22, 6, 9], ['DeviceDistribution', 6, 22, 6, 9],
  ])
})

test('SaaS widget subsets are non-overlapping after actual 12-column normalization at every width', async () => {
  const { api } = await fixture(true)
  for (const width of [360, 640, 900, 1600]) for (let mask = 0; mask < 2 ** kinds.length; mask++) {
    const visible = kinds.filter((_, index) => mask & (1 << index))
    const layout = api.buildSaasResourceLayout(visible, width)
    assert.deepEqual(layout.map(item => item[0]).sort(), [...visible].sort())
    assertFilledLayout(api, layout, `SaaS ${width}:subset ${mask}`, 12)
  }
})

test('SaaS layouts retain full geometry and close gaps for every optional-widget subset', async () => {
  const { api } = await fixture(true)
  const full = api.saasResourceLayout.map(item => item[0])
  const sorted = layout => [...layout].sort((a, b) => a[0].localeCompare(b[0]))
  assert.deepEqual(sorted(api.buildSaasResourceLayout(full)), sorted(api.saasResourceLayout))
  const optional = ['EdgeNodes', 'AlgorithmCoverage', 'VideoPlaybackTrend']
  for (let mask = 0; mask < 8; mask++) {
    const visible = full.filter(kind => !optional.includes(kind) || (mask & (1 << optional.indexOf(kind))))
    const layout = api.buildSaasResourceLayout(visible)
    assert.deepEqual([...layout.map(item => item[0])].sort(), [...visible].sort())
    const bottom = Math.max(...layout.map(([, , y, , h]) => y + h))
    for (let y = 0; y < bottom; y++) {
      const row = layout.filter(([, , top, , h]) => top <= y && y < top + h).sort((a, b) => a[1] - b[1])
      let x = 0
      for (const [, left, , width] of row) { assert.equal(left, x, `mask ${mask} row ${y}`); x += width }
      assert.equal(x, 12, `mask ${mask} row ${y}`)
    }
  }
})

const moduleIds = { edge: 'edge-master-ui', model: 'visualization-model-ui', vision: 'jetlinks-ai-ui', collection: 'data-collector-ui', networkCards: 'network-card-manager-ui' }
const menuCodes = { edge: 'iot-user-device-list', model: 'visualization/resource/model', vision: 'algorithm-center', collection: 'data-collect', networkCards: 'iot-card/CardManagement' }
const flags = enabled => Object.fromEntries(Object.keys(moduleIds).map(key => [key, enabled.includes(key)]))

test('private capabilities follow registration individually without backend probes', async () => {
  const context = await fixture()
  const scope = vue.effectScope()
  const state = scope.run(() => context.api.useResourceCapabilities(vue.ref(false)))
  for (const selected of [[], Object.keys(moduleIds), ...Object.keys(moduleIds).map(key => [key])]) {
    context.setModules(...selected.map(key => moduleIds[key]))
    await tick()
    assert.deepEqual(state.modules.value, flags(selected))
    assert.deepEqual(state.capabilities.value, { collection: selected.includes('collection'), networkCards: selected.includes('networkCards') })
  }
  assert.equal(context.calls.length, 0)
  scope.stop()
  assert.equal(context.listeners.size, 0)
})

test('private registered modules require granted menus and do not fetch when only static routes exist', async () => {
  const context = await fixture()
  context.setModules(...Object.values(moduleIds))
  context.menu.menuResultCache = []
  context.menu.menusMap = new Map(Object.values(menuCodes).map(code => [code, {}]))
  const scope = vue.effectScope()
  const state = scope.run(() => context.api.useResourceCapabilities(vue.ref(false)))
  const widgets = ['EdgeNodes', 'AlgorithmCoverage', 'Collection', 'NetworkCards'].map(kind => scope.run(() => context.api.useResourceWidget(kind, vue.ref(undefined), vue.ref(false))))
  await tick()
  assert.deepEqual(state.modules.value, flags([]))
  assert.ok(widgets.every(widget => widget.unavailable.value))
  assert.equal(context.calls.length, 0)
  context.menu.menuResultCache = Object.values(menuCodes).map(code => ({ code }))
  context.menu.loading = true
  await tick()
  assert.deepEqual(state.modules.value, flags([]))
  context.menu.loading = false
  context.menu.initialized = false
  await tick()
  assert.deepEqual(state.modules.value, flags([]))
  scope.stop()
})

test('SaaS requires initialized non-loading authorized menu tree, not static routes', async () => {
  const context = await fixture(true)
  const scope = vue.effectScope()
  const state = scope.run(() => context.api.useResourceCapabilities(vue.ref(false)))
  for (const selected of [[], Object.keys(menuCodes), ...Object.keys(menuCodes).map(key => [key])]) {
    context.menu.menuResultCache = [{ code: 'root', children: selected.map(key => ({ code: menuCodes[key] })) }]
    await tick()
    assert.deepEqual(state.modules.value, flags(selected))
  }
  context.menu.menuResultCache = []
  context.menu.menusMap = new Map(Object.values(menuCodes).map(code => [code, {}]))
  await tick()
  assert.deepEqual(state.modules.value, flags([]))
  context.menu.menuResultCache = [{ code: 'root', children: Object.values(menuCodes).map(code => ({ code })) }]
  context.menu.initialized = false
  await tick()
  assert.deepEqual(state.modules.value, flags([]))
  context.menu.initialized = true
  context.menu.loading = true
  await tick()
  assert.deepEqual(state.modules.value, flags([]))
  context.menu.loading = false
  await tick()
  assert.deepEqual(state.modules.value, flags(Object.keys(menuCodes)))
  assert.equal(context.calls.length, 0)
  scope.stop()
})

test('initial menu failure ends loading and exposes retryable error in both deployments', async () => {
  for (const saas of [false, true]) {
    const context = await fixture(saas)
    context.menu.initialized = false
    context.menu.queryMenus = async () => { throw new Error('menu unavailable') }
    const scope = vue.effectScope()
    const state = scope.run(() => context.api.useResourceCapabilities(vue.ref(false)))
    assert.equal(state.loading.value, true)
    await state.reload()
    assert.equal(state.loading.value, false)
    assert.equal(state.errors.value[0].message, 'menu unavailable')
    context.menu.queryMenus = async () => { context.menu.initialized = true }
    await state.reload()
    assert.equal(state.errors.value.length, 0)
    assert.equal(state.loading.value, false)
    scope.stop()
  }
})

test('preview exposes all capabilities without requests and returns to live state', async () => {
  for (const saas of [false, true]) {
    const context = await fixture(saas)
    context.setModules()
    context.menu.menuResultCache = []
    const preview = vue.ref(true), scope = vue.effectScope()
    const state = scope.run(() => context.api.useResourceCapabilities(preview))
    assert.deepEqual(state.modules.value, flags(Object.keys(moduleIds)))
    assert.deepEqual(state.capabilities.value, { collection: true, networkCards: true })
    preview.value = false
    await tick()
    assert.deepEqual(state.modules.value, flags([]))
    assert.equal(context.calls.length, 0)
    scope.stop()
  }
})

test('resource widget availability follows its exact dependencies', async () => {
  const { api } = await fixture()
  const cases = { EdgeNodes: ['edge'], VideoPlaybackTrend: ['edge'], AlgorithmCoverage: ['vision', 'edge'], Collection: ['collection'], NetworkCards: ['networkCards'] }
  for (const [kind, required] of Object.entries(cases)) for (let mask = 0; mask < 32; mask++) {
    const selected = Object.keys(moduleIds).filter((_, i) => mask & (1 << i))
    assert.equal(api.resourceKindAvailable(kind, flags(selected)), required.every(key => selected.includes(key)), `${kind}/${selected}`)
  }
})

test('overview optional rows, composite cards and collection title match five capabilities', async () => {
  const { api } = await fixture()
  for (let mask = 0; mask < 32; mask++) {
    const enabled = Object.keys(moduleIds).filter((_, i) => mask & (1 << i))
    const modules = flags(enabled)
    for (const [id, required] of Object.entries({ gateway:['edge'], model:['model'], collector:['collection'], card:['networkCards'], algorithm:['vision'], visionAlarm:['vision'], coverage:['vision','edge'] })) {
      assert.equal(api.resourceRowAvailable({ id }, modules), required.every(key => modules[key]), `${id}/${mask}`)
    }
    for (const saas of [false, true]) {
      assert.equal(api.homeFeatureAvailable('Collection', modules, saas), modules.collection || modules.networkCards)
      assert.equal(api.homeFeatureAvailable('AiCenter', modules, saas), !saas || modules.vision)
    }
    if (modules.collection || modules.networkCards) assert.equal(api.homeTitleKey('Collection', modules), modules.collection && modules.networkCards ? 'Collection' : modules.collection ? 'collector' : 'card')
  }
})

test('overview APIs avoid requests for hidden abilities and retain independent algorithm/agent data', async () => {
  for (const saas of [false, true]) {
    const context = await fixture(saas)
    context.setModules('jetlinks-ai-ui')
    context.menu.menuResultCache = [{ code: 'algorithm-center' }]
    const rows = await context.api.loadResourceRows()
    const ids = rows.map(row => row.id)
    assert.ok(ids.includes('algorithm'))
    assert.equal(ids.includes('agent'), !saas)
    assert.ok(!ids.some(id => ['gateway','coverage','model','collector','card'].includes(id)))
    assert.ok(!context.calls.some(call => call.summary === 'gateway' || call.endpoint?.includes('/coverage/') || call.endpoint?.includes('/data-collect/') || call.endpoint?.includes('/network/card/') || JSON.stringify(call.body || {}).includes('visResource:model')))
    context.calls.length = 0
    context.setModules()
    context.menu.menuResultCache = []
    const alarms = await context.api.loadOperationRows()
    assert.deepEqual(alarms.map(row => row.id), ['deviceAlarm'])
    assert.ok(!context.calls.some(call => call.endpoint?.includes('aiTaskMediaTarget')))
  }
})

test('overview polling removes unavailable data and discards stale responses after capability revocation', async () => {
  const context = await fixture()
  context.setModules(...Object.values(moduleIds))
  const pending = []
  context.homeLoad = feature => feature === 'AiCenter' ? new Promise(resolve => { pending.push(resolve) }) : Promise.resolve([])
  const polling = context.api.createHomePolling(feature => context.homeLoad(feature))
  const scope = vue.effectScope()
  const state = scope.run(() => context.api.useHomeRuntime('AiCenter', vue.ref(false), vue.ref(0), vue.ref(0), polling))
  await tick()
  context.setModules('edge-master-ui')
  await tick()
  pending[0]([{ id:'algorithm', value: 3 }, { id:'coverage', value: 2 }])
  await tick()
  assert.ok(!state.rows.value.some(row => ['algorithm','coverage'].includes(row.id)))
  scope.stop(); polling.dispose()
})

test('overview polling isolates account and project scopes and ignores previous pending results', async () => {
  const context=await fixture()
  const pending=[]
  context.homeLoad=feature=>new Promise(resolve=>pending.push({feature,resolve}))
  const polling=context.api.createHomePolling(feature=>context.homeLoad(feature))
  const scope=vue.effectScope()
  const state=scope.run(()=>context.api.useHomeRuntime('Visualization',vue.ref(false),vue.ref(0),vue.ref(0),polling))
  await tick()
  context.user.userInfo.id='user-b'
  await tick()
  context.runtime.project='project-b'
  await tick()
  assert.equal(pending.length,3)
  pending[2].resolve([{id:'screen',value:3}])
  await tick()
  pending[0].resolve([{id:'screen',value:1}]); pending[1].resolve([{id:'screen',value:2}])
  await tick()
  assert.deepEqual(state.rows.value.map(row=>row.value),[3])
  scope.stop();polling.dispose()
})

test('overview layouts fill the grid after actual card constraints for every ability combination', async () => {
  const { api } = await fixture()
  for (const saas of [false,true]) for (const guide of [false,true]) for (let mask=0; mask<32; mask++) {
    const modules=flags(Object.keys(moduleIds).filter((_,i)=>mask & (1<<i)))
    const layout=api.buildOverviewLayout({saas, modules, showGuide:guide, guideAvailable:saas})
    assert.equal(layout.some(([kind])=>kind==='Collection'), modules.collection || modules.networkCards)
    assert.equal(layout.some(([kind])=>kind==='AiCenter'), !saas || modules.vision)
    assert.equal(layout.some(([kind])=>kind==='QuickGuide'), saas && guide)
    const boxes=layout.map(([kind,x,y,w,h])=>({...api.normalizeGridItem({...api.overviewConfigs[kind].componentProps.gridItem,x,y,w,h},12),kind}))
    const bottom=Math.max(...boxes.map(box=>box.y+box.h))
    for(let y=0;y<bottom;y++) {
      const row=boxes.filter(box=>box.y<=y && y<box.y+box.h).sort((a,b)=>a.x-b.x)
      let x=0
      for(const box of row){assert.equal(box.x,x,`${saas}/${guide}/${mask}/${y}/${box.kind}`);x+=box.w}
      assert.equal(x,12,`${saas}/${guide}/${mask}/${y}`)
    }
  }
})

test('overview storage isolates every capability, deployment, guide and user/project scope', async () => {
  const {api}=await fixture()
  const all=flags(Object.keys(moduleIds)), key=(scope,saas,modules,guide)=>api.overviewLayoutStorageKey(scope,saas,modules,guide)
  const keys=[key('user-a/project-a',false,all,false),key('user-b/project-a',false,all,false),key('user-a/project-b',false,all,false),key('user-a/project-a',true,all,false),key('user-a/project-a',false,all,true), ...Object.keys(moduleIds).map(id=>key('user-a/project-a',false,{...all,[id]:false},false))]
  assert.equal(new Set(keys).size,keys.length)
})

test('storage keys isolate users, projects, deployments, widths and every final widget set', async () => {
  const { api } = await fixture()
  const profiles = [profile(), profile({ scope: 'user-b/project-a' }), profile({ scope: 'user-a/project-b' }), profile({ saas: true }), profile({ mode: 'medium' }), profile({ saas: true, mode: 'compact' }), profile({ capabilities: { collection: false, networkCards: true } }), profile({ capabilities: { collection: true, networkCards: false } }), profile({ capabilities: { collection: false, networkCards: false } }), profile({ widgets: kinds.filter(kind => kind !== 'EdgeNodes') }), profile({ widgets: [] })]
  assert.equal(new Set(profiles.map(api.resourceLayoutStorageKey)).size, profiles.length)
  assert.equal(api.resourceLayoutStorageKey(profile()), api.resourceLayoutStorageKey(profile({ widgets: [...kinds].reverse() })))
})

test('migration preserves matching v5 user geometry and never deletes the original cache', async () => {
  const { api } = await fixture()
  const saved = storage()
  const previous = [{ i: 'resourceCenterQuickStart', x: 3, y: 7, w: 14, h: 11 }]
  saved.setItem('resource-center-dashboard-v5', JSON.stringify(previous))
  const key = api.resourceLayoutStorageKey(profile({ saas: true, widgets: [] }))
  api.migrateResourceLayout(saved, key, ['resourceCenterQuickStart'], profile({ saas: true, widgets: [] }))
  assert.deepEqual(JSON.parse(saved.getItem(key)), previous)
  assert.deepEqual(JSON.parse(saved.getItem('resource-center-dashboard-v5')), previous)
  saved.setItem(key, 'existing-personal-layout')
  api.migrateResourceLayout(saved, key, ['resourceCenterQuickStart'], profile({ saas: true, widgets: [] }))
  assert.equal(saved.getItem(key), 'existing-personal-layout')
})

test('migration skips missing/duplicate widgets, malformed legacy data and compact layouts', async () => {
  const { api } = await fixture()
  const row = { i: 'resourceCenterQuickStart', x: 0, y: 0, w: 12, h: 9 }
  for (const value of ['bad json', JSON.stringify([row, row]), JSON.stringify([{ ...row, i: 'removed-widget' }]), JSON.stringify([{ ...row, w: '12' }])]) {
    const saved = storage()
    saved.setItem('resource-center-dashboard-v5', value)
    api.migrateResourceLayout(saved, 'new', [row.i], profile({ saas: true, widgets: [] }))
    assert.equal(saved.getItem('new'), null)
    assert.equal(saved.getItem('resource-center-dashboard-v5'), value)
  }
  const saved = storage()
  saved.setItem('resource-center-dashboard-v5', JSON.stringify([row]))
  api.migrateResourceLayout(saved, 'new', [row.i], profile({ saas: true, mode: 'compact', widgets: [] }))
  assert.equal(saved.getItem('new'), null)
})

test('v4 gateway compaction is copied to the new profile without modifying the legacy record', async () => {
  const { api } = await fixture()
  const saved = storage()
  const previous = [{ i: 'resourceCenterVideoPlaybackTrend', x: 9, y: 22, w: 15, h: 20 }]
  saved.setItem('resource-center-dashboard-v4', JSON.stringify(previous))
  api.migrateResourceLayout(saved, 'new', [previous[0].i], profile({ saas: true, widgets: [] }))
  assert.equal(JSON.parse(saved.getItem('new'))[0].h, 14)
  assert.equal(JSON.parse(saved.getItem('resource-center-dashboard-v4'))[0].h, 20)
})

test('a reduced private profile cannot inherit matching SaaS widget IDs with old 12-column positions', async () => {
  const { api } = await fixture()
  const saved = storage()
  const legacy = api.saasResourceLayout.map(([kind, x, y, w, h]) => ({ i: `resourceCenter${kind}`, x, y, w, h }))
  saved.setItem('resource-center-dashboard-v5', JSON.stringify(legacy))
  const reduced = profile({ capabilities: { collection: false, networkCards: false } })
  api.migrateResourceLayout(saved, 'private-new', legacy.map(item => item.i), reduced)
  assert.equal(saved.getItem('private-new'), null)
  assert.deepEqual(JSON.parse(saved.getItem('resource-center-dashboard-v5')), legacy)
})

test('quick start shares the provided capability state, producing three to six actions without requests', async () => {
  const context = await fixture()
  const capabilities = vue.ref({ collection: true, networkCards: true })
  const modules = vue.ref({ edge: true, model: true })
  let quickStart
  const Child = { setup() { quickStart = context.api.useQuickStart(vue.ref(false)); return () => null } }
  const Parent = { setup() {
    context.api.provideResourceCapabilities({ capabilities, modules, loading: vue.ref(false), errors: vue.ref([]), scope: vue.ref('test'), reload: async () => {} })
    return () => vue.h(Child)
  } }
  await renderToString(vue.createSSRApp(Parent))
  assert.equal(quickStart.actions.value.length, 6)
  capabilities.value = { collection: false, networkCards: true }
  assert.equal(quickStart.actions.value.length, 5)
  assert.ok(!quickStart.actions.value.some(item => item.key === 'collector'))
  quickStart.open('collector')
  assert.equal(context.calls.length, 0)
  capabilities.value = { collection: false, networkCards: false }
  assert.equal(quickStart.actions.value.length, 4)
  modules.value = { edge: false, model: false }
  assert.equal(quickStart.actions.value.length, 3)
  assert.ok(!quickStart.actions.value.some(item => item.key === 'edge'))
  quickStart.open('edge')
  assert.equal(context.calls.length, 0)
})


test('every private module combination uses the same quick-start actions for content and layout', async () => {
  const { api } = await fixture()
  for (const saas of [false, true]) for (const edge of [false, true]) for (const collection of [false, true]) for (const networkCards of [false, true]) {
    const actions = api.getQuickStartActions({ edge, collection, networkCards })
    assert.equal(actions.length, 3 + Number(edge) + Number(collection) + Number(networkCards))
    assert.equal(actions.some(action => action.key === 'edge'), edge)
    assert.equal(actions.some(action => action.key === 'collector'), collection)
    assert.equal(actions.some(action => action.key === 'card'), networkCards)
    assert.equal(api.getQuickStartActions({ edge, collection, networkCards }, true).length, 6)
  }
})

test('visualization keeps SaaS columns and uses only the actual private items as grid cells', async () => {
  const rows = [
    ...['image', 'component', 'model'].map(id => ({ id, subgroup: 'assets' })),
    ...['screen', 'template'].map(id => ({ id, subgroup: 'screens' })),
  ]
  const privateApi = (await fixture()).api
  assert.deepEqual(privateApi.visualizationGroups(rows).map(group => group.map(row => row.id)), [
    ['image'], ['screen'], ['component'], ['template'], ['model'],
  ])
  assert.equal(privateApi.visualizationGroups(rows.filter(row => row.id !== 'model')).length, 4)
  const saasApi = (await fixture(true)).api
  assert.deepEqual(saasApi.visualizationGroups(rows).map(group => group.map(row => row.id)), [
    ['image', 'component', 'model'], ['screen', 'template'],
  ])
})

test('new private layouts never inherit fixed-ratio geometry and keep all previous records', async () => {
  const { api } = await fixture()
  const saved = storage()
  const old = JSON.stringify([{ i: 'resourceCenterQuickStart', x: 0, y: 4, w: 12, h: 9 }])
  for (const key of ['resource-center-dashboard-v4', 'resource-center-dashboard-v5', 'resource-center-dashboard-v6:old']) saved.setItem(key, old)
  const key = api.resourceLayoutStorageKey(profile())
  assert.ok(key.startsWith('resource-dashboard:v8:'))
  api.migrateResourceLayout(saved, key, ['resourceCenterQuickStart'], profile())
  assert.equal(saved.getItem(key), null)
  assert.equal([...saved.values.values()].every(value => value === old), true)
})


test('gateway status makes no request without the edge module and rejects a late response after removal', async () => {
  const context = await fixture()
  context.setModules()
  const scope = vue.effectScope()
  const info = vue.ref({ componentProps: { resourceCenterVideoPlaybackTrend: { refreshSeconds: 0 } } })
  const state = scope.run(() => context.api.useGatewayStatus(info, vue.ref(false)))
  await tick()
  assert.equal(context.calls.length, 0)
  let finish
  context.gatewayLoad = metric => {
    context.calls.push({ gateway: metric })
    return new Promise(resolve => { finish = resolve })
  }
  context.setModules('edge-master-ui')
  await tick()
  assert.equal(context.calls.length, 1)
  context.setModules()
  await tick()
  finish({ gateways: [{ id: 'late', name: 'Late', metrics: { queue: { property: 'queue', value: 9 } } }], unit: '条' })
  await tick()
  assert.deepEqual(state.rows.value, [])
  assert.equal(state.loading.value, false)
  assert.equal(context.calls.length, 1)
  scope.stop()
  assert.equal(context.listeners.size, 0)
})


test('revoking SaaS gateway permission discards a late status response', async () => {
  const context = await fixture(true)
  context.menu.menuResultCache = [{ code: 'iot-user-device-list' }, { code: 'algorithm-center' }]
  let finish
  context.gatewayLoad = metric => { context.calls.push({ gateway: metric }); return new Promise(resolve => { finish = resolve }) }
  const scope = vue.effectScope()
  const state = scope.run(() => context.api.useGatewayStatus(vue.ref(undefined), vue.ref(false)))
  await tick()
  assert.equal(context.calls.length, 1)
  context.menu.menuResultCache = []
  await tick()
  finish({ gateways: [{ id: 'late', name: 'Late', metrics: { queue: { property: 'queue', value: 9 } } }], unit: '条' })
  await tick()
  assert.deepEqual(state.rows.value, [])
  assert.equal(state.loading.value, false)
  assert.equal(context.calls.length, 1)
  scope.stop()
})

test('visualization skips the model query without the model capability', async () => {
  for (const saas of [false, true]) {
    const context = await fixture(saas)
    context.setModules()
    context.menu.menuResultCache = []
    const scope = vue.effectScope()
    const state = scope.run(() => context.api.useResourceWidget('Visualization', vue.ref(undefined), vue.ref(false)))
    await tick()
    const modelCalls = () => context.calls.filter(item => JSON.stringify(item.body || {}).includes('visResource:model'))
    assert.equal(modelCalls().length, 0)
    assert.ok(context.calls.some(item => item.endpoint?.includes('/visualization/')))
    if (saas) context.menu.menuResultCache = [{ code: 'visualization/resource/model' }]
    else { context.setModules('visualization-model-ui'); context.menu.menuResultCache = [{ code: 'visualization/resource/model' }] }
    await tick()
    assert.ok(modelCalls().length > 0)
    assert.ok(!state.error.value)
    scope.stop()
  }
})

test('gateway queue is unavailable without vision and never requested, including after revocation', async () => {
  const context = await fixture()
  context.setModules('edge-master-ui')
  const scope = vue.effectScope()
  const state = scope.run(() => context.api.useGatewayStatus(vue.ref({ componentProps: { resourceCenterVideoPlaybackTrend: { refreshSeconds: 0 } } }), vue.ref(false)))
  await tick()
  assert.equal(state.metric.value, 'cpu')
  assert.ok(!state.tabs.value.some(tab => tab.value === 'queue'))
  assert.ok(context.calls.some(item => item.gateway === 'cpu'))
  assert.ok(!context.calls.some(item => item.gateway === 'queue'))
  context.setModules('edge-master-ui', 'jetlinks-ai-ui')
  await tick()
  state.metric.value = 'queue'
  await tick()
  assert.ok(context.calls.some(item => item.gateway === 'queue'))
  context.setModules('edge-master-ui')
  await tick()
  assert.equal(state.metric.value, 'cpu')
  const count = context.calls.filter(item => item.gateway === 'queue').length
  await state.refresh()
  assert.equal(context.calls.filter(item => item.gateway === 'queue').length, count)
  scope.stop()
})

test('overview device health, operations and quick actions share the edge rule and restore it dynamically', async () => {
  const context = await fixture()
  context.setModules('edge-master-ui', 'visualization-model-ui', 'jetlinks-ai-ui')
  context.summary = async id => { calls.push({ summary: id }); return { total: 0, online: 0 } }
  context.homeLoad = async feature => feature === 'DeviceAccess'
    ? ['gateway', 'devices', 'video'].map(id => ({ id, group: 'health', value: 3, online: 2, offline: 1 }))
    : [{ id: 'deviceAlarm', group: 'alarms', value: 0 }]
  const polling = context.api.createHomePolling(feature => context.homeLoad(feature))
  const scope = vue.effectScope(), edit = vue.ref(false)
  const states = scope.run(() => Object.fromEntries(['DeviceAccess', 'Operations', 'QuickActions'].map(feature => [
    feature, context.api.useHomeRuntime(feature, feature === 'QuickActions' ? edit : vue.ref(false), vue.ref(0), vue.ref(0), polling),
  ])))
  await tick()
  assert.equal(states.DeviceAccess.rows.value.length, 3)
  assert.ok(states.Operations.rows.value.some(row => row.id === 'gateway'))
  assert.equal(states.QuickActions.rows.value.length, 7)
  context.setModules('visualization-model-ui', 'jetlinks-ai-ui')
  await tick()
  assert.deepEqual(states.DeviceAccess.rows.value.map(row => row.id), ['devices', 'video'])
  assert.ok(!states.Operations.rows.value.some(row => row.id === 'gateway'))
  assert.equal(states.QuickActions.rows.value.length, 6)
  assert.ok(!states.QuickActions.rows.value.some(row => row.id === 'gateway'))
  edit.value = true
  await tick()
  assert.equal(states.QuickActions.rows.value.length, 7)
  context.setModules('visualization-model-ui', 'edge-master-ui', 'jetlinks-ai-ui')
  await tick()
  assert.equal(states.DeviceAccess.rows.value.length, 3)
  assert.ok(states.Operations.rows.value.some(row => row.id === 'gateway'))
  scope.stop(); polling.dispose()
  assert.equal(context.listeners.size, 0)
  const saas = await fixture(true)
  saas.setModules()
  assert.equal(saas.api.resourceRowAvailable({ id: 'gateway' }), true)
})

test('gateway ranking navigates by a current row id and respects preview, module and menu guards', async () => {
  const context = await fixture()
  context.setModules('edge-master-ui', 'jetlinks-ai-ui')
  context.menu.menusMap.set('iot-user-device-list/GatewayDetail', {})
  context.gatewayLoad = async metric => ({ gateways: [{ id: 'actual-id', name: 'Gateway', productName: 'Product', online: true,
    metrics: { [metric]: { property: metric, value: 42 } } }], unit: metric === 'queue' ? '条' : '%' })
  const scope = vue.effectScope(), edit = vue.ref(false)
  const state = scope.run(() => context.api.useGatewayStatus(vue.ref({ componentProps: { resourceCenterVideoPlaybackTrend: { refreshSeconds: 0 } } }), edit))
  await tick()
  assert.equal(state.rows.value[0].caption, 'Product')
  state.openGateway({ ...state.rows.value[0], id: 'not-current' })
  assert.equal(context.calls.filter(call => call.navigation).length, 0)
  state.openGateway(state.rows.value[0])
  state.openList()
  assert.deepEqual(context.calls.filter(call => call.navigation).map(call => call.navigation), [
    ['iot-user-device-list/GatewayDetail', { params: { gatewayId: 'actual-id' }, query: { type: 'gateway' } }],
    ['iot-user-device-list', { query: { type: 'gateway' } }],
  ])
  const count = context.calls.length
  context.menu.menusMap.delete('iot-user-device-list/GatewayDetail')
  context.menu.menusMap.delete('iot-user-device-list')
  state.openGateway(state.rows.value[0]); state.openList()
  assert.equal(context.calls.length, count)
  context.menu.menusMap.set('iot-user-device-list/GatewayDetail', {})
  context.menu.menusMap.set('iot-user-device-list', {})
  edit.value = true; await tick()
  state.openGateway(state.rows.value[0]); state.openList()
  assert.equal(context.calls.length, count)
  edit.value = false; await tick()
  const oldRow = state.rows.value[0]
  context.setModules(); await tick()
  state.openGateway(oldRow); state.openList()
  assert.equal(context.calls.length, count)
  scope.stop()
})

test('all four ranking metrics load without history and ignore a response after disposal', async () => {
  const context = await fixture()
  context.setModules('edge-master-ui', 'jetlinks-ai-ui')
  const pending = []
  context.gatewayLoad = metric => { context.calls.push({ gateway: metric }); return new Promise(resolve => pending.push({ metric, resolve })) }
  const scope = vue.effectScope()
  const state = scope.run(() => context.api.useGatewayStatus(vue.ref({ componentProps: { resourceCenterVideoPlaybackTrend: { refreshSeconds: 0 } } }), vue.ref(false)))
  for (const metric of ['queue', 'cpu', 'memory', 'disk']) {
    state.metric.value = metric
    await tick()
    const call = pending.at(-1)
    assert.equal(call.metric, metric)
    call.resolve({ gateways: [{ id: metric, name: metric, online: true, metrics: { [metric]: { property: metric, value: 1 } } }], unit: '%' })
    await tick()
    assert.equal(state.rows.value[0].id, metric)
  }
  assert.deepEqual(context.calls.filter(item => item.gateway).map(item => item.gateway), ['queue', 'cpu', 'memory', 'disk'])
  void state.refresh(); await tick()
  const before = state.rows.value.map(item => item.id)
  scope.stop()
  pending.at(-1).resolve({ gateways: [{ id: 'disposed', name: 'disposed', metrics: { disk: { property: 'disk', value: 99 } } }], unit: '%' })
  await tick()
  assert.deepEqual(state.rows.value.map(item => item.id), before)
})


test('gateway presentation switches between zero, small table and four-node ranking', async () => {
  const context = await fixture()
  context.setModules('edge-master-ui', 'jetlinks-ai-ui')
  const requested = []
  context.gatewayLoad = async metric => { requested.push(metric); return { gateways: context.gatewayDirectory.map(item => ({ ...item, metrics: {} })), unit: '%' } }
  const scope = vue.effectScope()
  const info = vue.ref({ componentProps: { resourceCenterVideoPlaybackTrend: { refreshSeconds: 0 }, visionEnabled: false } })
  const counts = []
  const state = scope.run(() => context.api.useGatewayStatus(info, vue.ref(false), count => counts.push(count)))
  await tick()
  assert.equal(state.nodeCount.value, 4)
  assert.equal(state.tableMode.value, false)
  assert.ok(!state.tabs.value.some(tab => tab.value === 'queue'))
  for (const count of [3, 1, 0, 4]) {
    context.gatewayDirectory = Array.from({ length: count }, (_, i) => ({ id: String(i), name: `Node ${i}`, online: true }))
    await state.refresh(); await tick()
    assert.equal(state.nodeCount.value, count)
    assert.equal(state.tableMode.value, count > 0 && count <= 3)
    assert.equal(state.tableRows.value.length, count)
  }
  assert.deepEqual(counts, [4, 3, 1, 0, 4])
  scope.stop()
})
