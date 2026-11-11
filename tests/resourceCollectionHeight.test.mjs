import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'
const require = createRequire(import.meta.url), { build } = require('esbuild')
const root = fileURLToPath(new URL('../', import.meta.url))
const base = path.join(root, 'views/resources/Dashboard')
const result = await build({ stdin: { contents: `export * from ${JSON.stringify(path.join(base, 'resourcePageCanvas.ts'))};export * from ${JSON.stringify(path.join(base, 'resourcePageLayout.ts'))}`, resolveDir: root, loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external' })
const mod = { exports: {} }; Function('module', 'exports', 'require', result.outputFiles[0].text)(mod, mod.exports, require)
const { buildResourcePageLayout: layout, buildResourcePageWidgets: widgets } = mod.exports
const baseAccess = { saas: false, iot: false, video: false, edge: false, vision: false, visualization: false, product: false, collection: true, networkCards: false, networkPools: false, map: false }
const byKind = (items, kind) => items.find(item => item.kind === kind).gridItem

test('private collection only uses three 10-row cards in one desktop row or separate narrow rows', () => {
  for (const width of [360, 600, 800, 1440]) {
    const result = widgets(['collection'], layout(baseAccess, 2), width, 2, { private: true })
    assert.deepEqual(result.map(item => item.gridItem.h), [10, 10, 10])
    assert.deepEqual(result.map(item => item.gridItem.y), width < 900 ? [0, 10, 20] : [0, 0, 0])
    assert.deepEqual(result.map(item => item.gridItem.w), width < 900 ? [24, 24, 24] : [8, 8, 8])
  }
})

test('independent private collection panels are 10 rows while neighboring trend and summary retain their height', () => {
  const access = { ...baseAccess, iot: true, map: true, product: true }
  const result = widgets(['product', 'iot', 'collection'], layout(access, 2), 1440, 2, { private: true })
  assert.equal(byKind(result, 'points').h, 10)
  assert.equal(byKind(result, 'protocols').h, 10)
  assert.equal(byKind(result, 'message').h, 17)
  assert.equal(byKind(result, 'map').h, 17)
  assert.equal(byKind(result, 'summary').h, 7)
})

test('stacked collection remains paired with the gateway ranking rather than forced to 10', () => {
  const access = { ...baseAccess, edge: true }
  const result = widgets(['edge', 'collection'], layout(access, 8), 1440, 8, { private: true })
  const gateway = byKind(result, 'gateway'), points = byKind(result, 'points'), protocols = byKind(result, 'protocols')
  assert.equal(gateway.h, 20)
  assert.equal(points.h + protocols.h, gateway.h)
  assert.equal(points.y, gateway.y)
  assert.equal(protocols.y, points.y + points.h)
  const small = widgets(['edge', 'collection'], layout(access, 2), 1440, 2, { private: true })
  assert.equal(byKind(small, 'gateway').h, 13)
  assert.equal(byKind(small, 'points').h + byKind(small, 'protocols').h, 14)
})

test('SaaS collection cells retain their existing height', () => {
  const cells = [{ id: 'points', panels: ['points'], span: 3 }, { id: 'protocols', panels: ['protocols'], span: 3 }]
  const result = widgets([], cells, 1440, 8)
  assert.equal(byKind(result, 'points').h, 17)
  assert.equal(byKind(result, 'protocols').h, 17)
})
