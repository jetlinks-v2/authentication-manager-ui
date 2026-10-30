import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'

const require = createRequire(import.meta.url)
const { build } = require('esbuild')
const dayjs = require('dayjs')
const root = fileURLToPath(new URL('../', import.meta.url))
const base = path.join(root, 'visDashboard/Base/Saas')
const result = await build({
  stdin: { contents: `export * from ${JSON.stringify(path.join(base, 'services/resources.ts'))}; export * from ${JSON.stringify(path.join(base, 'services/today.ts'))}; export * from ${JSON.stringify(path.join(base, 'services/access.ts'))}; export * from ${JSON.stringify(path.join(base, 'components/presentation.ts'))}; export * from ${JSON.stringify(path.join(root, 'visDashboard/Base/shared/apiQuotas.ts'))}`, resolveDir: root, loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', tsconfigRaw: { compilerOptions: {} },
  plugins: [{ name: 'boundaries', setup(b) {
    const stub = (filter, content) => {
      const namespace = `stub${Math.random()}`
      b.onResolve({ filter }, () => ({ path: 'stub', namespace }))
      b.onLoad({ filter: /.*/, namespace }, () => ({ contents: content, loader: 'js' }))
    }
    stub(/^@jetlinks-web\/core$/, 'export const request = context.request')
    stub(/^@jetlinks-web-core\/store\/menu$/, 'export const useMenuStore = () => context.menu')
    stub(/^@jetlinks-web-core\/utils\/deployment$/, 'export const isPrivateDeployment = () => false')
    stub(/useDashboardModules$/, 'export const getDashboardModules = () => context.modules')
    stub(/api\/overview$/, `export const queryOverviewGatewaySummary=()=>context.health('gateway'); export const queryOverviewIotDeviceSummary=()=>context.health('devices'); export const queryOverviewChannelSummary=()=>context.health('video')`)
    stub(/apiAlgorithms$/, 'export const loadAlgorithmMetrics=()=>context.algorithms()')
  } }],
})
function fixture(codes = []) {
  const calls = []
  const context = { calls, menu: { initialized: true, loading: false, menuResultCache: [{ code: 'root', children: codes.map(code => ({ code })) }] }, modules: { edge: true, vision: true },
    health: async id => { calls.push({ health: id }); return { total: 0, online: 0 } },
    algorithms: async () => { calls.push({ algorithms: true }); return { algorithm: 0 } },
    request: { get: async (url, params, options) => { calls.push({ url, params, options }); return context.quotaResponse }, post: async (url, body, options) => { calls.push({ url, body, options }); return { success: true, result: url.includes('/dashboard/') || url.includes('/space/') ? [] : 0 } } },
  }
  const module = { exports: {} }
  Function('module', 'exports', 'require', 'context', result.outputFiles[0].text)(module, module.exports, require, context)
  context.api = module.exports
  return context
}
const byId = rows => Object.fromEntries(rows.map(row => [row.id, row]))

test('unauthorized or unresolved menu tree creates no requests', async () => {
  const c = fixture(['iot-user-device-list', 'iot-user/device/alarm'])
  for (const state of [{ initialized: false, loading: false }, { initialized: true, loading: true }]) {
    Object.assign(c.menu, state)
    assert.deepEqual(await c.api.loadSaasResourceRows(), [])
    assert.deepEqual(await c.api.loadSaasTodayRows(), [])
    assert.equal(c.calls.length, 0)
  }
  c.menu.initialized = true; c.menu.loading = false; c.menu.menuResultCache = []
  assert.deepEqual(await c.api.loadSaasResourceRows(), [])
  assert.deepEqual(await c.api.loadSaasTodayRows(), [])
  assert.equal(c.calls.length, 0)
})

test('resource rows isolate failure and distinguish a real zero from invalid health', async () => {
  const c = fixture(['iot-user-device-list', 'video/resources'])
  c.health = async id => { c.calls.push({ health: id }); if (id === 'video') return { total: undefined, online: 0 }; if (id === 'gateway') throw Error('offline'); return { total: 0, online: 0 } }
  const rows = byId(await c.api.loadSaasResourceRows())
  assert.equal(rows.devices.value, 0)
  assert.deepEqual(rows.devices.statuses.map(s => s.value), [0, 0])
  assert.equal(rows.video.failed, true); assert.equal(rows.gateway.failed, true)
  assert.equal(rows.video.value, undefined); assert.equal(rows.gateway.value, undefined)
})

test('task permission does not create a SaaS resource or request task counts', async () => {
  const c = fixture(['machine-vision/Task'])
  const rows = byId(await c.api.loadSaasResourceRows())
  assert.equal(rows.task, undefined)
  assert.ok(c.calls.every(call => call.url !== '/ai/task/_count'))
})

test('alarm and event use natural-day ranges, exclude pending filter and preserve event asset permission', async () => {
  const c = fixture(['iot-user/device/alarm', 'machine-vision/VisualAlarm', 'video/event', 'resources/Dashboard'])
  const start = Date.now(); const rows = byId(await c.api.loadSaasTodayRows()); const end = Date.now()
  assert.deepEqual(Object.keys(rows), ['deviceAlarm', 'visionAlarm', 'message', 'aiEvent'])
  assert.deepEqual(Object.fromEntries(Object.entries(rows).map(([id, row]) => [id, row.target.menus])), { deviceAlarm: ['iot-user/device/alarm'], visionAlarm: ['machine-vision/VisualAlarm'], message: ['resources/Dashboard'], aiEvent: ['video/event'] })
  assert.ok(Object.values(rows).every(row => row.value === 0 && row.yesterday === 0))
  for (const call of c.calls) {
    const isMessage = call.url === '/dashboard/_multi'
    const range = isMessage ? call.body[0].params : call.body.terms.find(t => ['alarmTime', 'timestamp'].includes(t.column)).value
    const [from, to] = isMessage ? [range.from, range.to] : range
    const now = dayjs(start)
    assert.ok((from === now.startOf('day').valueOf() && to >= start && to <= end) || (from === now.subtract(1, 'day').startOf('day').valueOf() && to === now.subtract(1, 'day').endOf('day').valueOf()))
    if (call.url.includes('/alarm/')) assert.ok(!call.body.terms.some(t => t.column === 'state'))
    if (call.url.includes('/ai/task/history')) {
      assert.deepEqual(call.body.terms.find(t => t.column === 'taskType'), { column: 'taskType', termType: 'not', value: 'reviewHandle' })
      assert.equal(call.options.params.assetType, 'device')
    }
  }
})

test('today rows isolate failures, malformed response is unknown, empty message series is zero', async () => {
  const c = fixture(['iot-user/device/alarm', 'machine-vision/VisualAlarm', 'resources/Dashboard'])
  c.request.post = async (url, body) => url.includes('/device/') ? { result: null } : url.includes('/aiTaskMediaTarget/') ? { result: 2 } : { result: [] }
  const rows = byId(await c.api.loadSaasTodayRows())
  assert.equal(rows.deviceAlarm.failed, true); assert.equal(rows.deviceAlarm.value, undefined)
  assert.deepEqual(rows.deviceAlarm.target.menus, ['iot-user/device/alarm'])
  assert.equal(rows.visionAlarm.value, 2); assert.equal(rows.message.value, 0)
  assert.deepEqual(rows.message.target.menus, ['resources/Dashboard'])
})

test('quota and value presentation preserves unknown, zero, unlimited and excess', () => {
  const { api } = fixture()
  assert.equal(api.formatOverviewNumber(0), '0'); assert.equal(api.formatOverviewNumber(undefined), '—'); assert.equal(api.formatOverviewNumber(NaN), '—')
  for (const limit of [-1, 0, undefined, null]) assert.equal(api.quotaPercent({ value: 0, limit }), undefined)
  assert.equal(api.quotaPercent({ value: 0, limit: 10 }), 0)
  assert.equal(api.quotaPercent({ value: 12, limit: 10 }), 120); assert.equal(api.quotaProgress({ value: 12, limit: 10 }), 100)
  assert.equal(api.quotaPercent({ value: 1, limit: 10, failed: true }), undefined)
})

test('space permission does not request removed SaaS resource metrics', async () => {
  const c = fixture(['space/AreaManagement'])
  assert.deepEqual(await c.api.loadSaasResourceRows(), [])
  assert.deepEqual(c.calls, [])
})

test('unavailable modules and ungranted targets are filtered before creating requests', async () => {
  const c = fixture(['iot-user-device-list'])
  c.modules.edge = false; c.modules.vision = false
  const rows = await c.api.loadSaasResourceRows()
  assert.deepEqual(rows.map(row => row.id), ['devices'])
  assert.deepEqual(c.calls, [{ health: 'devices' }])
  c.calls.length = 0
  assert.deepEqual(await c.api.loadSaasTodayRows(), [])
  assert.deepEqual(c.calls, [])
})

test('one period failure marks its metric unknown without hiding other metrics', async () => {
  const c = fixture(['iot-user/device/alarm', 'machine-vision/VisualAlarm'])
  let deviceCalls = 0
  c.request.post = async url => {
    if (url.includes('/device/')) return ++deviceCalls === 1 ? { result: 4 } : { success: false }
    return { result: 7 }
  }
  const rows = byId(await c.api.loadSaasTodayRows())
  assert.equal(rows.deviceAlarm.failed, true); assert.equal(rows.deviceAlarm.value, undefined)
  assert.equal(rows.visionAlarm.value, 7); assert.equal(rows.visionAlarm.yesterday, 7)
})


test('SaaS quota ranks every UAT metric by usage, including unlimited', async () => {
  const c = fixture()
  const metric = (id, usage, limit = -1) => ({ metric: { id, name: id }, usage, limit: { limit } })
  c.quotaResponse = { result: [
    { id: 'device', name: '设备', metrics: [metric('entityQuota', 31), metric('messages', 19, 20)] },
    ...[['visResource', '可视化资源', 932], ['aiModel', 'AI模型', 473], ['visClassification', '可视化分类', 129], ['visTemplate', '可视化模板', 73], ['user', '用户', 70]].map(([id, name, usage]) => ({ id, name, metrics: [metric('entityQuota', usage)] })),
  ] }
  const rows = await c.api.loadQuotaRows('usage')
  assert.deepEqual(rows.map(row => row.value), [932, 473, 129, 73, 70])
  assert.deepEqual(rows.map(row => row.id), ['visResource:entityQuota', 'aiModel:entityQuota', 'visClassification:entityQuota', 'visTemplate:entityQuota', 'user:entityQuota'])
  assert.ok(rows.every(row => row.limit === -1))
  assert.deepEqual(c.calls, [{ url: '/tenant/me/limits', params: {}, options: { hiddenError: true } }])
  const defaultRows = await c.api.loadQuotaRows()
  assert.equal(defaultRows[0].id, 'device:messages')
})

test('usage sorting expands metrics, preserves ties and zero, places invalid values last and does not fill missing rows', async () => {
  const c = fixture()
  const metric = (id, usage) => ({ metric: { id, name: id }, usage, limit: { limit: -1 } })
  c.quotaResponse = { result: [{ id: 'scene', name: '场景', metrics: [metric('entityQuota', 12), metric('actions', 19)] }, { id: 'other', metrics: [metric('tie1', 19), metric('zero', 0), metric('invalid', true)] }] }
  const rows = await c.api.loadQuotaRows('usage')
  assert.deepEqual(rows.map(row => row.id), ['scene:actions', 'other:tie1', 'scene:entityQuota', 'other:zero', 'other:invalid'])
  assert.equal(rows[3].value, 0); assert.equal(rows[3].failed, false)
  assert.equal(rows[4].value, undefined); assert.equal(rows[4].failed, true)
  c.quotaResponse = { result: [{ id: 'only', metrics: [metric('entityQuota', 3)] }] }
  assert.equal((await c.api.loadQuotaRows('usage')).length, 1)
  c.quotaResponse = { result: [] }; assert.deepEqual(await c.api.loadQuotaRows('usage'), [])
})

test('quota rejects failed and malformed responses', async () => {
  const c = fixture()
  for (const result of [null, {}, [null], [{ id: 'device', metrics: null }], [{ id: 'device', metrics: [{}] }]]) {
    c.quotaResponse = { result }; await assert.rejects(c.api.loadQuotaRows('usage'))
  }
  c.quotaResponse = { success: false, status: 403 }; await assert.rejects(c.api.loadQuotaRows('usage'))
  c.request.get = async () => { throw new Error('403') }; await assert.rejects(c.api.loadQuotaRows('usage'), /403/)
})


test('algorithm and event permissions cannot introduce a SaaS task resource', async () => {
  for (const code of ['machine-vision/Task', 'algorithm-center', 'project/algorithm-center', 'machine-vision/VisualScene', 'video/event']) {
    const c = fixture([code]); const rows = byId(await c.api.loadSaasResourceRows())
    assert.equal(rows.task, undefined, code)
    assert.ok(c.calls.every(call => call.url !== '/ai/task/_count'), code)
  }
  const c = fixture(['machine-vision/Task', 'algorithm-center', 'video/event'])
  const resources = byId(await c.api.loadSaasResourceRows())
  const today = byId(await c.api.loadSaasTodayRows())
  assert.equal(resources.algorithm, undefined)
  assert.ok(c.calls.every(call => !call.algorithms && call.url !== '/ai/scene/tree/_query/no-paging'))
  assert.ok(today.aiEvent)
  assert.equal(c.calls.filter(call => call.url === '/ai/task/history/_count').length, 2)
  assert.ok(c.calls.every(call => call.url !== '/ai/task/_count'))
})

test('administrator resource summary contains four ordered resources and skips removed metrics', async () => {
  const c = fixture(['iot-user-device-list', 'video/resources', 'visualization/project', 'space/AreaManagement', 'rule-engine/Scene', 'algorithm-center'])
  const rows = await c.api.loadSaasResourceRows()
  assert.deepEqual(rows.map(row => row.id), ['devices', 'video', 'gateway', 'screen'])
  assert.ok(c.calls.every(call => !call.algorithms && !call.url?.includes('/space/') && !call.url?.includes('/scene/')))
})

test('screen summary queries published and unpublished without expired status', async () => {
  const c = fixture(['visualization/project'])
  const rows = byId(await c.api.loadSaasResourceRows())
  assert.ok(rows.screen)
  assert.deepEqual(rows.screen.statuses.map(status => status.labelKey), ['saasPublished', 'saasDraft'])
  const calls = c.calls.filter(call => call.url === '/visualization/project/_query')
  assert.equal(calls.length, 3)
  const states = calls.flatMap(call => call.body.terms.filter(term => term.termType === 'vis-project-release').flatMap(term => term.value.map(state => state.value)))
  assert.deepEqual(states, ['published', 'unpublished'])
})
