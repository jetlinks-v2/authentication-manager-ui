import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'

const require = createRequire(import.meta.url)
const dayjs = require('dayjs')
const { build } = require('esbuild')
const root = fileURLToPath(new URL('../', import.meta.url))
const { outputFiles } = await build({
  entryPoints: [path.join(root, 'visDashboard/Base/Private/services/query.ts')],
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  plugins: [{ name: 'request', setup(b) {
    b.onResolve({ filter: /^@jetlinks-web\/core$/ }, () => ({ path: 'core', namespace: 'stub' }))
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const request = context.request', loader: 'js' }))
  } }],
})
function fixture(response = { result: { total: 0 } }) {
  const calls = []
  const context = { request: { post: async (...args) => { calls.push(args); return response } } }
  const module = { exports: {} }
  Function('module', 'exports', 'require', 'context', outputFiles[0].text)(module, module.exports, require, context)
  return { api: module.exports, calls }
}

test('count query uses bounded paging, terms and distinguishes failure from zero', async () => {
  const terms = [{ column: 'state', termType: 'eq', value: 'enabled' }]
  const { api, calls } = fixture()
  assert.equal(await api.queryPrivateCount('/network/config/_query', terms), 0)
  assert.deepEqual(calls, [['/network/config/_query', { pageIndex: 0, pageSize: 1, terms }, { hiddenError: true }]])
  for (const response of [{ success: false }, { result: null }, { result: { total: -1 } }, { result: {} }]) {
    await assert.rejects(fixture(response).api.queryPrivateCount('/test'))
  }
})

test('natural day windows end now and yesterday covers the full preceding day', () => {
  const { api } = fixture()
  const now = dayjs('2026-10-29T15:23:30').valueOf()
  assert.deepEqual(api.privateWindow('today', now), { from: dayjs(now).startOf('day').valueOf(), to: now, interval: '1h' })
  assert.deepEqual(api.privateWindow('yesterday', now), { from: dayjs(now).subtract(1, 'day').startOf('day').valueOf(), to: dayjs(now).subtract(1, 'day').endOf('day').valueOf(), interval: '1h' })
  assert.deepEqual(api.privateWindow('7d', now), { from: dayjs(now).subtract(6, 'day').startOf('day').valueOf(), to: now, interval: '1d' })
})

test('successful sparse buckets fill zero, merge same hour and stop at current hour', () => {
  const { api } = fixture()
  const now = dayjs('2026-10-29T03:23:30').valueOf()
  const window = api.privateWindow('today', now)
  const points = api.mapPrivateTrend({ result: [{ time: '2026-10-29 01:10', count: 2 }, { value: { time: '2026-10-29 01:45', count: 3 } }, { time: '2026-10-29 03:00', count: 7 }] }, window)
  assert.deepEqual(points.map(point => point.value), [0, 5, 0, 7])
  assert.equal(points[0].timestamp, window.from)
})

test('failed and malformed aggregation stays unknown rather than zero', () => {
  const { api } = fixture()
  const window = api.privateWindow('today', dayjs('2026-10-29T03:00:00').valueOf())
  for (const response of [{ success: false }, { result: null }, { result: [{}] }, { result: [{ time: 'bad', count: 2 }] }, { result: [{ time: '2026-10-29 01:00' }] }]) {
    assert.throws(() => api.mapPrivateTrend(response, window))
  }
  assert.deepEqual(api.mapPrivateTrend({ result: [] }, window).map(point => point.value), [0, 0, 0, 0])
})
