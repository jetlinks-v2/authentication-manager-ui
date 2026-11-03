import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
const require = createRequire(import.meta.url)
const { build } = require('esbuild')
const { outputFiles } = await build({ entryPoints: [fileURLToPath(new URL('../views/project/Overview/private/layout.ts', import.meta.url))], bundle: true, write: false, platform: 'node', format: 'cjs' })
const mod = { exports: {} }
Function('module', 'exports', 'require', outputFiles[0].text)(mod, mod.exports, require)
const { buildPrivateOverviewLayout, privateOverviewLayoutStorageKey } = mod.exports
const fields = ['product', 'iot', 'video', 'screen', 'message', 'ai', 'applications', 'runtime', 'iotAlarm', 'videoAlarm']

test('all permission combinations and breakpoints produce unique, bounded, non-overlapping widgets', () => {
  for (let mask = 0; mask < 2 ** fields.length; mask++) {
    const access = Object.fromEntries(fields.map((field, i) => [field, Boolean(mask & (1 << i))]))
    for (const width of [375, 559, 560, 800, 1039, 1040, 1199, 1200, 1512]) for (const showAccess of [false, true]) {
      const widgets = buildPrivateOverviewLayout(access, showAccess, width)
      assert.equal(new Set(widgets.map(item => item.id)).size, widgets.length)
      for (const [index, item] of widgets.entries()) {
        const a = item.gridItem
        assert.ok(a.x >= 0 && a.y >= 0 && a.w > 0 && a.h > 0 && a.x + a.w <= 24, `${mask}/${width}/${item.id}`)
        assert.ok(a.w >= a.minW && a.h >= a.minH, `${mask}/${width}/${item.id} minimum`)
        for (const other of widgets.slice(index + 1)) {
          const b = other.gridItem
          assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, `${mask}/${width}/${item.id} overlaps ${other.id}`)
        }
      }
    }
  }
})

test('KPI identities are independent and storage keys isolate scope, breakpoint and widget set', () => {
  const access = Object.fromEntries(fields.map(field => [field, true]))
  const full = buildPrivateOverviewLayout(access, true, 1512)
  assert.deepEqual(full.filter(item => item.panel === 'kpi').map(item => item.metricId), ['devices', 'video', 'screen', 'message', 'ai'])
  const key = privateOverviewLayoutStorageKey('account-a', 1512, full)
  assert.equal(key, privateOverviewLayoutStorageKey('account-a', 1400, full))
  assert.notEqual(key, privateOverviewLayoutStorageKey('account-b', 1512, full))
  assert.notEqual(key, privateOverviewLayoutStorageKey('account-a', 900, full))
  assert.notEqual(key, privateOverviewLayoutStorageKey('account-a', 1512, full.slice(1)))
})

test('visibility respects permissions, guide state and product/video contract', () => {
  const none = Object.fromEntries(fields.map(field => [field, false]))
  assert.deepEqual(buildPrivateOverviewLayout(none, false, 1512), [])
  const iot = { ...none, iot: true }
  const hidden = buildPrivateOverviewLayout(iot, false, 1512)
  const shown = buildPrivateOverviewLayout(iot, true, 1512)
  assert.deepEqual(hidden.map(item => item.id), ['private-overview-devices', 'private-overview-assets'])
  assert.deepEqual(shown.filter(item => item.panel !== 'access').map(item => item.id), hidden.map(item => item.id))
  assert.equal(shown.filter(item => item.panel === 'access').length, 1)
  assert.ok(buildPrivateOverviewLayout({ ...none, product: true }, false, 1512).some(item => item.metricId === 'product'))
  assert.ok(!buildPrivateOverviewLayout({ ...none, product: true, video: true }, false, 1512).some(item => item.metricId === 'product'))
})
