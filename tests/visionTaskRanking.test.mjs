import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const compiled = await build({
  entryPoints: [fileURLToPath(new URL('../visDashboard/ResourceCenter/services/visionTaskRanking.ts', import.meta.url))],
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-fixture', setup(context) {
    context.onResolve({ filter: /^@jetlinks-web\/core$|^\.\.\/\.\.\/\.\.\/api\/overview$/ }, args => ({ path: args.path, namespace: 'mock-api' }))
    context.onLoad({ filter: /.*/, namespace: 'mock-api' }, () => ({ contents: `
      export const request = { post: (...args) => globalThis.__visionRankingFixture.post(...args), get: (...args) => globalThis.__visionRankingFixture.get ? globalThis.__visionRankingFixture.get(...args) : globalThis.__visionSupported() };
      export const queryOverviewGatewayPage = (...args) => globalThis.__visionRankingFixture.page(...args);
    ` }))
  } }],
})
const { buildVisionRankingQuery, normalizeVisionRanking, loadVisionTaskRanking } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`)
const ok = result => ({ status: 200, result })
const catalog = [
  ['edge-ai-task', 'edge.ai.cv.task.inference.latency.avg', 'GAUGE', ['taskId', 'modelId', 'sourceId'], 'ms'],
  ['edge-ai-task', 'edge.ai.cv.task.slot_reject.total', 'CUMULATIVE_COUNTER', ['taskId', 'modelId', 'sourceId'], '次'],
  ['edge-ai-gateway', 'edge.ai.review.dimension.pending', 'GAUGE', ['taskId', 'dimensionKey', 'dimensionType'], '条'],
].map(([pointType, pointId, metricType, labels, unit]) => ({ pointType, pointId, metricType, unit, labelKeys: labels.map(id => ({ id })), groupByKeys: [{ id: 'thingId' }] }))
globalThis.__visionSupported = () => ok(catalog)
const gateway = id => ({ id, name: `网关 ${id}`, online: true })
const latency = (thingId, taskId, sourceId = 'source', value = 1) => ({ thingId, taskId, modelId: 'model', sourceId, value })
const directory = ids => async () => ({ data: ids.map(gateway), total: ids.length })
const waitUntil = async (condition, message) => {
  for (let i = 0; i < 1000 && !condition(); i++) await new Promise(resolve => setImmediate(resolve))
  assert.ok(condition(), message)
}

for (const [metric, pointType, pointId, labels] of [
  ['latency', 'edge-ai-task', 'edge.ai.cv.task.inference.latency.avg', ['taskId', 'modelId', 'sourceId']],
  ['backlog', 'edge-ai-gateway', 'edge.ai.review.dimension.pending', ['taskId', 'dimensionKey', 'dimensionType']],
]) {
  test(`${metric} query keeps full dimensions, LAST, 20-minute window and top 50`, () => {
    const query = buildVisionRankingQuery(metric, ['g1', 'g2'], Date.parse('2026-10-28T02:00:00Z'))
    assert.deepEqual(query, {
      thingIds: ['g1', 'g2'], pointType,
      metrics: [{ pointId, aggregation: 'LAST', alias: 'value' }],
      from: '2026-10-28T09:40:00', to: '2026-10-28T10:00:00', groupBy: ['thingId'],
      labelFilters: labels.map(key => ({ key, operator: 'EXISTS', values: [] })),
      labelGroupBy: labels.map(key => ({ key, alias: key })),
      sorts: [{ alias: 'value', order: 'DESC' }], limit: 50,
    })
    assert.throws(() => buildVisionRankingQuery(metric, []), /scope/i)
    assert.throws(() => buildVisionRankingQuery(metric, ['']), /scope/i)
  })
}

test('normalization excludes unauthorized, invalid and incomplete rows while preserving zero and distinct source dimensions', () => {
  const rows = normalizeVisionRanking(ok([
    latency('g1', 't', 's1', 0), latency('g1', 't', 's2', '2.5'), latency('other', 't', 's', 999),
    latency('g1', '', 's', 2), latency('g1', 't', '', 2), latency('g1', 't', 's', ''),
    latency('g1', 't', 's', null), latency('g1', 't', 's', -1), latency('g1', 't', 's', 'NaN'),
  ]), [gateway('g1')], 'latency')
  assert.deepEqual(rows.map(row => [row.sourceId, row.value]), [['s2', 2.5], ['s1', 0]])
  assert.notEqual(rows[0].id, rows[1].id)
  assert.deepEqual(normalizeVisionRanking(ok([]), [gateway('g1')], 'latency'), [])
  assert.throws(() => normalizeVisionRanking({ status: 500, result: [] }, [gateway('g1')], 'latency'))
})

test('backlog retains dimension key and type as distinct identity', () => {
  const rows = normalizeVisionRanking(ok([
    { thingId: 'g1', taskId: 't', dimensionKey: 'a', dimensionType: 'x', value: 0 },
    { thingId: 'g1', taskId: 't', dimensionKey: 'a', dimensionType: 'y', value: 1 },
    { thingId: 'g1', taskId: 't', dimensionKey: 'a', value: 2 },
  ]), [gateway('g1')], 'backlog')
  assert.equal(rows.length, 2)
  assert.notEqual(rows[0].id, rows[1].id)
})

test('discard queries 20-minute cumulative-counter increments and rejects missing samples without losing zero', async () => {
  const query = buildVisionRankingQuery('discard', ['g1'], Date.parse('2026-10-28T02:00:00Z'))
  assert.equal(query.pointType, 'edge-ai-task')
  assert.deepEqual(query.metrics, [
    { pointId: 'edge.ai.cv.task.slot_reject.total', aggregation: 'SUM', alias: 'value' },
    { pointId: 'edge.ai.cv.task.slot_reject.total', aggregation: 'MIN', alias: 'validIncrement' },
  ])
  assert.deepEqual(query.labelGroupBy.map(item => item.key), ['taskId', 'modelId', 'sourceId'])
  assert.deepEqual([query.from, query.to, query.limit], ['2026-10-28T09:40:00', '2026-10-28T10:00:00', 50])
  const normalized = normalizeVisionRanking(ok([
    { ...latency('g1', 'zero', 's', 0), validIncrement: 0 },
    { ...latency('g1', 'nonzero', 's', 4), validIncrement: 1 },
    { ...latency('g1', 'missing', 's', 0), validIncrement: null },
  ]), [gateway('g1')], 'discard')
  assert.deepEqual(normalized.map(row => [row.taskId, row.value]), [['nonzero', 4], ['zero', 0]])
  const calls = []
  globalThis.__visionRankingFixture = { page: directory(['g1']), post: async (url, body) => {
    calls.push({ url, body })
    return url === '/device/metrics/_agg' ? ok([{ ...latency('g1', 'zero', 's', 0), validIncrement: 0 }]) : ok([{ id: 'zero', name: 'Zero' }])
  } }
  const result = await loadVisionTaskRanking('discard')
  assert.equal(calls[0].body.metrics[0].aggregation, 'SUM')
  assert.equal(result.rows[0].value, 0)
  assert.equal(result.unit, '次')
  assert.equal(result.supported, true)
})

test('catalog absence prevents data queries and unknown unit is never invented', async () => {
  globalThis.__visionRankingFixture = { get: async () => ok([]), page: () => assert.fail('directory requested'), post: () => assert.fail('aggregation requested') }
  assert.deepEqual(await loadVisionTaskRanking('latency'), { rows: [], metadataFailed: false, limited: false, supported: false, unit: '' })
  globalThis.__visionRankingFixture = { get: async () => ok([{ ...catalog[0], unit: undefined }]), page: directory([]), post: () => assert.fail('aggregation requested') }
  const result = await loadVisionTaskRanking('latency')
  assert.equal(result.supported, true)
  assert.equal(result.unit, '')
})

test('queries only authorized gateway scope and batches task names once per gateway with at most four active requests', async () => {
  const ids = Array.from({ length: 7 }, (_, index) => `g${index}`)
  const calls = [], pending = []
  let active = 0, maximum = 0
  globalThis.__visionRankingFixture = {
    page: directory(ids),
    post: async (url, body) => {
      calls.push({ url, body })
      if (url === '/device/metrics/_agg') return ok([...ids.flatMap(id => [latency(id, 't1', 's1', 3), latency(id, 't2', 's2', 2)]), latency('outside', 't', 's', 100)])
      active++; maximum = Math.max(maximum, active)
      await new Promise(resolve => pending.push(resolve))
      active--
      return ok([{ id: 't1', name: '任务一', configuration: { sources: [{ id: 's1', name: '来源一' }] } }, { id: 't2', name: '任务二' }])
    },
  }
  const resultPromise = loadVisionTaskRanking('latency')
  for (let i = 0; i < ids.length; i++) {
    if (calls.filter(call => call.url !== '/device/metrics/_agg').length >= ids.length) break
    await waitUntil(() => pending.length > 0, 'name requests did not progress')
    while (pending.length) pending.shift()()
  }
  while (pending.length) pending.shift()()
  const result = await resultPromise
  assert.equal(maximum, 4)
  assert.equal(calls[0].url, '/device/metrics/_agg')
  assert.deepEqual(calls[0].body.thingIds, ids)
  const names = calls.slice(1)
  assert.equal(names.length, ids.length)
  assert.equal(new Set(names.map(call => call.url)).size, ids.length)
  for (const call of names) assert.deepEqual(call.body, { paging: false, terms: [{ column: 'id', termType: 'in', value: ['t1', 't2'] }] })
  assert.equal(result.rows.length, 14)
  assert.equal(result.rows.find(row => row.taskId === 't1').sourceName, '来源一')
  assert.equal(result.rows.find(row => row.taskId === 't1').detailAvailable, true)
  assert.equal(result.metadataFailed, false)
})

test('aggregation business failure rejects, while name failure retains metrics and marks metadata incomplete', async () => {
  globalThis.__visionRankingFixture = { page: directory(['g1']), post: async () => ({ success: false, result: [] }) }
  await assert.rejects(loadVisionTaskRanking('latency'))
  globalThis.__visionRankingFixture.post = async url => url === '/device/metrics/_agg' ? ok([latency('g1', 't')]) : ({ success: false, result: [] })
  const result = await loadVisionTaskRanking('latency')
  assert.equal(result.metadataFailed, true)
  assert.equal(result.rows[0].name, 't')
  assert.equal(result.rows[0].detailAvailable, false)
})

test('scope invalidation stops queued gateway name requests', async () => {
  const ids = Array.from({ length: 8 }, (_, index) => `g${index}`)
  const pending = [], called = []
  let current = true
  globalThis.__visionRankingFixture = {
    page: directory(ids), post: async url => {
      if (url === '/device/metrics/_agg') return ok(ids.map(id => latency(id, 't')))
      called.push(url)
      await new Promise(resolve => pending.push(resolve))
      return ok([])
    },
  }
  const resultPromise = loadVisionTaskRanking('latency', () => current)
  await waitUntil(() => pending.length === 4, 'four name requests were not started')
  current = false
  pending.splice(0).forEach(resolve => resolve())
  await resultPromise
  assert.equal(called.length, 4)
})

test('scope invalidation prevents further directory pages and aggregation', async () => {
  let current = true, pages = 0
  globalThis.__visionRankingFixture = { page: async () => { pages++; current = false; return { data: [gateway('g1')], total: 2 } }, post: () => assert.fail('aggregation requested') }
  await assert.rejects(loadVisionTaskRanking('latency', () => current), /cancelled/i)
  assert.equal(pages, 1)
})
