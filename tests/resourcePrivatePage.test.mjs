import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'

const require = createRequire(import.meta.url)
const { build } = require('esbuild')
const root = fileURLToPath(new URL('../', import.meta.url))
const page = path.join(root, 'views/resources/Dashboard')
const compiled = await build({
  stdin: { contents: `export * from ${JSON.stringify(path.join(page, 'resourcePageLayout.ts'))};
    export * from ${JSON.stringify(path.join(page, 'resourcePageCanvas.ts'))};
    export * from ${JSON.stringify(path.join(page, 'services/resourcePageAccess.ts'))};
    export * from ${JSON.stringify(path.join(page, 'services/resourceSummary.ts'))}`, resolveDir: root, loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  define: { 'import.meta.env': '{}' },
  plugins: [{ name: 'boundaries', setup(api) {
    const stubs = {
      '@jetlinks-web/core': 'export const request={post:async (...args)=>{context.calls.push(args);return {success:true,result:5}}}',
      '@jetlinks-web-core/locales': 'export default {global:{t:key=>key}}',
      '@jetlinks-web-core/store/menu': 'export const useMenuStore=()=>({initialized:true,loading:false,menuResultCache:[]})',
      '@jetlinks-web-core/utils/module-registry': 'export const moduleRegistry={hasModule:()=>true}',
      '@jetlinks-web-core/utils/deployment': 'export const isPrivateDeployment=()=>true',
      '../../useDashboardModules': 'export const getDashboardModules=()=>({})',
    }
    api.onResolve({ filter: /.*/ }, args => stubs[args.path] ? { path: args.path, namespace: 'stub' } : undefined)
    api.onLoad({ filter: /.*/, namespace: 'stub' }, args => ({ contents: stubs[args.path], loader: 'js' }))
  } }],
})
const mod = { exports: {} }
const context = { calls: [] }
Function('module', 'exports', 'require', 'context', compiled.outputFiles[0].text)(mod, mod.exports, require, context)
const { resolveResourcePageAccess: resolve, buildResourcePageLayout: layout, buildResourcePageWidgets: widgets, getResourceSummaryKinds: kinds, createResourceSummaryCards, loadResourceSummary } = mod.exports
const allMenus = ['iot-user-device-list', 'video/resources', 'algorithm-center', 'video/event', 'visualization/project', 'device/Product', 'data-collect', 'iot-card/CardManagement', 'iot-card/TrafficPoolManagement']
const baseModules = ['device-manager-ui', 'jetlinks-ai-ui', 'visualization-manager-ui']
const optionalModules = ['jetlinks-media-ui', 'edge-master-ui', 'network-card-manager-ui', 'data-collector-ui']
const access = (menus, installed) => resolve({ saas: false, menus: [{ code: 'root', children: menus.map(code => ({ code })) }], installed: name => installed.includes(name) })
const panels = cells => cells.flatMap(cell => cell.panels)
const ids = cells => cells.map(cell => cell.id)
const rect = widget => widget.gridItem
const nonOverlapping = list => {
  for (const [i, a] of list.entries()) for (const b of list.slice(i + 1)) {
    const x = rect(a), y = rect(b)
    assert.ok(x.x + x.w <= y.x || y.x + y.w <= x.x || x.y + x.h <= y.y || y.y + y.h <= x.y, `${a.id} overlaps ${b.id}`)
  }
}

test('all 16 private module combinations respect installed and granted capabilities', () => {
  for (let mask = 0; mask < 16; mask++) {
    const installed = [...baseModules, ...optionalModules.filter((_, i) => mask & (1 << i))]
    const value = access(allMenus, installed)
    const cells = layout(value, 8), summary = kinds(value), found = panels(cells)
    assert.equal(value.video, !!(mask & 1), `video mask ${mask}`)
    assert.equal(value.edge, !!(mask & 2), `edge mask ${mask}`)
    assert.equal(value.networkCards, !!(mask & 4), `card mask ${mask}`)
    assert.equal(value.networkPools, !!(mask & 4), `pool mask ${mask}`)
    assert.equal(value.collection, !!(mask & 8), `collection mask ${mask}`)
    for (const [enabled, summaryId, panelId] of [
      [value.edge, 'edge', 'gateway'], [value.networkCards, 'networkCards', 'traffic'],
      [value.collection, 'collection', 'points'],
    ]) {
      assert.equal(summary.includes(summaryId), enabled, `${summaryId} mask ${mask}`)
      assert.equal(found.includes(panelId), enabled, `${panelId} mask ${mask}`)
    }
    assert.equal(summary.includes('video'), value.video)
    assert.equal(found.includes('vision'), value.vision)
    assert.equal(found.includes('pools'), value.networkPools)
    const rendered = widgets(summary, cells, 1440, 8, { private: true })
    nonOverlapping(rendered)
    assert.ok(rendered.every(item => rect(item).x >= 0 && rect(item).x + rect(item).w <= 24))
  }
})

test('seven authorization profiles across every optional installation and canvas width stay scoped and non-overlapping', () => {
  const roles = [
    allMenus,
    ['iot-user-device-list', 'device/Product'],
    ['video/resources', 'video/event'],
    ['iot-user-device-list', 'device/Product'],
    ['data-collect'],
    ['application-center/ProjectApplication'],
    [],
  ]
  for (const [role, menus] of roles.entries()) for (let mask = 0; mask < 16; mask++) {
    const value = access(menus, [...baseModules, ...optionalModules.filter((_, i) => mask & (1 << i))])
    for (const width of [360, 600, 800, 1000, 1440]) for (const count of [0, 2, 8]) {
      const rendered = widgets(kinds(value), layout(value, count), width, count, { private: true })
      const label = `role ${role}, mask ${mask}, width ${width}, nodes ${count}`
      assert.equal(new Set(rendered.map(item => item.id)).size, rendered.length, label)
      assert.ok(rendered.every(item => rect(item).x >= 0 && rect(item).x + rect(item).w <= 24), label)
      nonOverlapping(rendered)
      assert.equal(rendered.some(item => item.summaryId === 'video'), value.video, label)
      assert.equal(rendered.some(item => item.kind === 'vision'), value.vision, label)
      assert.equal(rendered.some(item => item.kind === 'traffic'), value.networkCards, label)
      assert.equal(rendered.some(item => item.kind === 'pools'), value.networkPools, label)
      assert.equal(rendered.some(item => item.kind === 'points'), value.collection, label)
    }
  }
})

test('card and traffic pool require separate menu grants and fill their own row', () => {
  const installed = ['network-card-manager-ui']
  const card = access(['iot-card/CardManagement'], installed)
  assert.equal(card.networkCards, true)
  assert.equal(card.networkPools, false)
  assert.deepEqual(layout(card, 0), [{ id: 'traffic', panels: ['traffic'], span: 6 }])
  assert.deepEqual(kinds(card), ['networkCards'])
  const pool = access(['iot-card/TrafficPoolManagement'], installed)
  assert.equal(pool.networkCards, false)
  assert.equal(pool.networkPools, true)
  assert.deepEqual(layout(pool, 0), [{ id: 'pools', panels: ['pools'], span: 6 }])
  assert.deepEqual(kinds(pool), [])
  for (const menus of [['iot-card/CardManagement'], ['iot-card/TrafficPoolManagement']]) {
    const absent = access(menus, [])
    assert.deepEqual(layout(absent, 0), [])
  }
})

test('menu-granted role profiles produce only their authorized summaries and panels', () => {
  const installed = [...baseModules, ...optionalModules]
  // These labels describe menu fixtures; production capability decisions never use role names.
  const fixtures = [
    ['ops', ['iot-user-device-list', 'device/Product'], ['product', 'iot', 'message'], ['message', 'online', 'map']],
    ['device', ['iot-user-device-list', 'device/Product'], ['product', 'iot', 'message'], ['message', 'online', 'map']],
    ['video', ['video/resources', 'video/event'], ['video', 'aiEvents'], ['map']],
    ['collect', ['data-collect'], ['collection'], ['points', 'protocols']],
    ['app', ['application-center/ProjectApplication'], [], []],
    ['none', [], [], []],
  ]
  for (const [name, menus, expectedSummary, expectedPanels] of fixtures) {
    // Gateway and IoT share their menu code; use an unavailable edge module to
    // represent the prototype's device-only capability without inventing a role permission.
    const value = access(menus, ['ops', 'device'].includes(name) ? installed.filter(item => item !== 'edge-master-ui') : installed)
    assert.deepEqual(kinds(value), expectedSummary, `${name} summaries`)
    assert.deepEqual(panels(layout(value, 2)), expectedPanels, `${name} panels`)
  }
  const admin = access(allMenus, installed)
  assert.deepEqual(kinds(admin), ['edge', 'iot', 'video', 'networkCards', 'collection', 'visualization'])
})

test('revoked menus and absent modules cannot be restored by static routes or installed peers', () => {
  const installed = [...baseModules, ...optionalModules]
  const hiddenRoutes = access(['video/Device/detail', 'device/detail', 'algorithm-center/detail'], installed)
  assert.deepEqual(kinds(hiddenRoutes), [])
  assert.deepEqual(layout(hiddenRoutes, 8), [])
  const absent = access(allMenus, [])
  assert.deepEqual(kinds(absent), [])
  assert.deepEqual(layout(absent, 8), [])
})

test('collection-only summary loading calls only the authorized collection endpoint', async () => {
  const value = access(['data-collect'], ['data-collector-ui'])
  context.calls = []
  const cards = createResourceSummaryCards(value)
  await Promise.all(cards.map(card => loadResourceSummary(card, value)))
  assert.deepEqual(cards.map(card => card.id), ['collection'])
  assert.ok(context.calls.length > 0)
  assert.ok(context.calls.every(([url]) => url === '/data-collect/channel/_count'))
  context.calls = []
  const empty = access([], [...baseModules, ...optionalModules])
  await Promise.all(createResourceSummaryCards(empty).map(card => loadResourceSummary(card, empty)))
  assert.deepEqual(context.calls, [])
})

test('few nodes pair with online trend when collection is available without vision', () => {
  const value = access(['iot-user-device-list', 'data-collect'], ['device-manager-ui', 'edge-master-ui', 'data-collector-ui'])
  const few = layout(value, 3), many = layout(value, 4)
  assert.deepEqual(ids(few), ['message', 'map', 'gateway', 'online', 'points', 'protocols'])
  assert.deepEqual(ids(many), ['message', 'map', 'gateway', 'collection'])
  assert.deepEqual(many.at(-1).panels, ['points', 'protocols'])
  for (const cells of [few, many]) nonOverlapping(widgets(kinds(value), cells, 1440, cells === few ? 3 : 4, { private: true }))
})

test('video only has a full-width distribution with offline devices', () => {
  const value = access(['video/resources'], ['jetlinks-media-ui'])
  assert.deepEqual(layout(value, 0), [{ id: 'map', panels: ['map'], span: 6, offline: true }])
  const rendered = widgets(kinds(value), layout(value, 0), 1440, 0, { private: true })
  const distribution = rendered.filter(item => item.kind === 'distribution')
  assert.equal(distribution.length, 1)
  assert.equal(distribution[0].id, 'resource-panel-distribution')
  assert.equal(rendered.some(item => item.kind === 'map' || item.kind === 'offline'), false)
  assert.equal(rect(distribution[0]).w, 24)
  for (const width of [360, 600, 800, 1440]) {
    const item = widgets(kinds(value), layout(value, 0), width, 0, { private: true }).find(item => item.kind === 'distribution')
    assert.equal(item.gridItem.h, width < 760 ? 36 : 18)
  }
  nonOverlapping(rendered)
})

test('private desktop uses one row for six summaries and joins collection-only cards', () => {
  const admin = access(allMenus, [...baseModules, ...optionalModules])
  const six = widgets(kinds(admin), layout(admin, 8), 1440, 8, { private: true }).filter(item => item.kind === 'summary')
  assert.equal(six.length, 6)
  assert.equal(new Set(six.map(item => rect(item).y)).size, 1)
  assert.deepEqual(six.map(item => rect(item).w), [4, 4, 4, 4, 4, 4])
  const collect = access(['data-collect'], ['data-collector-ui'])
  const three = widgets(kinds(collect), layout(collect, 0), 1440, 0, { private: true })
  assert.deepEqual(three.map(item => item.kind), ['summary', 'points', 'protocols'])
  assert.deepEqual(three.map(item => rect(item).w), [8, 8, 8])
  assert.equal(new Set(three.map(item => rect(item).y)).size, 1)
  nonOverlapping(three)
})
