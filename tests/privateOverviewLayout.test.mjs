import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
const require = createRequire(import.meta.url)
const { build } = require('esbuild')
const vue = require('vue')
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
  assert.deepEqual(buildPrivateOverviewLayout(none, false, 1512).map(item => item.id), ['private-overview-recent'])
  const iot = { ...none, iot: true }
  const hidden = buildPrivateOverviewLayout(iot, false, 1512)
  const shown = buildPrivateOverviewLayout(iot, true, 1512)
  assert.deepEqual(hidden.map(item => item.id), ['private-overview-recent', 'private-overview-assets'])
  assert.deepEqual(shown.filter(item => item.panel !== 'access').map(item => item.id), hidden.map(item => item.id))
  assert.equal(shown.filter(item => item.panel === 'access').length, 1)
  assert.ok(buildPrivateOverviewLayout({ ...none, product: true }, false, 1512, true, true, false).some(item => item.metricId === 'product'))
  assert.ok(!buildPrivateOverviewLayout({ ...none, product: true, video: true }, false, 1512, true, true, false).some(item => item.metricId === 'product'))
})


test('large-mode cached geometry survives both window directions for overview and application accounts', async () => {
  const core = fileURLToPath(new URL('../../../jetlinks-web-core/src/components/DashBoardCanvas/composables/useDashboardState.ts', import.meta.url))
  const bundled = await build({ entryPoints: [core], bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external' })
  const stateModule = { exports: {} }; Function('module', 'exports', 'require', bundled.outputFiles[0].text)(stateModule, stateModule.exports, require)
  const { useDashboardState } = stateModule.exports
  const original = globalThis.localStorage, data = new Map()
  globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
  const none = Object.fromEntries(fields.map(field => [field, false]))
  const variants = [
    width => buildPrivateOverviewLayout({ ...none, applications: true }, true, width),
    width => mod.exports.buildPrivateApplicationLayout(width),
  ]
  const geometry = value => value.components.map(c => ({ i: c.id, ...Object.fromEntries(['x', 'y', 'w', 'h'].map(k => [k, c.componentProps.gridItem[k]])) }))
  try {
    for (const buildLayout of variants) for (const [from, to] of [[1920, 1512], [1512, 1920]]) {
      data.clear()
      const widgets = buildLayout(from), key = privateOverviewLayoutStorageKey('user/project/api/app', from, widgets)
      const make = width => ({ canvas: { gridLayout: { colNum: 24 } }, components: buildLayout(width).map(item => ({ id: item.id, type: item.panel, componentProps: { gridItem: item.gridItem } })) })
      const input = vue.ref(make(from)), scope = vue.effectScope()
      const state = scope.run(() => useDashboardState({ value: () => input.value, catalog: () => ({ components: {} }), editable: () => false, layoutEditable: () => true, storageKey: () => key, onChange: () => assert.fail('layout changes must not alter business config') }))
      const saved = geometry(input.value).map(item => {
        if (item.i === 'private-overview-access') return { ...item, x: 0, y: 9, w: 20, h: 7 }
        if (item.i === 'private-overview-applications') return { ...item, x: 20, y: 9, w: 4, h: 8 }
        if (item.i === 'private-overview-my-applications') return { ...item, x: 0, y: 0, w: 20 }
        if (item.i === 'private-overview-account') return { ...item, x: 20, y: 0, w: 4 }
        return item
      })
      state.updateLayout(saved)
      const serialized = data.get(key)
      input.value = make(to); await vue.nextTick()
      assert.equal(privateOverviewLayoutStorageKey('user/project/api/app', to, buildLayout(to)), key)
      const restored = geometry(state.value.value)
      assert.deepEqual(restored, saved, `${from} to ${to}: geometry`)
      assert.equal(data.get(key), serialized)
      for (const [index, a] of restored.entries()) for (const b of restored.slice(index + 1))
        assert.ok(a.x+a.w<=b.x || b.x+b.w<=a.x || a.y+a.h<=b.y || b.y+b.h<=a.y, `${from} to ${to}: ${a.i}/${b.i}`)
      scope.stop()
    }
  } finally { if (original === undefined) delete globalThis.localStorage; else globalThis.localStorage = original }
})
