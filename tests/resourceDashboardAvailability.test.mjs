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
      export * from ${JSON.stringify(path.join(group, 'services/capabilities.ts'))}
      export * from ${JSON.stringify(path.join(group, 'hooks/useResourceCapabilities.ts'))}
      export * from ${JSON.stringify(path.join(group, 'hooks/useQuickStart.ts'))}
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
        '@jetlinks-web-core/store/menu': 'export const useMenuStore = () => context.menu',
        '@jetlinks-web-core/store/user': 'export const useUserStore = () => context.user',
        '@jetlinks-web-core/router/globModules': 'export const getGlobModules = async () => context.routes',
        '@jetlinks-web-core/utils/consts': 'export const isSaaS = context.saas',
        '@jetlinks-web-core/utils/project-runtime': 'export const getProjectCodeFromLocation = () => context.runtime.project',
        '@jetlinks-web-core/utils/request-context': 'export const getBaseApi = () => context.runtime.api',
        '@jetlinks-web-core/locales': 'export default { global: { t: key => key } }',
      }
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
    saas, menu, calls,
    user: vue.reactive({ userInfo: { id: 'user-a' } }),
    runtime: vue.reactive({ project: 'project-a', api: '/api' }),
    routes: { 'data-collect': () => {}, 'iot-card/CardManagement': () => {} },
    responses: { collection: true, networkCards: true },
  }
  context.request = { get: async endpoint => {
    calls.push({ endpoint })
    return { success: true, result: endpoint.includes('collectorService') ? context.responses.collection : context.responses.networkCards }
  } }
  const module = { exports: {} }
  Function('module', 'exports', 'require', 'context', await bundle(saas))(module, module.exports, require, context)
  return { ...context, api: module.exports }
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

test('any widget subset fills rows after real grid constraints, including empty rows and spanning cards', async () => {
  const { api } = await fixture()
  for (const width of [360, 640, 900, 1600]) for (let mask = 0; mask < 2 ** kinds.length; mask++) {
    const visible = kinds.filter((_, index) => mask & (1 << index))
    const layout = api.buildPrivateResourceLayout(visible, width)
    assert.deepEqual(layout.map(item => item[0]).sort(), [...visible].sort())
    assertFilledLayout(api, layout, `${width}:subset ${mask}`)
  }
})

test('remaining siblings keep their width ratio, single widgets fill the row, and empty rows move up', async () => {
  const { api } = await fixture()
  const layout = visible => Object.fromEntries(api.buildPrivateResourceLayout(visible, 1600).map(([kind, ...grid]) => [kind, grid]))
  const metrics = layout(['EdgeNodes', 'VideoDevices', 'Visualization'])
  assert.deepEqual(Object.values(metrics), [[0, 0, 8, 4], [8, 0, 8, 4], [16, 0, 8, 4]])
  const body = layout(['QuickStart', 'Collection', 'MessageTrend'])
  assert.deepEqual(body.QuickStart.slice(0, 3), [0, 0, 16])
  assert.deepEqual(body.Collection.slice(0, 3), [16, 0, 8])
  assert.deepEqual(body.MessageTrend.slice(0, 3), [0, body.QuickStart[3], 24])
  assert.deepEqual(layout(['NetworkCards']).NetworkCards, [0, 0, 24, 14])
  assert.deepEqual(api.buildPrivateResourceLayout([], 1600), [])
})

