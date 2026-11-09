import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import test from 'node:test'
import { build } from 'esbuild'
import { createRenderer, effectScope, h, onMounted, onUnmounted, ref, nextTick } from 'vue'
import { Subject } from 'rxjs'

const require = createRequire(import.meta.url)
const { parse, compileScript } = require('vue/compiler-sfc')
async function compile(entry, mocks = {}) {
  const result = await build({ entryPoints: [fileURLToPath(new URL(`../visDashboard/ResourceCenter/VisionTaskRanking/trend/${entry}`, import.meta.url))],
    bundle: true, write: false, format: 'cjs', platform: 'node', external: ['vue', 'rxjs'],
    plugins: [{ name: 'boundaries', setup(api) {
      api.onResolve({ filter: /.*/ }, args => args.path in mocks ? { path: args.path, namespace: 'mock' } : undefined)
      api.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents: mocks[args.path], loader: 'js' }))
      api.onLoad({ filter: /\.vue$/ }, args => {
        const { descriptor } = parse(readFileSync(args.path, 'utf8'), { filename: args.path })
        return { contents: compileScript(descriptor, { id: 'vision-trend-test', inlineTemplate: true }).content, loader: 'ts', resolveDir: dirname(args.path) }
      })
    } }],
  })
  const module = { exports: {} }
  Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports)
  return module.exports
}
const snapshot = await compile('snapshot.ts')
const definitions = await compile('types.ts')
const transport = await compile('service.ts', {
  './transport': `export const createDiagnosticsStream=()=>({post:(...args)=>globalThis.__cvTransport(...args)});export const unwrapDiagnosticRecord=value=>value;`,
})
const settle = async () => { for (let i = 0; i < 6; i++) { await new Promise(setImmediate); await nextTick() } }
const source = (taskId, average = 10, p95 = 30, count = 10, sourceId = 'camera', success = 0) => ({ taskId, modelId: 'model', sourceId, average, p95, count, success })
const raw = (time = 10000, rows = [source('a')]) => ({
  collectedAt: time, notFound: [], reviewTaskBindings: [], tasks: rows.map(row => ({ task_key: `${row.taskId}/${row.modelId}/${row.sourceId}` })),
  samples: rows.flatMap(row => Object.entries({
    'cv.task.inference.latency.avg': row.average, 'cv.task.inference.latency.p95': row.p95,
    'cv.task.inference.success.5m': row.count, 'cv.task.running_time': row.runningTime, 'cv.task.inference.success.total': row.success,
  }).filter(([, value]) => value !== undefined).map(([point, value]) => ({ point, value, timestamp: time,
    labels: { taskId: row.taskId, modelId: row.modelId, sourceId: row.sourceId } }))),
})
const sample = (metrics = raw(), sequence = 1, overrides = {}) => ({ type: 'sample', nodeId: 'edge-node', queryId: 'vision-trend', sequence, status: 'ready', collectedAt: metrics.collectedAt,
  beans: [{ domain: 'org.jetlinks', beanType: 'MonitorMetric', name: 'ZLMediaAiTask', unavailableAttributes: [], values: { Metrics: metrics } }], ...overrides })
const reviewRaw = (value = 3, time = 9000) => ({ collectedAt: time + 100, samples: [
  { point: 'review.queue.pending', value: 999, timestamp: time, labels: {} },
  { point: 'review.dimension.pending', value, timestamp: time, labels: { dimensionType: 'skill', dimensionId: 'skill-a' } },
] })
const cvEvent = (time = 10000, rows, bindings = []) => { const value = raw(time, rows); value.reviewTaskBindings = bindings; return { kind: 'cv', snapshot: snapshot.parseVisionTrendSnapshot(value) } }
const reviewEvent = (value = 3, time = 9000) => ({ kind: 'review', snapshot: snapshot.parseVisionReviewSnapshot(reviewRaw(value, time)) })

test('the three prototype metrics use raw cumulative successful inferences rather than window counts or increments', () => {
  assert.deepEqual(definitions.VISION_TREND_METRICS, ['latency', 'pending', 'success'])
  const points = [100, 105, 2].map((success, index) => snapshot.projectVisionTrend(
    snapshot.parseVisionTrendSnapshot(raw(10000 + index * 2000, [source('a', 10, 30, 0, 'camera', success)])), 'a'))
  assert.deepEqual(points.map(point => point.success), [100, 105, 2])
})

