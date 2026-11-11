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
  for (const call of names) assert.deepEqual(call.body, { paging: false, terms: [{ column: 'task.id', termType: 'in', value: ['t1', 't2'] }] })
  assert.equal(result.rows.length, 14)
  assert.equal(result.rows.find(row => row.taskId === 't1').sourceName, '来源一')
  assert.equal(result.rows.find(row => row.taskId === 't1').name, '任务一')
  assert.equal(result.metadataFailed, false)
})

test('aggregation business failure rejects, while name failure retains metrics and marks metadata incomplete', async () => {
  globalThis.__visionRankingFixture = { page: directory(['g1']), post: async () => ({ success: false, result: [] }) }
  await assert.rejects(loadVisionTaskRanking('latency'))
  globalThis.__visionRankingFixture.post = async url => url === '/device/metrics/_agg' ? ok([latency('g1', 't')]) : ({ success: false, result: [] })
  const result = await loadVisionTaskRanking('latency')
  assert.equal(result.metadataFailed, true)
  assert.equal(result.rows[0].name, 't')
  assert.equal(result.rows[0].gatewayId, 'g1')
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
  await assert.rejects(resultPromise, /cancelled/i)
  assert.equal(called.length, 4)
})

test('scope invalidation prevents further directory pages and aggregation', async () => {
  let current = true, pages = 0
  globalThis.__visionRankingFixture = { page: async () => { pages++; current = false; return { data: [gateway('g1')], total: 2 } }, post: () => assert.fail('aggregation requested') }
  await assert.rejects(loadVisionTaskRanking('latency', () => current), /cancelled/i)
  assert.equal(pages, 1)
})


test('small node directory distinguishes no tasks from missing metrics', async () => {
  const calls = []
  globalThis.__visionRankingFixture = { page: directory(['g1']), post: async (url, body) => {
    calls.push({url,body})
    return ok(url === '/device/metrics/_agg' ? [] : [{id:'t1',name:'未上报任务',configuration:{sources:[{id:'s1'},{id:'s2'}]}}])
  }}
  let result = await loadVisionTaskRanking('latency')
  assert.equal(result.taskCount, 1); assert.equal(result.directoryIncomplete, false)
  assert.equal(result.rows[0].value, undefined); assert.equal(result.rows[0].taskId, 't1'); assert.equal(result.rows[0].sourceId, undefined); assert.equal(result.rows[0].detailAvailable, true)
  assert.deepEqual(calls.find(item=>item.url.includes('/edge/detail/')).body.terms, [
    {column:'task.domain',termType:'eq',value:'ComputerVision'}, {column:'task.id',termType:'notnull',value:''},
  ])
  globalThis.__visionRankingFixture.post = async () => ok([])
  result = await loadVisionTaskRanking('latency')
  assert.equal(result.taskCount, 0); assert.deepEqual(result.rows, [])
})

test('offline directory is unknown and old metric retains identity without its value', async () => {
  const calls = []
  globalThis.__visionRankingFixture = { page: async () => ({data:[gateway('online'),{id:'offline',name:'Offline',online:false}],total:2}), post: async (url, body) => {
    calls.push(url)
    return ok(url === '/device/metrics/_agg' ? [latency('offline','old','s1',42)] : [])
  }}
  const result = await loadVisionTaskRanking('latency')
  assert.equal(result.directoryIncomplete, true); assert.equal(result.taskCount, undefined)
  assert.equal(result.rows[0].taskId, 'old'); assert.equal(result.rows[0].value, undefined); assert.equal(result.rows[0].online, false); assert.equal(result.rows[0].detailAvailable, false)
  assert.ok(calls.every(url=>!url.includes('/offline/')))
})

test('directory failure and contradictory aggregation never become a false empty task count', async () => {
  globalThis.__visionRankingFixture = { page: directory(['g1']), post: async url => url === '/device/metrics/_agg' ? ok([]) : {status:403} }
  let result = await loadVisionTaskRanking('latency')
  assert.equal(result.taskCount, undefined); assert.equal(result.directoryIncomplete, true)
  globalThis.__visionRankingFixture.post = async url => ok(url === '/device/metrics/_agg' ? [latency('g1','t')] : [])
  result = await loadVisionTaskRanking('latency')
  assert.equal(result.taskCount, undefined); assert.equal(result.directoryIncomplete, true); assert.equal(result.rows.length, 1)
})