test('the complete wide profile retains existing coordinates, and no-module defaults shrink the quick-start row', async () => {
  const { api } = await fixture()
  const full = Object.fromEntries(api.buildPrivateResourceLayout(kinds, 1600).map(([kind, ...grid]) => [kind, grid]))
  assert.deepEqual(full.QuickStart, [0, 4, 12, 9])
  assert.deepEqual(full.Collection, [12, 4, 6, 9])
  assert.deepEqual(full.NetworkCards, [18, 4, 6, 18])
  assert.deepEqual(full.MessageTrend, [9, 13, 9, 9])
  assert.deepEqual(full.VideoPlaybackTrend, [9, 22, 15, 9])
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
  const profiles = [profile(), profile({ scope: 'user-b/project-a' }), profile({ scope: 'user-a/project-b' }), profile({ saas: true }), profile({ mode: 'medium' }), profile({ mode: 'compact' }), profile({ capabilities: { collection: false, networkCards: true } }), profile({ capabilities: { collection: true, networkCards: false } }), profile({ capabilities: { collection: false, networkCards: false } }), profile({ widgets: kinds.filter(kind => kind !== 'EdgeNodes') }), profile({ widgets: [] })]
  assert.equal(new Set(profiles.map(api.resourceLayoutStorageKey)).size, profiles.length)
  assert.equal(api.resourceLayoutStorageKey(profile()), api.resourceLayoutStorageKey(profile({ widgets: [...kinds].reverse() })))
})

test('migration preserves matching v5 user geometry and never deletes the original cache', async () => {
  const { api } = await fixture()
  const saved = storage()
  const previous = [{ i: 'resourceCenterQuickStart', x: 3, y: 7, w: 14, h: 11 }]
  saved.setItem('resource-center-dashboard-v5', JSON.stringify(previous))
  const key = api.resourceLayoutStorageKey(profile())
  api.migrateResourceLayout(saved, key, ['resourceCenterQuickStart'], profile())
  assert.deepEqual(JSON.parse(saved.getItem(key)), previous)
  assert.deepEqual(JSON.parse(saved.getItem('resource-center-dashboard-v5')), previous)
  saved.setItem(key, 'existing-personal-layout')
  api.migrateResourceLayout(saved, key, ['resourceCenterQuickStart'], profile())
  assert.equal(saved.getItem(key), 'existing-personal-layout')
})

test('migration skips missing/duplicate widgets, malformed legacy data and compact layouts', async () => {
  const { api } = await fixture()
  const row = { i: 'resourceCenterQuickStart', x: 0, y: 0, w: 12, h: 9 }
  for (const value of ['bad json', JSON.stringify([row, row]), JSON.stringify([{ ...row, i: 'removed-widget' }]), JSON.stringify([{ ...row, w: '12' }])]) {
    const saved = storage()
    saved.setItem('resource-center-dashboard-v5', value)
    api.migrateResourceLayout(saved, 'new', [row.i], profile())
    assert.equal(saved.getItem('new'), null)
    assert.equal(saved.getItem('resource-center-dashboard-v5'), value)
  }
  const saved = storage()
  saved.setItem('resource-center-dashboard-v5', JSON.stringify([row]))
  api.migrateResourceLayout(saved, 'new', [row.i], profile({ mode: 'compact' }))
  assert.equal(saved.getItem('new'), null)
})

test('v4 gateway compaction is copied to the new profile without modifying the legacy record', async () => {
  const { api } = await fixture()
  const saved = storage()
  const previous = [{ i: 'resourceCenterVideoPlaybackTrend', x: 9, y: 22, w: 15, h: 20 }]
  saved.setItem('resource-center-dashboard-v4', JSON.stringify(previous))
  api.migrateResourceLayout(saved, 'new', [previous[0].i], profile())
  assert.equal(JSON.parse(saved.getItem('new'))[0].h, 7)
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

test('quick start shares the provided capability state, producing four, five or six actions without requests', async () => {
  const context = await fixture()
  const capabilities = vue.ref({ collection: true, networkCards: true })
  let quickStart
  const Child = { setup() { quickStart = context.api.useQuickStart(vue.ref(false)); return () => null } }
  const Parent = { setup() {
    context.api.provideResourceCapabilities({ capabilities, loading: vue.ref(false), errors: vue.ref([]), scope: vue.ref('test'), reload: async () => {} })
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
  assert.equal(context.calls.length, 0)
})