test('single-task multi-source latency is weighted, P95 takes its source maximum, and an empty task never aggregates all tasks', () => {
  const value = snapshot.parseVisionTrendSnapshot(raw(10000, [source('a', 10, 30, 1, 'one'), source('a', 100, 150, 9, 'two'), source('b', 999, 999, 99)]))
  assert.deepEqual(snapshot.projectVisionTrend(value, 'a'), { time: 10000, average: 91, p95: 150, sources: 2, success: 0, pending: null })
  assert.equal(snapshot.projectVisionTrend(value, '').average, null)
  assert.equal(snapshot.projectVisionTrend(value, '').sources, 0)
})

test('success sums only this task and preserves a genuine zero while incomplete sources remain unknown', () => {
  const value = snapshot.parseVisionTrendSnapshot(raw(10000, [source('a', 10, 30, 2, 'one', 3), source('a', 20, 40, 4, 'two', 5), source('b', 10, 30, 2, 'other', 999)]))
  assert.equal(snapshot.projectVisionTrend(value, 'a').success, 8)
  const missing = raw(); missing.notFound = ['a/model/missing']
  assert.equal(snapshot.projectVisionTrend(snapshot.parseVisionTrendSnapshot(missing), 'a').success, null)
  assert.equal(snapshot.projectVisionTrend(snapshot.parseVisionTrendSnapshot(raw()), 'a').success, 0)
})

test('missing weights, absent upstream sources and empty inference windows do not fabricate latency or partial means', () => {
  for (const rows of [[source('a', 10, 30, 2, 'one'), { ...source('a', 100, 150, 2, 'two'), count: undefined }],
    [source('a', 10, 30, 2, 'one'), { ...source('a', 100, 150, 4, 'two'), average: undefined, p95: undefined }]]) {
    assert.equal(snapshot.projectVisionTrend(snapshot.parseVisionTrendSnapshot(raw(10000, rows)), 'a').average, null)
  }
  const missing = raw(); missing.notFound = ['a/model/missing']
  assert.equal(snapshot.projectVisionTrend(snapshot.parseVisionTrendSnapshot(missing), 'a').p95, null)
  const idle = snapshot.projectVisionTrend(snapshot.parseVisionTrendSnapshot(raw(10000, [source('a', 0, 0, 0)])), 'a')
  assert.equal(idle.average, null); assert.equal(idle.p95, null)
  const zero = snapshot.projectVisionTrend(snapshot.parseVisionTrendSnapshot(raw(10000, [source('a', 0, 0, 5)])), 'a')
  assert.equal(zero.average, 0); assert.equal(zero.p95, 0)
})

test('legacy single-source latency remains readable without weights; conflicting identities and timestamps fail', () => {
  const legacy = raw(10000, [{ ...source('a'), count: undefined }])
  assert.equal(snapshot.projectVisionTrend(snapshot.parseVisionTrendSnapshot(legacy), 'a').average, 10)
  const foreign = raw(); foreign.samples[0].labels.taskId = 'foreign'
  assert.throws(() => snapshot.parseVisionTrendSnapshot(foreign), /mismatch/)
  const stale = raw(); stale.samples[0].timestamp = 9000
  assert.throws(() => snapshot.parseVisionTrendSnapshot(stale), /timestamps/)
  const conflict = raw(); conflict.samples.push({ ...conflict.samples[0], value: 99 })
  assert.throws(() => snapshot.parseVisionTrendSnapshot(conflict), /Conflicting/)
})

test('review backlog uses only an exclusive task binding and its own timestamp, never the node queue', () => {
  const cv = cvEvent(10000, undefined, [{ taskId: 'a', skillId: 'skill-a' }]).snapshot
  const review = reviewEvent(0, 9000).snapshot
  assert.equal(snapshot.projectVisionReview(cv, review, 'a').pending, 0)
  assert.equal(snapshot.projectVisionReview(cv, review, 'a').time, 9000)
  assert.equal(snapshot.projectVisionReview(cv, review, 'b').pending, null)
  cv.bindings.push({ taskId: 'b', skillId: 'skill-a' })
  assert.equal(snapshot.projectVisionReview(cv, review, 'a').pending, null)
  review.pending.push({ taskId: 'a', skillId: '', value: 4, time: 9500 })
  assert.equal(snapshot.projectVisionReview(cv, review, 'a').pending, 4)
})