test('offline identity survives missing value or increment while invalid online samples are rejected', () => {
  const gateways = [gateway('on'), {id:'off',name:'Offline',online:false}]
  const latencyRows = normalizeVisionRanking(ok([latency('off','offline','s',null), latency('on','invalid','s',null)]), gateways, 'latency')
  assert.deepEqual(latencyRows.map(row=>[row.taskId,row.value,row.online]), [['offline',undefined,false]])
  const discardRows = normalizeVisionRanking(ok([{...latency('off','offline','s',null),validIncrement:null},{...latency('on','invalid','s',0),validIncrement:null}]),gateways,'discard')
  assert.deepEqual(discardRows.map(row=>[row.taskId,row.value,row.online]), [['offline',undefined,false]])
})

test('offline top 50 cannot displace online metrics and both scopes share the same time window', async () => {
  const calls = []
  globalThis.__visionRankingFixture = {
    page: async () => ({ data: [gateway('on'), { id: 'off', name: 'Offline', online: false }], total: 2 }),
    post: async (url, body) => {
      if (url !== '/device/metrics/_agg') return ok([{ id: 'live', name: 'Live' }])
      calls.push(body)
      return ok(body.thingIds[0] === 'on'
        ? [latency('on', 'live', 'source', 1)]
        : Array.from({ length: 50 }, (_, i) => latency('off', `old-${i}`, 'source', 100 + i)))
    },
  }
  const result = await loadVisionTaskRanking('latency')
  assert.deepEqual(calls.map(call => call.thingIds), [['on'], ['off']])
  assert.equal(calls[0].from, calls[1].from)
  assert.equal(calls[0].to, calls[1].to)
  assert.equal(result.rows.length, 51)
  assert.equal(result.rows[0].taskId, 'live')
  assert.equal(result.rows[0].value, 1)
  assert.ok(result.rows.slice(1).every(row => row.online === false && row.value === undefined))
  assert.equal(result.limited, true)
})

test('task metadata uses enum text and source-specific scene without mixing dimensions', async () => {
  globalThis.__visionRankingFixture = {page:directory(['g1']),post:async url => ok(url === '/device/metrics/_agg'
    ? [latency('g1','t','s1',3),latency('g1','t','s2',2),latency('g1','t','s3',1)]
    : [{id:'t',name:'任务',modelName:'模型',taskTargetDetail:{value:'ClutterDetection',text:'杂物检测'},configuration:{sources:[
      {id:'s1',sceneName:'场景一'}, {id:'s2',headers:{sceneName:'场景二'}}, {id:'s3',others:{sceneName:'历史场景'}},
    ]}}])}
  const result=await loadVisionTaskRanking('latency')
  assert.deepEqual(result.rows.map(r=>[r.sourceId,r.sceneName,r.algorithmName]),[['s1','场景一','杂物检测'],['s2','场景二','杂物检测'],['s3','历史场景','杂物检测']])
})

test('configuration scene wins and ambiguous source-free task has no invented scene', async () => {
  globalThis.__visionRankingFixture = {page:directory(['g1']),post:async url => ok(url === '/device/metrics/_agg' ? [] : [
    {id:'configured',taskTargetDetail:{text:'算法一'},configuration:{sceneName:'配置场景',sources:[{id:'s1',sceneName:'来源场景'}]}},
    {id:'ambiguous',name:'任务名',modelName:'模型名',taskTargetDetail:{text:'算法二'},configuration:{sources:[{id:'s1',sceneName:'一'},{id:'s2',sceneName:'二'}]}},
  ])}
  const result=await loadVisionTaskRanking('latency')
  const byId=Object.fromEntries(result.rows.map(r=>[r.taskId,r]))
  assert.equal(byId.configured.sceneName,'配置场景')
  assert.equal(byId.ambiguous.sceneName,undefined)
  assert.equal(byId.ambiguous.algorithmName,'算法二')
})

