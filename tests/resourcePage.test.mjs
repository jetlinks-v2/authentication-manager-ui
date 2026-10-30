import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'

const require = createRequire(import.meta.url)
const { build } = require('esbuild')
const dayjs = require('dayjs')
const root = fileURLToPath(new URL('../', import.meta.url))
const page = path.join(root, 'views/resources/Dashboard')
const trend = path.join(root, 'visDashboard/ResourceCenter/services/trends.ts')
const bundled = await build({
  stdin: { contents: `export * from ${JSON.stringify(path.join(page, 'resourcePageLayout.ts'))}; export * from ${JSON.stringify(path.join(page, 'resourcePageCanvas.ts'))};
    export * from ${JSON.stringify(path.join(page, 'services/resourcePageAccess.ts'))};
    export { rangeOf, loadMessageTrend } from ${JSON.stringify(trend)}`,
    resolveDir: root, loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  define: { 'import.meta.env.VITE_APP_ENVIRONMENT': JSON.stringify('') },
  plugins: [{ name: 'request-fixture', setup(api) {
    api.onResolve({ filter: /^@jetlinks-web\/core$/ }, () => ({ path: 'request', namespace: 'fixture' }))
    api.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const request = context.request', loader: 'js' }))
  } }],
})
const context = { request: { post: async (...args) => { context.calls.push(args); return { success: true, result: context.rows } } }, calls: [], rows: [] }
const module = { exports: {} }
Function('module', 'exports', 'require', 'context', bundled.outputFiles[0].text)(module, module.exports, require, context)
const { resolveResourcePageAccess: resolve, buildResourcePageLayout: layout, rangeOf, loadMessageTrend } = module.exports
const granted = codes => [{ code: 'root', children: codes.map(code => ({ code })) }]
const menus = ['iot-user-device-list', 'video/resources', 'algorithm-center', 'visualization/project', 'device/Product', 'data-collect', 'iot-card/CardManagement']
const modules = ['device-manager-ui', 'jetlinks-media-ui', 'edge-master-ui', 'jetlinks-ai-ui', 'visualization-manager-ui', 'data-collector-ui', 'network-card-manager-ui']
const access = (saas, codes = menus, installed = modules) => resolve({ saas, menus: granted(codes), installed: name => installed.includes(name) })
const ids = value => layout(value).flatMap(cell => cell.panels)
const assertFullRows = cells => {
  let row = 0
  for (const cell of cells) {
    row += cell.span
    assert.ok(row <= 6, `row overflow at ${cell.id}`)
    if (row === 6) row = 0
  }
  assert.equal(row, 0, 'last row must fill available width')
}

test('SaaS excludes private-only capabilities even when menus and modules exist', () => {
  const value = access(true)
  assert.equal(value.networkCards, false)
  assert.equal(value.collection, false)
  assert.equal(value.product, false)
  assert.ok(!ids(value).some(id => ['traffic', 'pools', 'points', 'protocols'].includes(id)))
  assertFullRows(layout(value))
})

test('only installed and granted capabilities appear, and removal changes the page', () => {
  const value = access(false, ['iot-user-device-list'], ['device-manager-ui'])
  assert.deepEqual([value.iot, value.video, value.edge, value.vision, value.map], [true, false, false, false, true])
  assert.deepEqual(ids(value), ['message', 'online', 'map'])
  assert.deepEqual(layout(value).find(cell => cell.id === 'map'), { id: 'map', panels: ['map'], span: 6, offline: true })
  assertFullRows(layout(value))
  const revoked = access(false, [], ['device-manager-ui', 'jetlinks-media-ui', 'edge-master-ui'])
  assert.deepEqual(ids(revoked), [])
  const absent = access(false, menus, [])
  assert.deepEqual(ids(absent), [])
})

test('full and partial private profiles pack without horizontal gaps', () => {
  for (const installed of [modules, ['device-manager-ui', 'edge-master-ui'], ['device-manager-ui', 'data-collector-ui'], ['device-manager-ui', 'network-card-manager-ui']]) {
    assertFullRows(layout(access(false, menus, installed)))
  }
})

test('message ranges use local natural boundaries and only completed or current buckets', async () => {
  const now = dayjs('2026-10-30T10:25:00')
  const window = rangeOf('3d', now)
  assert.equal(window.time, '1h')
  assert.equal(dayjs(window.from).format('YYYY-MM-DD HH:mm'), '2026-10-28 00:00')
  assert.equal(window.to, now.valueOf())
  context.calls = []
  context.rows = [{ data: { timeString: '2026-10-30 09:00:00', value: 4 } }, { data: { timeString: '2026-10-30 09:00:00', value: 3 } }, { data: { timeString: '2026-10-30 11:00:00', value: 99 } }]
  const rows = await loadMessageTrend('3d', now)
  assert.equal(rows.length, 59)
  assert.deepEqual(rows.at(-2), { time: '2026-10-30 09:00:00', value: 7 })
  assert.deepEqual(rows.at(-1), { time: '2026-10-30 10:00:00', value: 0 })
  assert.equal(context.calls[0][1][0].params.time, '1h')
  assert.equal((await loadMessageTrend('yesterday', now)).length, 24)
  assert.equal((await loadMessageTrend('7d', now)).length, 7)
})


test('canvas defaults do not overlap for SaaS capability combinations and width modes', () => {
  for (const width of [360, 600, 800, 1000, 1400]) for (const mask of Array.from({length:32},(_,i)=>i)) {
    const base = access(true)
    const value = {...base, iot:!!(mask&1), map:!!(mask&1), video:!!(mask&2), edge:!!(mask&4), vision:!!(mask&8), visualization:!!(mask&16)}
    const summaries = [value.edge&&'edge',value.iot&&'iot',value.video&&'video',value.visualization&&'visualization'].filter(Boolean)
    const widgets=module.exports.buildResourcePageWidgets(summaries, layout(value), width, 2)
    for (const [i,a] of widgets.entries()) for(const b of widgets.slice(i+1)) {
      const x=a.gridItem,y=b.gridItem
      assert.ok(x.x+x.w<=y.x || y.x+y.w<=x.x || x.y+x.h<=y.y || y.y+y.h<=x.y, `overlap ${a.id}/${b.id} width ${width} mask ${mask}`)
    }
  }
})

test('few node default height adapts without changing canvas width mode', () => {
  const cells=layout(access(true))
  const height=n=>module.exports.buildResourcePageWidgets(['edge','iot','video','visualization'],cells,1400,n).find(item=>item.id==='resource-panel-gateway').gridItem.h
  assert.deepEqual([height(1),height(2),height(3),height(4)],[12,13,16,20])
  assert.equal(module.exports.resourcePageCanvasMode(1400),module.exports.resourcePageCanvasMode(1500))
  assert.notEqual(module.exports.resourcePageCanvasMode(1400),module.exports.resourcePageCanvasMode(600))
})