test('history is bounded and segments reconnects and task restarts without overwriting newer observations', () => {
  let points = []
  for (let time = 1000; time <= 400000; time += 500) points = snapshot.appendVisionTrend(points, { time, average: 10, p95: 20, sources: 1, success: 0, pending: null }, 1000)
  assert.ok(points.length <= 61); assert.ok(points.every(point => point.time >= 340000))
  assert.equal(snapshot.appendVisionTrend(points, { ...points[0], time: 100 }, 1000), points)
  points = snapshot.appendVisionTrend(points, { ...points.at(-1), time: 402000 }, 1000, true)
  assert.equal(points.at(-2).average, null); assert.equal(points.at(-2).success, null)
  const before = snapshot.parseVisionTrendSnapshot(raw(10000, [{ ...source('a'), runningTime: 100 }]))
  const after = snapshot.parseVisionTrendSnapshot(raw(12000, [{ ...source('a'), runningTime: 1 }]))
  assert.equal(snapshot.visionTrendRestarted(before, after, 'a'), true)
})

test('task options read task.name from real composite details, preserve server order and omit ID fallbacks and operation-only records', async () => {
  let query
  const result = await transport.loadVisionTrendTasks({ post: async (path, body) => { query = { path, body }; return [
    { task: { id: 'b', name: '人员识别' }, operation: null },
    { task: { id: 'a', name: '烟火识别' }, operation: { id: 'unrelated-operation' } },
    { task: null, operation: { id: 'operation-only', name: '未下发' } },
    { task: { id: 'unnamed' } },
  ] } }, { id: 'gateway/a', name: 'Gateway', online: true })
  assert.deepEqual(result, [{ value: 'b', label: '人员识别' }, { value: 'a', label: '烟火识别' }])
  assert.equal(query.path, '/edge/device/gateway%2Fa/_/ai/task/edge/detail/_query/no-paging')
  assert.deepEqual(query.body.terms, [{ column: 'domain', termType: 'eq', value: 'ComputerVision' }])
})

test('one batch connection reads only CV unless backlog is selected, ignores duplicate sequences and releases its reader', async () => {
  const wire = new Subject(), calls = [], values = []
  globalThis.__cvTransport = (path, body) => { calls.push({ path, body }); return wire }
  const client = { get: async path => { calls.push(path); return [{ id: 'edge-node', current: true }] } }
  const subscription = transport.observeVisionTrend(client, { id: 'gateway/a', name: 'Gateway', online: true }, 2).subscribe(value => values.push(value))
  await settle()
  assert.equal(calls[0], '/edge/device/gateway%2Fa/_/system/monitor/members')
  assert.deepEqual(calls[1].body, { interval: '2s', queries: [{ id: 'vision-trend', nodeIds: ['edge-node'], name: 'org.jetlinks:type=MonitorMetric,name=ZLMediaAiTask', attributes: ['Metrics'] }] })
  wire.next({ type: 'heartbeat' }); wire.next(sample()); wire.next(sample()); wire.next(sample(raw(12000), 2))
  assert.equal(values.length, 2); assert.equal(values[0].kind, 'cv'); assert.equal(calls.length, 2)
  subscription.unsubscribe(); assert.equal(wire.observers.length, 0)
})

test('review and CV queries have independent sequence numbers; missing review capability preserves CV collection', async () => {
  const wire = new Subject(), values = []; let plan
  globalThis.__cvTransport = (_path, body) => { plan = body; return wire }
  const sub = transport.observeVisionTrend({ get: async () => [{ id: 'edge-node' }] }, { id: 'a', name: 'A', online: true }, 2, true).subscribe(value => values.push(value))
  await settle(); assert.equal(plan.queries.length, 2)
  assert.equal(plan.queries[1].name, 'org.jetlinks:type=MonitorMetric,name=AgentRuntimeReview')
  wire.next(sample())
  wire.next(sample(raw(), 1, { queryId: 'vision-review', beans: [], status: 'unsupported' }))
  wire.next(sample(raw(12000), 2))
  assert.deepEqual(values.map(value => value.kind), ['cv', 'review', 'cv'])
  assert.equal(values[1].error, 'unsupported'); assert.equal(sub.closed, false)
  sub.unsubscribe()
})