test('nested task details join metric identities and exclude operation-only records from the directory', async () => {
  const queries = []
  globalThis.__visionRankingFixture = {
    page: directory(['g1']),
    post: async (url, body) => {
      if (url === '/device/metrics/_agg') return ok([latency('g1', 'actual-task', 'source', 105.59)])
      queries.push(body)
      return ok([
        { task: { id: 'actual-task', name: '安全帽监管任务', taskTargetDetail: { value: 'HelmetDetection', text: '安全帽检测' },
          configuration: { sources: [{ id: 'source', name: '边端摄像头' }] } },
          operation: { id: 'operation-id' }, cloudChannelName: '云端摄像头' },
        { task: null, operation: { id: 'not-created', executionConfig: { taskName: '待创建任务' } } },
      ])
    },
  }
  const result = await loadVisionTaskRanking('latency')
  assert.deepEqual(queries[0].terms, [
    { column: 'task.domain', termType: 'eq', value: 'ComputerVision' },
    { column: 'task.id', termType: 'notnull', value: '' },
  ])
  assert.equal(result.taskCount, 1)
  assert.equal(result.rows.length, 1)
  assert.equal(result.rows[0].taskId, 'actual-task')
  assert.equal(result.rows[0].name, '安全帽监管任务')
  assert.equal(result.rows[0].algorithmName, '安全帽检测')
  assert.equal(result.rows[0].sourceName, '云端摄像头')
  assert.equal(result.rows[0].value, 105.59)
  assert.equal(result.rows[0].detailAvailable, true)
  assert.equal(result.metadataFailed, false)
  assert.equal(result.directoryIncomplete, false)
})

test('large gateway scope queries nested task IDs and never associates an operation ID with a metric task', async () => {
  const ids = ['g1', 'g2', 'g3', 'g4'], queries = []
  globalThis.__visionRankingFixture = {
    page: directory(ids),
    post: async (url, body) => {
      if (url === '/device/metrics/_agg') return ok([latency('g1', 'real'), latency('g1', 'pending')])
      queries.push(body)
      return ok([
        { task: { id: 'real', name: '实际任务' }, operation: null },
        { task: null, operation: { id: 'pending', executionConfig: { taskName: '待创建' } } },
      ])
    },
  }
  const result = await loadVisionTaskRanking('latency')
  assert.deepEqual(queries, [{ paging: false, terms: [{ column: 'task.id', termType: 'in', value: ['pending', 'real'] }] }])
  const real = result.rows.find(row => row.taskId === 'real')
  assert.equal(real.name, '实际任务')
  assert.equal(real.detailAvailable, true)
  const pending = result.rows.find(row => row.taskId === 'pending')
  assert.equal(pending.name, 'pending')
  assert.equal(pending.detailAvailable, false)
  assert.equal(result.metadataFailed, true)
})

test('three online gateways reuse complete metadata while every tab requests fresh metrics', async () => {
  const calls = []
  globalThis.__visionRankingFixture = {
    get: async () => { calls.push('supported'); return ok(catalog) },
    page: async () => { calls.push('gateways'); return { data: ['g1', 'g2', 'g3'].map(gateway), total: 3 } },
    post: async (url, body) => {
      if (url === '/device/metrics/_agg') { calls.push('aggregation'); return ok([]) }
      calls.push('tasks')
      assert.deepEqual(body.terms, [
        { column: 'task.domain', termType: 'eq', value: 'ComputerVision' },
        { column: 'task.id', termType: 'notnull', value: '' },
      ])
      return ok([{ id: 't', name: 'Task' }])
    },
  }
  const cache = {}
  for (const [index, metric] of ['latency', 'discard', 'backlog'].entries()) {
    const before = calls.length
    const result = await loadVisionTaskRanking(metric, () => true, cache)
    assert.equal(calls.length - before, index === 0 ? 6 : 1)
    assert.equal(result.taskCount, 3)
    assert.equal(result.directoryIncomplete, false)
  }
  assert.deepEqual(calls.reduce((counts, key) => ({ ...counts, [key]: (counts[key] || 0) + 1 }), {}),
    { supported: 1, gateways: 1, aggregation: 3, tasks: 3 })
})

