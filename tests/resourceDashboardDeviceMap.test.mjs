import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { build } = require('esbuild')
const vue = require('vue')
const root = fileURLToPath(new URL('../../../', import.meta.url))
const dashboard = path.join(root, 'modules/authentication-manager-ui/views/resources/Dashboard')
const group = path.join(root, 'modules/authentication-manager-ui/visDashboard/ResourceCenter')
const mapEntry = 'device-manager-ui/visDashboard/DeviceManagement/DeviceMapCard'
const kinds = ['EdgeNodes', 'IotDevices', 'VideoDevices', 'Visualization', 'QuickStart', 'AlgorithmCoverage', 'VideoPlaybackTrend', 'MessageTrend', 'Collection', 'NetworkCards', 'DeviceDistribution', 'VisionTaskRanking']
const tick = async () => { await vue.nextTick(); await new Promise(setImmediate) }
const storage = () => {
  const values = new Map()
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
}

async function fixture(t, { saas = false, width = 1600, available = true, fail = false, defer = false, preview = false } = {}) {
  const loaded = []
  const sources = new Map()
  const saved = storage()
  const capabilities = {
    capabilities: vue.ref({ collection: !saas, networkCards: !saas }),
    modules: vue.ref({ edge: true, model: true, vision: true, collection: !saas, networkCards: !saas }), scope: vue.ref('user-a/project-a'),
    loading: vue.ref(false), errors: vue.ref([]), reload: async () => {},
  }
  const context = { saas, sources, capabilities }
  sources.set('authentication-manager-ui', { 'visDashboard/ResourceCenter': {
    name: 'Resources', sort: 0, directory: 'visDashboard', entries: Object.fromEntries(kinds.map(kind => [
      `authentication-manager-ui/visDashboard/ResourceCenter/${kind}`, async () => context.entries[kind],
    ])),
  } })
  let releaseMap
  const pendingMap = defer ? new Promise(resolve => { releaseMap = resolve }) : undefined
  if (available) sources.set('device-manager-ui', { 'visDashboard/DeviceManagement': {
    name: 'Devices', sort: 0, directory: 'visDashboard', entries: {
      [mapEntry]: async () => {
        loaded.push(mapEntry)
        if (fail) { fail = false; throw new Error('Map entry unavailable') }
        if (pendingMap) await pendingMap
        return context.mapDefinition
      },
      'device-manager-ui/visDashboard/DeviceManagement/UnrelatedCard': async () => { throw new Error('Unrelated entry loaded') },
    },
  } })
  const imports = kinds.map(kind => `import * as ${kind} from ${JSON.stringify(path.join(group, kind, 'index.ts'))}`).join('\n')
  const bundled = await build({
    stdin: { contents: `${imports}
      export const entries = { ${kinds.join(', ')} }
      export * as mapDefinition from ${JSON.stringify(path.join(root, 'modules/device-manager-ui/visDashboard/DeviceManagement/DeviceMapCard/index.ts'))}
      export { useResourceDashboard } from ${JSON.stringify(path.join(dashboard, 'useResourceDashboard.ts'))}
      export * from ${JSON.stringify(path.join(dashboard, 'resourceLayoutStorage.ts'))}
      export { normalizeGridItem } from '@jetlinks-web-core/components/DashBoardCanvas/utils/layout'
      export { useDashboardState } from '@jetlinks-web-core/components/DashBoardCanvas/composables/useDashboardState'
      export { toGridLayout } from '@jetlinks-web-core/components/DashBoardCanvas/utils/layout'
    `, resolveDir: root, loader: 'ts' },
    bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
    plugins: [{ name: 'resource-map-boundaries', setup(api) {
      const boundaries = {
        '@jetlinks-web-core/utils/consts': 'export const isSaaS = context.saas',
        '@jetlinks-web-core/locales': 'export default { global: { t: key => key } }',
        '@jetlinks-web-core/components/DashBoardCanvas/dashboard-sources': 'export const dashboardSources = context.sources',
      }
      api.onResolve({ filter: /hooks\/useResourceCapabilities$/ }, () => ({ path: 'capabilities', namespace: 'boundary' }))
      api.onResolve({ filter: /services\/quickStart$/ }, () => ({ path: 'actions', namespace: 'boundary' }))
      api.onResolve({ filter: /^@jetlinks-web-core\// }, args => {
        if (boundaries[args.path]) return { path: args.path, namespace: 'boundary' }
        const target = path.join(root, 'jetlinks-web-core/src', args.path.replace('@jetlinks-web-core/', ''))
        return { path: existsSync(`${target}.ts`) ? `${target}.ts` : path.join(target, 'index.ts') }
      })
      api.onLoad({ filter: /.*/, namespace: 'boundary' }, args => ({ loader: 'js', contents: boundaries[args.path]
        ?? (args.path === 'capabilities' ? 'export const useResourceCapabilities = () => context.capabilities; export const provideResourceCapabilities = () => {}'
          : 'export const getQuickStartActions = () => Array.from({ length: context.saas ? 4 : 6 })') }))
      api.onLoad({ filter: /useResourceDashboard\.ts$/ }, args => ({ loader: 'ts', contents: readFileSync(args.path, 'utf8').replace(/import\.meta\.glob\([^\n]+\)/, '({})') }))
      api.onResolve({ filter: /\.vue$/ }, args => ({ path: args.path, namespace: 'view' }))
      api.onLoad({ filter: /.*/, namespace: 'view' }, () => ({ loader: 'js', contents: 'export default {}' }))
    } }],
  })
  const module = { exports: {} }
  Function('module', 'exports', 'require', 'context', bundled.outputFiles[0].text)(module, module.exports, require, context)
  Object.assign(context, module.exports)
  const previousStorage = globalThis.localStorage
  globalThis.localStorage = saved
  const scope = vue.effectScope()
  const widthRef = vue.ref(width)
  const hook = scope.run(() => context.useResourceDashboard(vue.ref(preview), widthRef))
  t.after(() => { scope.stop(); if (previousStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = previousStorage })
  await tick()
  return { api: module.exports, hook, saved, loaded, width: widthRef, capabilities, releaseMap }
}

test('the real map entry is discovered alone and appended at full width in both deployments', async t => {
  for (const saas of [false, true]) await t.test(saas ? 'SaaS' : 'private', async t => {
    const { hook, loaded, width, api } = await fixture(t, { saas })
    for (const value of [360, 640, 900, 1600]) {
      width.value = value
      await tick()
      assert.equal(hook.loading.value, false)
      assert.deepEqual(hook.errors.value, [])
      const { components, canvas } = hook.dashboard.value
      const map = components.at(-1)
      assert.equal(map.type, 'deviceMapCard')
      assert.deepEqual(map.componentProps.deviceMapCard, { topTitle: '', isAutoRefresh: true, interval: 60 })
      const grid = api.normalizeGridItem(map.componentProps.gridItem, canvas.gridLayout.colNum)
      assert.equal(grid.w, saas ? 12 : 24)
      assert.equal(grid.x, 0)
      assert.equal(grid.y, Math.max(...components.slice(0, -1).map(item => item.componentProps.gridItem.y + item.componentProps.gridItem.h)))
      assert.ok(grid.minH * 16 + (grid.minH - 1) * 18 >= 420)
      assert.match(hook.storageKey.value, /^resource-dashboard:v8:[a-f0-9]{32}$/)
    }
    assert.deepEqual(loaded, [mapEntry])
    assert.equal(api.mapDefinition.DeviceMapCardConfigProps.componentProps.gridItem.minH, 8)
  })
})

test('an absent device-map source preserves the previous catalog and storage key without hanging', async t => {
  const { hook } = await fixture(t, { available: false })
  assert.equal(hook.loading.value, false)
  assert.deepEqual(hook.errors.value, [])
  assert.equal(hook.dashboard.value.components.some(item => item.type === 'deviceMapCard'), false)
  assert.match(hook.storageKey.value, /^resource-dashboard:v8:[a-f0-9]{32}$/)
})

test('map discovery failure is visible and retry recovers the complete dashboard', async t => {
  const { hook } = await fixture(t, { fail: true })
  assert.equal(hook.loading.value, false)
  assert.equal(hook.errors.value[0].code, 'load-failed')
  await hook.reload()
  await tick()
  assert.deepEqual(hook.errors.value, [])
  assert.equal(hook.loading.value, false)
  assert.equal(hook.dashboard.value.components.at(-1).type, 'deviceMapCard')
})

test('the canvas waits for the map entry and preview does not write personal layout storage', async t => {
  const { hook, releaseMap, saved } = await fixture(t, { defer: true, preview: true, saas: true })
  assert.equal(hook.loading.value, true)
  assert.equal(saved.values.size, 0)
  releaseMap()
  await tick()
  assert.equal(hook.loading.value, false)
  assert.equal(hook.dashboard.value.canvas.gridLayout.colNum, 24)
  assert.equal(hook.dashboard.value.components.at(-1).componentProps.gridItem.w, 24)
  assert.equal(hook.storageKey.value, undefined)
  assert.equal(saved.values.size, 0)
})

test('the existing canvas saves and restores map movement and size using the new scoped key', async t => {
  const { api, hook, saved } = await fixture(t)
  const scope = vue.effectScope()
  t.after(() => scope.stop())
  const options = {
    value: () => hook.dashboard.value, catalog: () => hook.catalog.value,
    editable: () => false, layoutEditable: () => true, storageKey: () => hook.storageKey.value,
    onChange: () => assert.fail('Layout-only edits must not change business configuration'),
  }
  const state = scope.run(() => api.useDashboardState(options))
  const layout = api.toGridLayout(state.value.value.components, 24).map(item => item.i === 'deviceMapCard'
    ? { ...item, x: 2, w: 20, h: 14 } : item)
  state.updateLayout(layout)
  assert.equal(JSON.parse(saved.getItem(hook.storageKey.value)).at(-1).x, 2)
  const restored = scope.run(() => api.useDashboardState(options))
  const map = restored.value.value.components.at(-1)
  assert.deepEqual([map.componentProps.gridItem.x, map.componentProps.gridItem.w, map.componentProps.gridItem.h], [2, 20, 14])
  assert.deepEqual(map.componentProps.deviceMapCard, { topTitle: '', isAutoRefresh: true, interval: 60 })
})

const profile = (overrides = {}) => ({ scope: 'user-a/project-a', saas: false, mode: 'wide', capabilities: { collection: false, networkCards: false }, widgets: ['QuickStart', 'MessageTrend'], ...overrides })
const previous = [{ i: 'resourceCenterQuickStart', x: 0, y: 7, w: 6, h: 9 }, { i: 'resourceCenterMessageTrend', x: 6, y: 0, w: 6, h: 11 }]
const mapGrid = { x: 0, y: 0, w: 24, h: 16, minH: 14 }

test('migration keeps every old coordinate and appends the map below saved geometry in every width mode', async t => {
  const { api } = await fixture(t, { available: false })
  for (const saas of [false, true]) for (const mode of ['wide', 'medium', 'compact']) {
    const saved = storage(), oldProfile = profile({ saas, mode }), nextProfile = { ...oldProfile, deviceMap: true }
    const oldKey = api.resourceLayoutStorageKey(oldProfile), key = api.resourceLayoutStorageKey(nextProfile)
    saved.setItem(oldKey, JSON.stringify(previous))
    api.migrateResourceLayout(saved, key, [...previous.map(item => item.i), 'deviceMapCard'], nextProfile, mapGrid)
    const migrated = JSON.parse(saved.getItem(key))
    assert.deepEqual(migrated.slice(0, -1), previous)
    assert.deepEqual(migrated.at(-1), { i: 'deviceMapCard', x: 0, y: 16, w: saas ? 12 : 24, h: 16 })
    assert.deepEqual(JSON.parse(saved.getItem(oldKey)), previous)
    saved.setItem(key, 'existing-personal-layout')
    api.migrateResourceLayout(saved, key, [...previous.map(item => item.i), 'deviceMapCard'], nextProfile, mapGrid)
    assert.equal(saved.getItem(key), 'existing-personal-layout')
  }
})

test('migration rejects incomplete, duplicate, malformed and out-of-grid records and other account scopes', async t => {
  const { api } = await fixture(t, { available: false })
  const oldProfile = profile(), nextProfile = { ...oldProfile, deviceMap: true }
  const oldKey = api.resourceLayoutStorageKey(oldProfile), key = api.resourceLayoutStorageKey(nextProfile)
  const ids = [...previous.map(item => item.i), 'deviceMapCard']
  for (const value of ['bad json', JSON.stringify(previous.slice(1)), JSON.stringify([previous[0], previous[0]]),
    ...[{ w: 0 }, { x: -1 }, { y: 0.5 }, { w: 25 }, { i: 'removed-card' }].map(change => JSON.stringify([{ ...previous[0], ...change }, previous[1]]))]) {
    const saved = storage()
    saved.setItem(oldKey, value)
    api.migrateResourceLayout(saved, key, ids, nextProfile, mapGrid)
    assert.equal(saved.getItem(key), null)
    assert.equal(saved.getItem(oldKey), value)
  }
  const saved = storage()
  saved.setItem(api.resourceLayoutStorageKey(profile({ scope: 'user-b/project-a' })), JSON.stringify(previous))
  api.migrateResourceLayout(saved, key, ids, nextProfile, mapGrid)
  assert.equal(saved.getItem(key), null)
})

test('SaaS keeps its existing v5 migration before adding the map without changing legacy records', async t => {
  const { api } = await fixture(t, { available: false })
  const saved = storage(), nextProfile = profile({ saas: true, deviceMap: true })
  const key = api.resourceLayoutStorageKey(nextProfile)
  saved.setItem('resource-center-dashboard-v5', JSON.stringify(previous))
  api.migrateResourceLayout(saved, key, [...previous.map(item => item.i), 'deviceMapCard'], nextProfile, mapGrid)
  assert.deepEqual(JSON.parse(saved.getItem(key)).slice(0, -1), previous)
  assert.equal(JSON.parse(saved.getItem(key)).at(-1).w, 12)
  assert.deepEqual(JSON.parse(saved.getItem('resource-center-dashboard-v5')), previous)
})

test('the SaaS default canvas matches the requested ten widget positions', async t => {
  const { hook } = await fixture(t, { saas: true })
  const layout = hook.dashboard.value.components.map(item => {
    const { x, y, w, h } = item.componentProps.gridItem
    return { i: item.id, x, y, w, h }
  })
  assert.deepEqual(layout.sort((a, b) => a.i.localeCompare(b.i)), [
    { i: 'resourceCenterEdgeNodes', x: 0, y: 0, w: 3, h: 4 },
    { i: 'resourceCenterIotDevices', x: 3, y: 0, w: 3, h: 4 },
    { i: 'resourceCenterVideoDevices', x: 6, y: 0, w: 3, h: 4 },
    { i: 'resourceCenterVisualization', x: 9, y: 0, w: 3, h: 4 },
    { i: 'resourceCenterQuickStart', x: 0, y: 4, w: 6, h: 9 },
    { i: 'resourceCenterMessageTrend', x: 6, y: 4, w: 6, h: 9 },
    { i: 'resourceCenterAlgorithmCoverage', x: 0, y: 22, w: 6, h: 9 },
    { i: 'resourceCenterVideoPlaybackTrend', x: 0, y: 13, w: 6, h: 9 },
    { i: 'resourceCenterVisionTaskRanking', x: 6, y: 13, w: 6, h: 9 },
    { i: 'resourceCenterDeviceDistribution', x: 6, y: 22, w: 6, h: 9 },
    { i: 'deviceMapCard', x: 0, y: 31, w: 12, h: 16 },
  ].sort((a, b) => a.i.localeCompare(b.i)))
})

test('short storage keys stay fixed-length and isolate scopes, deployments, widths and final widget sets', async t => {
  const { api } = await fixture(t, { available: false })
  const scoped = profile({ scope: JSON.stringify(['account'.repeat(80), 'project'.repeat(80), '/api/runtime/project-a']) })
  const key = api.resourceLayoutStorageKey(scoped)
  assert.match(key, /^resource-dashboard:v8:[a-f0-9]{32}$/)
  assert.equal(key.length, 54)
  assert.equal(key, api.resourceLayoutStorageKey({ ...scoped, widgets: ['MessageTrend', 'QuickStart', 'MessageTrend'] }))
  const variants = [
    scoped, { ...scoped, scope: 'user-b/project-a' }, { ...scoped, scope: 'user-a/project-b' },
    { ...scoped, scope: scoped.scope + '/other-api' }, { ...scoped, saas: true },
    { ...scoped, mode: 'medium' }, { ...scoped, mode: 'compact' },
    { ...scoped, widgets: ['QuickStart'] }, { ...scoped, deviceMap: true },
  ]
  assert.equal(new Set(variants.map(api.resourceLayoutStorageKey)).size, variants.length)
})

const legacyScopedKey = profile => {
  const widgets = [...new Set([...profile.widgets, ...(profile.deviceMap ? ['deviceMapCard'] : [])])].sort().join(',')
  return `resource-center-dashboard-${profile.saas ? 'v6' : 'v7'}:${encodeURIComponent(profile.scope)}:${profile.saas ? 'saas' : 'private'}:${profile.mode}:${widgets}`
}

test('same-scope v6/v7 long keys migrate to short keys without losing personal geometry or replacing newer layouts', async t => {
  const { api } = await fixture(t, { available: false })
  for (const saas of [false, true]) for (const mode of ['wide', 'medium', 'compact']) for (const deviceMap of [false, true]) {
    const current = profile({ saas, mode, deviceMap })
    const layout = deviceMap ? [...previous, { i: 'deviceMapCard', x: 0, y: 16, w: saas ? 12 : 24, h: 16 }] : previous
    const saved = storage(), legacy = legacyScopedKey(current), key = api.resourceLayoutStorageKey(current)
    const original = JSON.stringify(layout)
    saved.setItem(legacy, original)
    api.migrateResourceLayout(saved, key, layout.map(item => item.i), current, mapGrid)
    assert.deepEqual(JSON.parse(saved.getItem(key)), layout)
    assert.equal(saved.getItem(legacy), original)
    saved.setItem(key, 'newer-personal-layout')
    api.migrateResourceLayout(saved, key, layout.map(item => item.i), current, mapGrid)
    assert.equal(saved.getItem(key), 'newer-personal-layout')
  }
})

test('adding the map can upgrade a matching pre-map long key and preserve all old coordinates', async t => {
  const { api } = await fixture(t, { available: false })
  for (const saas of [false, true]) {
    const current = profile({ saas, deviceMap: true }), before = { ...current, deviceMap: false }
    const saved = storage(), legacy = legacyScopedKey(before), key = api.resourceLayoutStorageKey(current)
    saved.setItem(legacy, JSON.stringify(previous))
    api.migrateResourceLayout(saved, key, [...previous.map(item => item.i), 'deviceMapCard'], current, mapGrid)
    assert.deepEqual(JSON.parse(saved.getItem(key)), [
      ...previous, { i: 'deviceMapCard', x: 0, y: 16, w: saas ? 12 : 24, h: 16 },
    ])
    assert.deepEqual(JSON.parse(saved.getItem(legacy)), previous)
  }
})

test('long-key migration rejects invalid geometry and never reads another account or project scope', async t => {
  const { api } = await fixture(t, { available: false })
  const current = profile(), legacy = legacyScopedKey(current), key = api.resourceLayoutStorageKey(current)
  for (const value of ['bad json', JSON.stringify(previous.slice(1)), JSON.stringify([previous[0], previous[0]]),
    ...[{ w: 0 }, { h: -1 }, { x: -1 }, { y: 0.5 }, { w: 25 }, { i: 'removed-card' }].map(change => JSON.stringify([{ ...previous[0], ...change }, previous[1]]))]) {
    const saved = storage()
    saved.setItem(legacy, value)
    api.migrateResourceLayout(saved, key, previous.map(item => item.i), current)
    assert.equal(saved.getItem(key), null)
    assert.equal(saved.getItem(legacy), value)
  }
  for (const scope of ['user-b/project-a', 'user-a/project-b']) {
    const saved = storage(), otherKey = legacyScopedKey({ ...current, scope })
    saved.setItem(otherKey, JSON.stringify(previous))
    api.migrateResourceLayout(saved, key, previous.map(item => item.i), current)
    assert.equal(saved.getItem(key), null)
    assert.deepEqual(JSON.parse(saved.getItem(otherKey)), previous)
  }
})


test('v8 map layout preserves all coordinates and appends the ranking across scopes and widths', async t => {
  const { api } = await fixture(t, { available: false })
  for (const saas of [false, true]) for (const mode of ['wide', 'medium', 'compact']) {
    const before = profile({ saas, mode, deviceMap: true })
    const after = { ...before, widgets: [...before.widgets, 'VisionTaskRanking'] }
    const map = { i: 'deviceMapCard', x: 1, y: 20, w: saas ? 10 : 20, h: 16 }
    const old = [...previous, map], saved = storage()
    const oldKey = api.resourceLayoutStorageKey(before), key = api.resourceLayoutStorageKey(after)
    saved.setItem(oldKey, JSON.stringify(old))
    api.migrateResourceLayout(saved, key, [...old.map(item => item.i), 'resourceCenterVisionTaskRanking'], after, mapGrid, { w: 12, h: 14 })
    assert.deepEqual(JSON.parse(saved.getItem(key)), [...old, { i: 'resourceCenterVisionTaskRanking', x: 0, y: 36, w: saas ? 12 : 24, h: 14 }])
    assert.deepEqual(JSON.parse(saved.getItem(oldKey)), old)
  }
})