test('cancelled discovery never opens a connection; forbidden and foreign-node samples stop collection', async () => {
  let release, opened = 0
  globalThis.__cvTransport = () => { opened++; return new Subject() }
  const sub = transport.observeVisionTrend({ get: () => new Promise(resolve => { release = resolve }) }, { id: 'a', name: 'A', online: true }, 2).subscribe()
  sub.unsubscribe(); release([{ id: 'edge-node', current: true }]); await settle(); assert.equal(opened, 0)
  for (const [overrides, code] of [[{ status: 'forbidden' }, 403], [{ status: 'unsupported' }, 'unsupported'], [{ nodeId: 'foreign' }, 'identity']]) {
    const wire = new Subject(); let failure
    globalThis.__cvTransport = () => wire
    transport.observeVisionTrend({ get: async () => [{ id: 'edge-node' }] }, { id: 'a', name: 'A', online: true }, 2).subscribe({ error: error => { failure = error } })
    await settle(); wire.next(sample(raw(), 1, overrides))
    assert.equal(failure.status || failure.code, code); assert.equal(wire.observers.length, 0)
  }
})

test('opening reads current MBeans directly without probing or requesting source history',async()=>{
  const wire=new Subject(),calls=[],values=[]
  globalThis.__cvTransport=(path,body)=>{calls.push({path,body});return wire}
  const client={get:async path=>{assert(path.endsWith('/members'));return [{id:'edge-node',current:true}]}}
  const sub=transport.observeVisionTrend(client,{id:'gateway',name:'Gateway',online:true},2).subscribe(value=>values.push(value))
  await settle()
  assert.deepEqual(calls[0].body.queries.map(query=>[query.name,query.attributes]),[['org.jetlinks:type=MonitorMetric,name=ZLMediaAiTask',['Metrics']]])
  assert.equal(values.length,0)
  const current=raw(600000);current.history=[raw(300000)]
  wire.next(sample(current));assert.equal(values.length,1)
  assert.equal(values[0].kind,'cv');assert.equal(values[0].snapshot.collectedAt,600000)
  sub.unsubscribe();assert.equal(wire.observers.length,0)
})

test('direct CV traffic and heartbeats cannot hide a missing review response; unsubscribe clears deadlines',async t=>{
  t.mock.timers.enable({apis:['Date','setTimeout','setInterval'],now:1000000})
  const wire=new Subject(),errors=[]
  globalThis.__cvTransport=()=>wire
  const sub=transport.observeVisionTrend({get:async()=>[{id:'edge-node'}]},{id:'gateway',name:'Gateway',online:true},2,true).subscribe({error:error=>errors.push(error)})
  await settle()
  for(let sequence=1;sequence<=4;sequence++){
    wire.next(sample(raw(1000000+sequence*2000),sequence));wire.next({type:'heartbeat'})
    t.mock.timers.tick(5000)
  }
  assert.equal(errors[0].name,'TimeoutError');assert.equal(sub.closed,true);assert.equal(wire.observers.length,0)
  const next=transport.observeVisionTrend({get:async()=>[{id:'edge-node'}]},{id:'gateway',name:'Gateway',online:true},2).subscribe({error:error=>errors.push(error)})
  await settle();next.unsubscribe();t.mock.timers.tick(60000);assert.equal(errors.length,1)
})

const hook = await compile('useVisionTrend.ts', {
  '../../monitoring/client': 'export const createMonitorQueryClient=()=>globalThis.__cvClient;',
  './service': 'export const observeVisionTrend=(client,id,interval,review)=>globalThis.__cvObserve(id.id,interval,review);export const loadVisionTrendTasks=(...args)=>globalThis.__cvLoadTasks(...args);',
})
async function fixture(t, loadTasks = async () => [{ value: 'b', label: '人员识别' }, { value: 'a', label: '烟火识别' }]) {
  const wires = []
  globalThis.__cvObserve = (id, interval, review) => { const wire = new Subject(); wires.push({ id, interval, review, wire }); return wire }
  globalThis.__cvLoadTasks = loadTasks
  globalThis.__cvScope = { key: ref('user-a'), active: ref(true), read: () => globalThis.__cvScope.key.value, sync: () => {} }
  globalThis.__cvClient = {}
  const scope = effectScope(), gateways = ref([{ id: 'a', name: 'A', online: true }, { id: 'b', name: 'B', online: true }])
  const state = scope.run(() => hook.useVisionTrend(gateways, globalThis.__cvScope.active, globalThis.__cvScope.key))
  t.after(() => scope.stop()); await settle()
  return { state, scope, gateways, wires, emit: (time, bindings = []) => wires.at(-1).wire.next(cvEvent(time, [source('a'), source('b', 100, 150, 9)], bindings)) }
}

