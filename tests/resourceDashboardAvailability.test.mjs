import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { build } = require('esbuild')
const vue = require('vue')
const packageRoot = fileURLToPath(new URL('../', import.meta.url))
const coreRoot = path.resolve(packageRoot, '../../jetlinks-web-core/src')
const group = path.join(packageRoot, 'visDashboard/ResourceCenter')
const bundles = new Map()

async function bundle(saas) {
  if (bundles.has(saas)) return bundles.get(saas)
  const result = await build({
    stdin: { contents: `
      export * from ${JSON.stringify(path.join(group, '../useDashboardModules.ts'))}
      export { useHomeRuntime } from ${JSON.stringify(path.join(group, '../Base/shared/useHomeRuntime.ts'))}
      export { createHomePolling } from ${JSON.stringify(path.join(group, '../Base/shared/homePolling.ts'))}
      export { visualizationGroups, resourceRowAvailable, homeFeatureAvailable, homeTitleKey } from ${JSON.stringify(path.join(group, '../Base/shared/resources.ts'))}
      export * from ${JSON.stringify(path.join(group, '../Base/shared/apiResources.ts'))}
      export * from ${JSON.stringify(path.join(group, '../Base/shared/apiAlgorithms.ts'))}
      export * from ${JSON.stringify(path.join(group, 'services/capabilities.ts'))}
      export * from ${JSON.stringify(path.join(group, 'hooks/useResourceCapabilities.ts'))}
      export * from ${JSON.stringify(path.join(group, 'hooks/useGatewayStatus.ts'))}
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
        '@jetlinks-web-core/utils/consts': 'export const isSaaS = context.saas; export const USER_CENTER_MENU_CODE = "account-center"',
        '@jetlinks-web-core/utils/project-runtime': 'export const getProjectCodeFromLocation = () => context.runtime.project; export const getApplicationRuntimeEntry = () => ({ applicationId: context.runtime.app })',
        '@jetlinks-web-core/utils/request-context': 'export const getBaseApi = () => context.runtime.api',
        '@jetlinks-web-core/locales': 'export default { global: { t: key => key } }',
      }
      buildApi.onResolve({ filter: /^\.\.\/\.\.\/\.\.\/api\/overview$/ }, args => args.importer.endsWith('/Base/shared/apiResources.ts') ? ({ path: 'overview', namespace: 'overview-test' }) : undefined)
      buildApi.onLoad({ filter: /.*/, namespace: 'overview-test' }, () => ({ contents: `export const queryOverviewGatewaySummary=()=>context.summary('gateway');export const queryOverviewIotDeviceSummary=()=>context.summary('devices');export const queryOverviewIotDeviceBreakdown=async()=>[];export const queryOverviewChannelSummary=()=>context.summary('video')`, loader: 'js' }))
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
    runtime: vue.reactive({ project: 'project-a', api: '/api', app: 'app-a' }),
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
  await tick()
  assert.deepEqual(state.modules.value, flags([]))
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


test('capability scope follows user, project, API and application and waits for identity', async () => {
  const context = await fixture(), preview = vue.ref(false)
  const state = context.api.useResourceCapabilities(preview)
  const initial = state.scope.value
  assert.equal(state.loading.value, false)
  for (const [object, field, replacement] of [[context.user.userInfo, 'id', 'user-b'], [context.runtime, 'project', 'project-b'], [context.runtime, 'project', ''], [context.runtime, 'api', '/other-api'], [context.runtime, 'app', 'app-b']]) {
    const previous = object[field]; object[field] = replacement
    assert.notEqual(state.scope.value, initial, field)
    object[field] = previous
    assert.equal(state.scope.value, initial)
  }
  context.user.userInfo.id = ''
  assert.equal(state.loading.value, true, 'ready menu must not make an unidentified user ready')
  context.user.userInfo.id = 'user-b'
  assert.equal(state.loading.value, false)
  assert.notEqual(state.scope.value, initial)
  context.user.userInfo.id = 'user-a'
  assert.equal(state.scope.value, initial)
  preview.value = true; context.user.userInfo.id = ''
  assert.equal(state.loading.value, false, 'preview may load without an account')
})
