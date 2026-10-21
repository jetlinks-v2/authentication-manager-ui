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
const kinds = ['EdgeNodes', 'IotDevices', 'VideoDevices', 'Visualization', 'QuickStart', 'AlgorithmCoverage', 'VideoPlaybackTrend', 'MessageTrend', 'Collection', 'NetworkCards', 'DeviceDistribution']
const bundles = new Map()

async function bundle(saas) {
  if (bundles.has(saas)) return bundles.get(saas)
  const configImports = kinds.map(kind => `import { config as ${kind} } from ${JSON.stringify(path.join(group, kind, 'config.ts'))}`).join('\n')
  const result = await build({
    stdin: { contents: `
      export * from ${JSON.stringify(path.join(group, '../useDashboardModules.ts'))}
      export { useHomeRuntime } from ${JSON.stringify(path.join(group, '../Base/shared/useHomeRuntime.ts'))}
      export { createHomePolling } from ${JSON.stringify(path.join(group, '../Base/shared/homePolling.ts'))}
      export { visualizationGroups, resourceRowAvailable } from ${JSON.stringify(path.join(group, '../Base/shared/resources.ts'))}
      export * from ${JSON.stringify(path.join(group, 'services/quickStart.ts'))}
      export * from ${JSON.stringify(path.join(group, 'services/capabilities.ts'))}
      export * from ${JSON.stringify(path.join(group, 'hooks/useResourceCapabilities.ts'))}
      export * from ${JSON.stringify(path.join(group, 'hooks/useQuickStart.ts'))}
      export * from ${JSON.stringify(path.join(group, 'hooks/useGatewayStatus.ts'))}
      export * from ${JSON.stringify(path.join(dashboard, 'resourceDashboardLayout.ts'))}
      export * from ${JSON.stringify(path.join(dashboard, 'resourceLayoutStorage.ts'))}
      export { normalizeGridItem } from '@jetlinks-web-core/components/DashBoardCanvas/utils/layout'
      ${configImports}
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
        '@jetlinks-web-core/utils/project-runtime': 'export const getProjectCodeFromLocation = () => context.runtime.project',
        '@jetlinks-web-core/utils/request-context': 'export const getBaseApi = () => context.runtime.api',
        '@jetlinks-web-core/locales': 'export default { global: { t: key => key } }',
      }
      buildApi.onResolve({ filter: /^\.\/api$/ }, args => /Base\/shared\/(useHomeRuntime|homePollingContext)\.ts$/.test(args.importer)
        ? { path: 'home-loader', namespace: 'home-runtime-test' } : undefined)
      buildApi.onLoad({ filter: /.*/, namespace: 'home-runtime-test' }, () => ({ contents: 'export const loadHomeRows=feature=>context.homeLoad(feature)', loader: 'js' }))
      buildApi.onResolve({ filter: /\.\.\/services\/gatewayStatus$/ }, () => ({ path: 'gateway-service', namespace: 'gateway-hook-test' }))
      buildApi.onResolve({ filter: /^(vue-router|vue-i18n|@vueuse\/core)$/ }, args => ({ path: args.path, namespace: 'gateway-hook-test' }))
      buildApi.onLoad({ filter: /.*/, namespace: 'gateway-hook-test' }, args => ({ contents: args.path === 'gateway-service'
        ? `export const gatewayMetrics=['queue','cpu','heap','disk'];export const loadGatewayStatuses=(metric)=>context.gatewayLoad(metric);export const loadGatewayHistory=async()=>[]`
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
    initialized: true,
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
  context.homeLoad = async feature => { calls.push({ home: feature }); return [] }
  context.gatewayLoad = async metric => { calls.push({ gateway: metric }); return { gateways: [], unit: '条' } }
  context.moduleRegistry = {
    hasModule: id => context.modules.has(id),
    onChange: listener => { context.listeners.add(listener); return () => context.listeners.delete(listener) },
  }
  context.setModules = (...ids) => { context.modules.clear(); ids.forEach(id => context.modules.add(id)); context.listeners.forEach(listener => listener()) }
  context.request = { get: async endpoint => {
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

function assertFilledLayout(api, layout, description) {
  const boxes = layout.map(([kind, x, y, w, h]) => ({
    ...api.normalizeGridItem({ ...api.configs[kind].componentProps.gridItem, x, y, w, h }, 24), kind,
  }))
  for (const item of boxes) assert.ok(item.x >= 0 && item.x + item.w <= 24)
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j]
    assert.ok(!(a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y), `${description}:${a.kind}/${b.kind}`)
  }
  for (const y of new Set(boxes.map(item => item.y))) {
    const widths = boxes.filter(item => item.y === y).map(item => item.w)
    assert.ok(Math.max(...widths) - Math.min(...widths) <= 1, `${description}:equal widths at ${y}`)
  }
  const bottom = Math.max(0, ...boxes.map(item => item.y + item.h))
  for (let y = 0; y < bottom; y++) assert.equal(boxes.filter(item => item.y <= y && item.y + item.h > y).reduce((sum, item) => sum + item.w, 0), 24, `${description}:row ${y}`)
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
  assert.deepEqual(body.Collection.slice(0, 3), [12, 0, 12])
  assert.deepEqual(body.MessageTrend.slice(0, 3), [0, body.QuickStart[3], 24])
  assert.deepEqual(layout(['NetworkCards']).NetworkCards, [0, 0, 24, 14])
  assert.deepEqual(api.buildPrivateResourceLayout([], 1600), [])
})

test('the wide profile uses equal-width rows and no-module defaults shrink the quick-start row', async () => {
  const { api } = await fixture()
  const full = Object.fromEntries(api.buildPrivateResourceLayout(kinds, 1600).map(([kind, ...grid]) => [kind, grid]))
  assert.deepEqual(full.QuickStart, [0, 4, 12, 9])
  assert.deepEqual(full.Collection, [12, 4, 12, 9])
  assert.deepEqual(full.NetworkCards, [16, 13, 8, 14])
  assert.deepEqual(full.MessageTrend, [8, 13, 8, 14])
  assert.deepEqual(full.VideoPlaybackTrend, [12, 27, 12, 9])
  const reduced = Object.fromEntries(api.buildPrivateResourceLayout(visibleKinds(false, false), 1600).map(([kind, ...grid]) => [kind, grid]))
  assert.deepEqual(reduced.QuickStart, [0, 4, 24, 6])
  assert.deepEqual(reduced.MessageTrend, [12, 10, 12, 9])
})

test('SaaS retains its nine existing default positions', async () => {
  const { api } = await fixture(true)
  assert.deepEqual(api.saasResourceLayout, [
    ['EdgeNodes', 0, 0, 3, 4], ['IotDevices', 3, 0, 3, 4], ['VideoDevices', 6, 0, 3, 4], ['Visualization', 9, 0, 3, 4],
    ['QuickStart', 0, 4, 6, 9], ['MessageTrend', 6, 4, 6, 9], ['AlgorithmCoverage', 0, 13, 6, 9],
    ['VideoPlaybackTrend', 6, 13, 6, 14], ['DeviceDistribution', 0, 22, 6, 9],
  ])
})

test('time-series disabled still means the card module exists; collector uses the explicit backend boolean', async () => {
  const { api, responses, calls } = await fixture()
  responses.collection = false
  responses.networkCards = false
  assert.deepEqual(await api.loadResourceCapabilities({ collection: true, networkCards: true }), { collection: false, networkCards: true })
  assert.deepEqual(calls.map(item => item.endpoint).sort(), Object.values(api.resourceCapabilityPaths).sort())
})

test('only a missing card capability route marks that module unavailable; other failures remain errors', async () => {
  const context = await fixture()
  context.request.get = async endpoint => {
    if (endpoint === context.api.resourceCapabilityPaths.networkCards) throw error(404)
    return { success: true, result: true }
  }
  assert.deepEqual(await context.api.loadResourceCapabilities({ collection: true, networkCards: true }), { collection: true, networkCards: false })
  for (const status of [401, 403, 500, 503]) {
    context.request.get = async () => { throw error(status) }
    await assert.rejects(context.api.loadResourceCapabilities({ collection: false, networkCards: true }))
  }
  context.request.get = async () => { throw error(404) }
  await assert.rejects(context.api.loadResourceCapabilities({ collection: true, networkCards: false }))
})

test('malformed capability data never becomes false, and inaccessible modules make no request', async () => {
  const { api, calls } = await fixture()
  for (const response of [null, { success: false, result: false }, { success: true, result: 0 }, { success: true }]) {
    assert.throws(() => api.capabilityBoolean(response))
  }
  assert.deepEqual(await api.loadResourceCapabilities({ collection: false, networkCards: false }), { collection: false, networkCards: false })
  assert.equal(calls.length, 0)
})

test('the hook intersects backend support, actual frontend routes, and current menu authorization', async () => {
  const context = await fixture()
  delete context.routes['iot-card/CardManagement']
  const scope = vue.effectScope()
  const state = scope.run(() => context.api.useResourceCapabilities(vue.ref(false)))
  await tick()
  assert.deepEqual(state.capabilities.value, { collection: true, networkCards: false })
  assert.equal(context.calls.length, 1)
  context.menu.menusMap = new Map()
  await tick()
  assert.deepEqual(state.capabilities.value, { collection: false, networkCards: false })
  assert.equal(context.calls.length, 1)
  scope.stop()
})

test('SaaS and preview skip private capability requests; preview can run without a signed-in user', async () => {
  for (const saas of [false, true]) {
    const context = await fixture(saas)
    context.user.userInfo.id = ''
    const scope = vue.effectScope()
    const preview = vue.ref(true)
    const state = scope.run(() => context.api.useResourceCapabilities(preview))
    await tick()
    assert.deepEqual(state.capabilities.value, { collection: true, networkCards: true })
    assert.equal(context.calls.length, 0)
    preview.value = false
    context.user.userInfo.id = 'user-a'
    await tick()
    assert.equal(context.calls.length, saas ? 0 : 2)
    if (saas) assert.deepEqual(state.capabilities.value, { collection: false, networkCards: false })
    scope.stop()
  }
})

test('account and permission changes discard stale checks, and disposal ignores late responses', async () => {
  const context = await fixture()
  const pending = []
  context.request.get = endpoint => new Promise(resolve => pending.push({ endpoint, resolve }))
  const scope = vue.effectScope()
  const state = scope.run(() => context.api.useResourceCapabilities(vue.ref(false)))
  await tick()
  assert.equal(pending.length, 2)
  context.user.userInfo.id = 'user-b'
  context.menu.menusMap = new Map([['iot-card/CardManagement', {}]])
  await tick()
  assert.equal(pending.length, 3)
  pending[2].resolve({ success: true, result: false })
  await tick()
  assert.deepEqual(state.capabilities.value, { collection: false, networkCards: true })
  pending[0].resolve({ success: true, result: true })
  pending[1].resolve({ success: true, result: true })
  await tick()
  assert.deepEqual(state.capabilities.value, { collection: false, networkCards: true })
  void state.reload()
  await tick()
  scope.stop()
  pending[3].resolve({ success: true, result: true })
  await tick()
  assert.deepEqual(state.capabilities.value, { collection: false, networkCards: false })
})

test('capability failures are visible and retryable rather than cached as missing modules', async () => {
  const context = await fixture()
  context.request.get = async () => { throw error(503) }
  const scope = vue.effectScope()
  const state = scope.run(() => context.api.useResourceCapabilities(vue.ref(false)))
  await tick()
  assert.equal(state.loading.value, false)
  assert.equal(state.errors.value.length, 1)
  context.request.get = async () => ({ success: true, result: true })
  await state.reload()
  assert.equal(state.errors.value.length, 0)
  assert.deepEqual(state.capabilities.value, { collection: true, networkCards: true })
  scope.stop()
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
  const key = api.resourceLayoutStorageKey(profile({ saas: true }))
  api.migrateResourceLayout(saved, key, ['resourceCenterQuickStart'], profile({ saas: true }))
  assert.deepEqual(JSON.parse(saved.getItem(key)), previous)
  assert.deepEqual(JSON.parse(saved.getItem('resource-center-dashboard-v5')), previous)
  saved.setItem(key, 'existing-personal-layout')
  api.migrateResourceLayout(saved, key, ['resourceCenterQuickStart'], profile({ saas: true }))
  assert.equal(saved.getItem(key), 'existing-personal-layout')
})

test('migration skips missing/duplicate widgets, malformed legacy data and compact layouts', async () => {
  const { api } = await fixture()
  const row = { i: 'resourceCenterQuickStart', x: 0, y: 0, w: 12, h: 9 }
  for (const value of ['bad json', JSON.stringify([row, row]), JSON.stringify([{ ...row, i: 'removed-widget' }]), JSON.stringify([{ ...row, w: '12' }])]) {
    const saved = storage()
    saved.setItem('resource-center-dashboard-v5', value)
    api.migrateResourceLayout(saved, 'new', [row.i], profile({ saas: true }))
    assert.equal(saved.getItem('new'), null)
    assert.equal(saved.getItem('resource-center-dashboard-v5'), value)
  }
  const saved = storage()
  saved.setItem('resource-center-dashboard-v5', JSON.stringify([row]))
  api.migrateResourceLayout(saved, 'new', [row.i], profile({ saas: true, mode: 'compact' }))
  assert.equal(saved.getItem('new'), null)
})

test('v4 gateway compaction is copied to the new profile without modifying the legacy record', async () => {
  const { api } = await fixture()
  const saved = storage()
  const previous = [{ i: 'resourceCenterVideoPlaybackTrend', x: 9, y: 22, w: 15, h: 20 }]
  saved.setItem('resource-center-dashboard-v4', JSON.stringify(previous))
  api.migrateResourceLayout(saved, 'new', [previous[0].i], profile({ saas: true }))
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


test('private modules are read after registration, track changes and clean up subscriptions', async () => {
  const context = await fixture()
  context.setModules()
  const scope = vue.effectScope()
  const modules = scope.run(() => context.api.useDashboardModules())
  assert.deepEqual(modules.value, { model: false, edge: false })
  context.setModules('edge-master-ui', 'visualization-model-ui')
  assert.deepEqual(modules.value, { model: true, edge: true })
  context.setModules('visualization-model-ui')
  assert.deepEqual(modules.value, { model: true, edge: false })
  scope.stop()
  assert.equal(context.listeners.size, 0)
  const saas = await fixture(true)
  saas.setModules()
  assert.deepEqual(saas.api.getDashboardModules(), { model: true, edge: true })
})

test('every private module combination uses the same quick-start actions for content and layout', async () => {
  const { api } = await fixture()
  for (const edge of [false, true]) for (const collection of [false, true]) for (const networkCards of [false, true]) {
    const actions = api.getQuickStartActions({ edge, collection, networkCards }, false)
    assert.equal(actions.length, 3 + Number(edge) + Number(collection) + Number(networkCards))
    assert.equal(actions.some(action => action.key === 'edge'), edge)
    assert.equal(actions.some(action => action.key === 'collector'), collection)
    assert.equal(actions.some(action => action.key === 'card'), networkCards)
    assert.equal(api.getQuickStartActions({ edge, collection, networkCards }, false, true).length, 6)
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
  assert.ok(key.startsWith('resource-center-dashboard-v7:'))
  api.migrateResourceLayout(saved, key, ['resourceCenterQuickStart'], profile())
  assert.equal(saved.getItem(key), null)
  assert.equal([...saved.values.values()].every(value => value === old), true)
})


test('standalone quick start checks the same capabilities instead of exposing missing private actions', async () => {
  const context = await fixture()
  context.setModules()
  context.request.get = async endpoint => {
    context.calls.push({ endpoint })
    if (endpoint === context.api.resourceCapabilityPaths.networkCards) throw error(404)
    return { success: true, result: false }
  }
  const scope = vue.effectScope()
  let quickStart
  await renderToString(vue.createSSRApp({ setup() {
    quickStart = scope.run(() => context.api.useQuickStart(vue.ref(false)))
    return () => null
  } }))
  await tick()
  assert.deepEqual(quickStart.actions.value.map(action => action.key), ['iot', 'video', 'screen'])
  assert.equal(quickStart.errors.value.length, 0)
  assert.equal(context.calls.length, 2)
  quickStart.open('edge'); quickStart.open('collector'); quickStart.open('card')
  assert.equal(context.calls.length, 2)
  scope.stop()
  assert.equal(context.listeners.size, 0)
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


test('overview device health, operations and quick actions share the edge rule and restore it dynamically', async () => {
  const context = await fixture()
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
  context.setModules('visualization-model-ui')
  await tick()
  assert.deepEqual(states.DeviceAccess.rows.value.map(row => row.id), ['devices', 'video'])
  assert.ok(!states.Operations.rows.value.some(row => row.id === 'gateway'))
  assert.equal(states.QuickActions.rows.value.length, 6)
  assert.ok(!states.QuickActions.rows.value.some(row => row.id === 'gateway'))
  edit.value = true
  await tick()
  assert.equal(states.QuickActions.rows.value.length, 7)
  context.setModules('visualization-model-ui', 'edge-master-ui')
  await tick()
  assert.equal(states.DeviceAccess.rows.value.length, 3)
  assert.ok(states.Operations.rows.value.some(row => row.id === 'gateway'))
  scope.stop(); polling.dispose()
  assert.equal(context.listeners.size, 0)
  const saas = await fixture(true)
  saas.setModules()
  assert.equal(saas.api.resourceRowAvailable({ id: 'gateway' }), true)
})