test('the first named task is selected by directory order; no all-tasks option or ID-label fallback exists', async t => {
  const { state, wires, emit } = await fixture(t)
  assert.equal(state.taskId.value, 'b'); assert.deepEqual(state.tasks.value.map(task => task.label), ['人员识别', '烟火识别'])
  emit(10000); assert.equal(state.state.value.data[0].average, 100)
  state.metric.value = 'success'; assert.equal(wires.length, 1)
  state.taskId.value = 'a'; assert.equal(state.state.value.data.length, 1); assert.equal(state.state.value.data[0].average, 10)
})

test('an empty directory opens no sampler and has no synthetic aggregate task', async t => {
  const { state, wires } = await fixture(t, async () => [])
  assert.equal(state.taskId.value, ''); assert.deepEqual(state.tasks.value, []); assert.equal(wires.length, 0)
  assert.equal(state.state.value.loading, false)
})

test('task, gateway, visibility, offline status, identity and disposal isolate their histories and streams', async t => {
  const { state, wires, emit, gateways, scope } = await fixture(t)
  emit(10000); emit(12000); assert.equal(state.state.value.data.length, 2)
  const first = wires[0].wire
  state.gatewayId.value = 'b'; assert.equal(first.observers.length, 0); await settle()
  assert.equal(state.state.value.data, undefined); assert.equal(state.taskId.value, 'b')
  first.next(cvEvent(14000)); assert.equal(state.state.value.data, undefined)
  emit(14000)
  globalThis.__cvScope.active.value = false; assert.equal(wires.at(-1).wire.observers.length, 0)
  globalThis.__cvScope.active.value = true; await settle(); emit(16000)
  assert.equal(state.state.value.data.length, 1); assert.equal(state.state.value.data[0].time, 16000)
  gateways.value = gateways.value.map(item => ({ ...item, online: false })); await nextTick()
  assert.equal(state.state.value.error, 'unavailable'); assert.equal(wires.at(-1).wire.observers.length, 0)
  globalThis.__cvScope.key.value = 'user-b'; assert.equal(state.state.value.data, undefined)
  scope.stop(); assert.equal(wires.at(-1).wire.observers.length, 0)
})

test('only review selection requests its bean; CV updates never retimestamp review backlog and metric histories stay separate', async t => {
  const { state, wires, emit } = await fixture(t)
  emit(10000)
  state.taskId.value = 'a'; state.metric.value = 'pending'; await settle()
  assert.equal(wires[0].wire.observers.length, 0); assert.equal(wires.at(-1).review, true)
  emit(12000, [{ taskId: 'a', skillId: 'skill-a' }]); wires.at(-1).wire.next(reviewEvent(0, 11500))
  assert.equal(state.state.value.data.at(-1).pending, 0); assert.equal(state.state.value.updatedAt, 11500)
  emit(14000, [{ taskId: 'a', skillId: 'skill-a' }])
  assert.equal(state.state.value.data.length, 1); assert.equal(state.state.value.updatedAt, 11500)
  state.metric.value = 'success'; await settle()
  assert.equal(wires.at(-1).review, false); assert.equal(state.state.value.data.at(-1).success, 0)
})

test('forbidden collection clears cached samples without automatic resubscription', async t => {
  const { state, wires, emit } = await fixture(t)
  emit(10000); wires.at(-1).wire.error({ status: 403 })
  assert.equal(state.state.value.error, 'forbidden'); assert.equal(state.state.value.retryAt, Infinity)
  assert.equal(state.state.value.data, undefined); assert.equal(wires.length, 1)
})

test('an online gateway retries temporary discovery failure; hiding or going offline cancels recovery', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout', 'setInterval'], now: 1000000 })
  const { state, wires, gateways } = await fixture(t)
  wires.at(-1).wire.error({ status: 404 })
  assert.equal(state.state.value.retryAt, Date.now() + 2000)
  t.mock.timers.tick(2000); await settle()
  assert.equal(wires.length, 2)
  wires.at(-1).wire.next(cvEvent(12000, [source('b')]))
  assert.equal(state.state.value.error, undefined); assert.equal(state.state.value.loading, false)
  wires.at(-1).wire.error({ code: 'unsupported' })
  globalThis.__cvScope.active.value = false
  t.mock.timers.tick(30000); await settle(); assert.equal(wires.length, 2)
  globalThis.__cvScope.active.value = true; await settle(); assert.equal(wires.length, 3)
  wires.at(-1).wire.error({ status: 503 })
  gateways.value = gateways.value.map(item => ({ ...item, online: false })); await nextTick()
  t.mock.timers.tick(30000); await settle(); assert.equal(wires.length, 3)
})

