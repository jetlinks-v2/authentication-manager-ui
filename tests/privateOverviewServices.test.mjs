import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'
const require = createRequire(import.meta.url)
const { build } = require('esbuild')
const root = fileURLToPath(new URL('../', import.meta.url))
const base = path.join(root, 'visDashboard/Base/Private/services')
const { outputFiles } = await build({ stdin: { contents: ['resources', 'trends', 'alarms'].map(name => `export * from ${JSON.stringify(path.join(base, `${name}.ts`))}`).join(';'), resolveDir: root, loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', plugins: [{ name: 'boundaries', setup(b) {
  const stub = (filter, content) => { const namespace = `s${Math.random()}`; b.onResolve({ filter }, () => ({ path: 'stub', namespace })); b.onLoad({ filter: /.*/, namespace }, () => ({ contents: content, loader: 'js' })) }
  stub(/^@jetlinks-web\/core$/, 'export const request = { post: (...args) => context.post(...args) }')
  stub(/\/access$/, 'export const getPrivateOverviewAccess = () => context.access; export const PRIVATE_TARGETS = new Proxy({}, {get:(_, key) => ({menus:[String(key)]})})')
  stub(/api\/overview$/, 'export const queryOverviewIotDeviceSummary=()=>context.summary("iot"); export const queryOverviewChannelBreakdown=(scope)=>context.summary("video",scope); export const buildOverviewDeviceTerms=()=>[]')
  stub(/ResourceCenter\/services\/trends$/, 'export const loadMessageTrend = period => context.messages(period)')
  stub(/\/alarmLevels$/, 'export const queryAlarmLevelOptions = () => context.levels(); export const normalizeAlarmLevelValue = v => typeof v === "number" ? v : undefined')
  stub(/Operations\/alarmService$/, 'export const queryQuickAlarms = category => context.latest(category)')
} }] })
function fixture(access = {}) {
  const calls = []
  const context = { access, calls,
    post: async (url, body) => { calls.push({ url, body }); return { result: url.endsWith('_aggregation') ? [] : 0 } },
    summary: async id => { calls.push({ id }); return id === 'video' ? [] : { total: 0, online: 0 } },
    messages: async period => { calls.push({ period }); return [] },
    levels: async () => { calls.push({ levels: true }); return [{ value: 1, label: 'high', tone: 'high' }] },
    latest: async category => { calls.push({ latest: category }); return { rows: [] } },
  }
  const module = { exports: {} }
  Function('module', 'exports', 'require', 'context', outputFiles[0].text)(module, module.exports, require, context)
  return { api: module.exports, context }
}
test('no access performs no resources, trends or alarm requests', async () => {
  const { api, context } = fixture()
  assert.deepEqual(await api.loadPrivateResources(), { kpis: [], assets: [] })
  assert.deepEqual((await api.loadPrivateTrend('ai', 'today')).series, [])
  assert.deepEqual((await api.loadPrivateAlarms()).sources, [])
  assert.deepEqual(context.calls, [])
})
test('failed device summary stays unknown without hiding healthy video', async () => {
  const { api, context } = fixture({ iot: true, video: true })
  context.summary = async (id, scope) => { if (id === 'iot') throw Error('offline'); assert.equal(scope, 'all'); return [{ id: 'onvif', total: 3, online: 2 }, { id: 'media-plugin', total: 2, online: 1 }] }
  const result = await api.loadPrivateResources()
  assert.equal(result.assets[0].failed, true)
  assert.equal(result.assets[0].total, undefined)
  assert.equal(result.assets[1].total, 5)
  assert.equal(result.assets[1].offline, 2)
  assert.equal(result.kpis[1].value, 5)
  assert.equal(result.assets[1].breakdown.find(row => row.id === 'other').value, 2)
})
test('event aggregation uses actual time and total rows, and period failures are independent', async () => {
  const { api, context } = fixture({ ai: true })
  let n = 0
  context.post = async (url, body, options) => {
    context.calls.push({ url, body, options })
    if (++n === 1) return { result: [{ time: new Date(body.from).getTime(), total: 4 }] }
    throw Error('yesterday failed')
  }
  const trend = await api.loadPrivateTrend('ai', 'today')
  assert.equal(trend.series[0].total, 4)
  assert.equal(trend.series[1].failed, true)
  assert.equal(context.calls[0].options.params.assetType, 'device')
  assert.deepEqual(context.calls[0].body.filter.terms[0], { column: 'taskType', termType: 'not', value: 'reviewHandle' })
})
test('alarm source and dictionary failures preserve independent source data', async () => {
  const { api, context } = fixture({ iotAlarm: true, videoAlarm: true })
  context.levels = async () => { throw Error('dictionary failed') }
  context.post = async (url, body) => {
    if (url.includes('device') && url.endsWith('_count')) throw Error('device failed')
    if (url.endsWith('_aggregation')) return { result: [{ time: new Date().toISOString(), count: 3 }] }
    return { result: 5 }
  }
  const result = await api.loadPrivateAlarms()
  assert.equal(result.pending, undefined)
  assert.equal(result.sources[0].failed, true)
  assert.equal(result.sources[1].pending, 5)
  assert.ok(result.sources.every(source => source.levelsFailed))
  assert.deepEqual(result.levels, [])
  assert.ok(result.sources.every(source => !source.trendFailed))
})