test('cached mixed online/offline scope still queries both aggregations and remains unknown', async () => {
  const calls = []
  globalThis.__visionRankingFixture = {
    get: async () => { calls.push('supported'); return ok(catalog) },
    page: async () => { calls.push('gateways'); return { data: [gateway('on'), { id: 'off', name: 'Offline', online: false }], total: 2 } },
    post: async (url, body) => {
      if (url === '/device/metrics/_agg') { calls.push(body.thingIds); return ok([]) }
      calls.push('tasks'); return ok([{ id: 't', name: 'Task' }])
    },
  }
  const cache = {}
  for (const metric of ['latency', 'backlog']) {
    const result = await loadVisionTaskRanking(metric, () => true, cache)
    assert.equal(result.directoryIncomplete, true)
    assert.equal(result.taskCount, undefined)
  }
  assert.deepEqual(calls, ['supported', 'gateways', ['on'], ['off'], 'tasks', ['on'], ['off']])
})

test('missing metric metadata cannot corrupt the cached directory for another metric', async () => {
  const calls = []
  globalThis.__visionRankingFixture = {
    page: directory(['g1']),
    post: async (url, body) => {
      calls.push(url)
      if (url !== '/device/metrics/_agg') return ok([{ id: 'known', name: 'Known' }])
      return ok(body.pointType === 'edge-ai-task'
        ? [latency('g1', 'missing')]
        : [{ thingId: 'g1', taskId: 'known', dimensionKey: 'k', dimensionType: 'type', value: 3 }])
    },
  }
  const cache = {}
  const missing = await loadVisionTaskRanking('latency', () => true, cache)
  assert.equal(missing.directoryIncomplete, true)
  assert.equal(missing.taskCount, undefined)
  const known = await loadVisionTaskRanking('backlog', () => true, cache)
  assert.equal(known.directoryIncomplete, false)
  assert.equal(known.taskCount, 1)
  assert.equal(known.metadataFailed, false)
  assert.equal(calls.filter(url => url !== '/device/metrics/_agg').length, 1)
})

test('failed task directory remains unknown when reused and a new cache retries it', async () => {
  let taskCalls = 0
  globalThis.__visionRankingFixture = {
    page: directory(['g1']),
    post: async url => {
      if (url === '/device/metrics/_agg') return ok([])
      return ++taskCalls === 1 ? { status: 403 } : ok([{ id: 't', name: 'Task' }])
    },
  }
  const cache = {}
  for (const metric of ['latency', 'backlog']) {
    const result = await loadVisionTaskRanking(metric, () => true, cache)
    assert.equal(result.directoryIncomplete, true)
    assert.equal(result.taskCount, undefined)
    assert.equal(result.metadataFailed, true)
  }
  assert.equal(taskCalls, 1)
  const refreshed = await loadVisionTaskRanking('latency', () => true, {})
  assert.equal(taskCalls, 2)
  assert.equal(refreshed.taskCount, 1)
  assert.equal(refreshed.directoryIncomplete, false)
})

test('failed supported and gateway requests are retried with the same cache', async () => {
  let gets = 0, pages = 0
  globalThis.__visionRankingFixture = {
    get: async () => { if (++gets === 1) throw new Error('supported failed'); return ok(catalog) },
    page: async () => { if (++pages === 1) throw new Error('gateways failed'); return { data: [], total: 0 } },
    post: () => assert.fail('no gateways')
  }
  const cache = {}
  await assert.rejects(loadVisionTaskRanking('latency', () => true, cache), /supported failed/)
  await assert.rejects(loadVisionTaskRanking('latency', () => true, cache), /gateways failed/)
  const result = await loadVisionTaskRanking('latency', () => true, cache)
  assert.equal(result.taskCount, 0)
  assert.equal(gets, 2)
  assert.equal(pages, 2)
})

test('a failed aggregation is never reused and the next metric retries it', async () => {
  let aggregations = 0, taskCalls = 0
  globalThis.__visionRankingFixture = {
    page: directory(['g1']),
    post: async url => {
      if (url !== '/device/metrics/_agg') { taskCalls++; return ok([{ id: 't', name: 'Task' }]) }
      aggregations++
      return aggregations === 2 ? { status: 500 } : ok([])
    },
  }
  const cache = {}
  await loadVisionTaskRanking('latency', () => true, cache)
  await assert.rejects(loadVisionTaskRanking('discard', () => true, cache))
  const result = await loadVisionTaskRanking('backlog', () => true, cache)
  assert.equal(aggregations, 3)
  assert.equal(taskCalls, 1)
  assert.equal(result.taskCount, 1)
})