test('opening starts with current observations only; metric switching retains this page history and reopening starts fresh', async t => {
  const { state, wires, emit } = await fixture(t)
  assert.equal(state.state.value.data, undefined)
  emit(600000); emit(602000)
  assert.equal(state.state.value.data[0].time, 600000); assert.equal(state.state.value.updatedAt, 602000)
  state.metric.value = 'success'
  assert.equal(state.state.value.data.length, 2); assert.equal(state.state.value.error, undefined)
  globalThis.__cvScope.active.value = false
  globalThis.__cvScope.active.value = true; await settle()
  assert.equal(state.state.value.data, undefined)
  emit(610000); assert.deepEqual(state.state.value.data.map(point => point.time), [610000])
  state.taskId.value='a';state.metric.value='pending'; await settle()
  emit(612000,[{taskId:'a',skillId:'skill-a'}]);wires.at(-1).wire.next(reviewEvent(9,609000))
  assert.equal(state.state.value.data, undefined) // Native statistics older than this page are not replayed.
  wires.at(-1).wire.next(reviewEvent(0,611000));assert.equal(state.state.value.data[0].pending,0)
})

test('switching from latency to a counter recreates the renderer and cannot retain the old P95 series', async () => {
  const { default: Panel } = await compile('VisionTrendPanel.vue', {
    'vue-i18n': 'export const useI18n=()=>({t:key=>key})',
    '@ant-design/icons-vue': 'export const InfoCircleOutlined=()=>null',
  })
  const node = type => ({ type, children: [], parent: null })
  const remove = child => { if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1); child.parent = null }
  const renderer = createRenderer({
    createElement: node, createText: node, createComment: node,
    insert(child, parent, anchor) { remove(child); child.parent = parent; const index = anchor ? parent.children.indexOf(anchor) : -1; parent.children.splice(index < 0 ? parent.children.length : index, 0, child) },
    remove, setText(child, text) { child.text = text }, setElementText(child, text) { child.text = text },
    parentNode: child => child.parent, nextSibling: child => child.parent?.children[child.parent.children.indexOf(child) + 1] ?? null,
    patchProp(child, key, _previous, value) { child[key] = value },
  })
  const metric = ref('latency'), mounted = [], unmounted = []
  const props = { title: 'Vision', gateways: [{ id: 'g', name: 'Gateway', online: true }], gatewayId: 'g', taskId: 'a',
    tasks: [{ value: 'a', label: 'Task A' }], state: { loading: false, failures: 0, retryAt: 0,
      data: [{ time: 10000, average: 10, p95: 30, sources: 1, success: 3000, pending: 0 }, { time: 12000, average: 12, p95: 31, sources: 1, success: 0, pending: null }] } }
  const app = renderer.createApp({ setup: () => () => h(Panel, { ...props, metric: metric.value }) })
  for (const name of ['ASelect', 'ATooltip', 'ASkeleton', 'CloudEmpty']) app.component(name, { setup: (_props, { slots }) => () => h('div', slots.default?.()) })
  app.component('JEcharts', { props: ['option'], setup(props) {
    const id = mounted.length
    onMounted(() => {
      mounted.push(props.option.series.map(series => series.name))
      assert.equal(props.option.series[0].showSymbol, true)
      assert.equal(props.option.series[0].type,'line')
      assert.equal(props.option.series[0].symbolSize(undefined, { dataIndex: 0 }), 0)
      if (props.option.series.length===1) {
        assert.equal(props.option.series[0].symbol(undefined,{dataIndex:1}),'rect')
        assert.deepEqual(props.option.series[0].symbolSize(undefined,{dataIndex:1}),[10,2])
        assert.equal(props.option.series[0].data[1][1],0)
      }
      assert.equal(props.option.xAxis.min,10000)
      assert.equal(props.option.xAxis.max,12000)
    })
    onUnmounted(() => unmounted.push(id))
    return () => h('div')
  } })
  app.mount(node('root')); await nextTick()
  assert.deepEqual(mounted[0], ['VisionTrend.average', 'VisionTrend.p95'])
  metric.value = 'success'; await nextTick()
  assert.deepEqual(unmounted, [0]); assert.deepEqual(mounted[1], ['VisionTrend.success'])
  app.unmount()
})
