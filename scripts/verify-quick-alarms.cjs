const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const root = path.resolve(__dirname, '../visDashboard/Base/Operations')
const calls = []
let response
const row = { id: 'alarm', alarmConfigId: 'rule', alarmName: '设备离线', targetName: '传感器',
  state: { value: 'warning', text: '未处理' }, alarmTime: 0, triggerDesc: '离线超过 5 分钟' }
function load(file) {
  const exports = {}
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
  new Function('require', 'exports', js)(id => {
    if (id === '@jetlinks-web/core') return { request: { post: async (...args) => {
      calls.push(args)
      return typeof response === 'function' ? response(...args) : response
    } } }
    // 只验证运维告警，隔离同文件中未调用的资源和健康状态依赖。
    if (id === '../../../api/overview' || id === './apiAlgorithms') return {}
    if (id === './resources') return { RESOURCE_ROWS: [] }
    if (id === './navigation') return { HOME_TARGETS: {} }
    if (id.startsWith('.')) return load(path.resolve(path.dirname(file), id + '.ts'))
    return require(id)
  }, exports)
  return exports
}
async function main() {
  const api = load(path.join(root, 'alarmService.ts'))
  response = { result: { data: [row], total: 6 } }
  const page = await api.queryQuickAlarms('deviceAlarm', 2)
  assert.equal(page.total, 6)
  assert.equal(page.rows[0].stateText, '未处理')
  assert.equal(page.rows[0].actual, '')
  assert.notEqual(page.rows[0].time, '—')
  assert.equal(calls.at(-1)[0], '/alarm/record/device/_query')
  assert.equal(calls.at(-1)[1].pageIndex, 1)
  assert.deepEqual(calls.at(-1)[1].terms, [
    { column: 'targetType', termType: 'eq', value: 'device' },
    { column: 'state', termType: 'eq', value: 'warning' },
  ])
  await api.queryQuickAlarms('visionAlarm')
  assert.equal(calls.at(-1)[0], '/alarm/record/aiTaskMediaTarget/_query')
  response = { result: { data: [{ ...row, actualDesc: 'AI 识别到人员闯入',
    latestHistory: { mediaChannelName: '东门摄像头', spaceName: 'E栋-4F', fileResults: [{ url: '/snapshot.jpg' }] }
  }], total: 1 } }
  const visual = await api.queryQuickAlarm('visionAlarm', 'alarm')
  assert.equal(visual.imageUrl, '/snapshot.jpg')
  assert.equal(visual.recognition, 'AI 识别到人员闯入')
  assert.equal(visual.channel, '东门摄像头')
  assert.equal(visual.location, 'E栋-4F · 东门摄像头')
  response = { result: { data: [row], total: 1 } }
  const alarm = await api.queryQuickAlarm('deviceAlarm', 'alarm')
  assert.equal(alarm.imageUrl, '')
  assert.equal(alarm.location, '')
  assert.deepEqual(calls.at(-1)[1].terms, [
    { column: 'targetType', termType: 'eq', value: 'device' },
    { column: 'id', termType: 'eq', value: 'alarm' },
  ])
  response = { status: 200, result: true }
  await api.handleQuickAlarm('deviceAlarm', alarm, ' 已复位 ')
  assert.equal(calls.at(-1)[0], '/alarm/record/_handle')
  assert.deepEqual(calls.at(-1)[1], { alarmRecordId: 'alarm', alarmConfigId: 'rule', alarmTime: 0, describe: '已复位', type: 'user', state: 'normal' })
  await api.handleQuickAlarm('visionAlarm', alarm, '已核实')
  assert.equal(calls.at(-1)[0], '/ai/aggregate/task/alarm/_handle')
  assert.equal(calls.at(-1)[1].type, 'user')
  assert.equal(typeof calls.at(-1)[1].handleTime, 'number')
  const before = calls.length
  await assert.rejects(api.handleQuickAlarm('deviceAlarm', alarm, '  '))
  await assert.rejects(api.handleQuickAlarm('deviceAlarm', { ...alarm, state: 'normal' }, '已处理'))
  assert.equal(calls.length, before)
  response = { success: false, status: 403 }
  await assert.rejects(api.handleQuickAlarm('deviceAlarm', alarm, '已复位'))
  await assert.rejects(api.queryQuickAlarms('deviceAlarm'))
  response = { result: { data: [], total: 0 } }
  assert.deepEqual(await api.queryQuickAlarms('deviceAlarm'), { rows: [], total: 0 })
  await assert.rejects(api.queryQuickAlarm('deviceAlarm', 'deleted'))
  const overview = load(path.join(root, '../shared/apiResources.ts'))
  const records = [
    { ...row, id: 'device-1', targetType: 'device', state: 'warning' },
    { ...row, id: 'device-2', targetType: 'device', state: 'warning' },
    { ...row, id: 'device-normal', targetType: 'device', state: 'normal' },
    { ...row, id: 'vision-1', targetType: 'aiTaskMediaTarget', state: 'warning' },
    { ...row, id: 'vision-normal', targetType: 'aiTaskMediaTarget', state: 'normal' },
  ]
  // 复现运行环境：后端只应用请求体条件，不根据 URL 自动隔离告警类型。
  response = (url, query) => {
    assert.ok(query.terms.every(term => term.termType === 'eq'))
    const matched = records.filter(record => query.terms.every(term => record[term.column] === term.value))
    if (url.endsWith('/_count')) return { result: matched.length }
    const start = query.pageIndex * query.pageSize
    return { result: { data: matched.slice(start, start + query.pageSize), total: matched.length } }
  }
  const counts = await overview.loadOperationRows()
  assert.equal(counts.find(item => item.id === 'deviceAlarm').value, 2)
  assert.equal(counts.find(item => item.id === 'visionAlarm').value, 1)
  for (const [category, expectedIds] of [['deviceAlarm', ['device-1', 'device-2']], ['visionAlarm', ['vision-1']]]) {
    const list = await api.queryQuickAlarms(category)
    assert.deepEqual(list.rows.map(item => item.id), expectedIds)
    assert.equal(list.total, counts.find(item => item.id === category).value)
    assert.deepEqual(await api.queryQuickAlarms(category, 2), { rows: [], total: list.total })
  }
  assert.equal((await api.queryQuickAlarm('deviceAlarm', 'device-normal')).state, 'normal')
  await assert.rejects(api.queryQuickAlarm('deviceAlarm', 'vision-1'))
  await assert.rejects(api.queryQuickAlarm('visionAlarm', 'device-1'))
  response = url => {
    if (url.includes('/aiTaskMediaTarget/')) throw new Error('Vision count unavailable')
    return { result: 2 }
  }
  const partial = await overview.loadOperationRows()
  assert.equal(partial.find(item => item.id === 'deviceAlarm').value, 2)
  assert.equal(partial.find(item => item.id === 'visionAlarm').failed, true)
  console.log('PASS: 混合告警的分类计数/列表/详情隔离、数量口径一致、单类计数失败隔离；分页、枚举、详情复查、处理契约、空输入/已处理拦截、失败与空态')
}
main().catch(error => { console.error(error); process.exitCode = 1 })

async function verifyLifecycle() {
  const exports = {}, queries = [], details = [], submissions = []
  let dispose, handled = 0
  const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
  const source = ts.transpileModule(fs.readFileSync(path.join(root, 'useQuickAlarms.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  new Function('require', 'exports', source)(id => {
    if (id === 'vue') return { ref: value => ({ value }), onUnmounted: fn => { dispose = fn } }
    if (id === 'vue-i18n') return { useI18n: () => ({ t: key => key }) }
    if (id === 'ant-design-vue') return { message: { success() {} } }
    if (id === './alarmService') return {
      queryQuickAlarms: () => { const job = deferred(); queries.push(job); return job.promise },
      queryQuickAlarm: () => { const job = deferred(); details.push(job); return job.promise },
      handleQuickAlarm: () => { const job = deferred(); submissions.push(job); return job.promise },
    }
    throw new Error(id)
  }, exports)
  const state = exports.useQuickAlarms('deviceAlarm', () => handled++)
  const first = state.load(1), second = state.load(2)
  queries[1].resolve({ rows: [{ id: 'new' }], total: 6 }); await second
  queries[0].resolve({ rows: [{ id: 'old' }], total: 1 }); await first
  assert.equal(state.rows.value[0].id, 'new')
  const loadingDetail = state.select({ id: 'alarm', state: 'warning' })
  state.close(); details[0].resolve({ id: 'alarm', state: 'warning' }); await loadingDetail
  assert.equal(state.selected.value, undefined)
  const nextDetail = state.select({ id: 'alarm', state: 'warning' })
  details[1].resolve({ id: 'alarm', state: 'warning' }); await nextDetail
  const submit = state.submit('说明'); await state.submit('重复点击'); state.close()
  assert.equal(submissions.length, 1)
  assert.equal(state.selected.value.id, 'alarm')
  submissions[0].reject(new Error('403')); await submit
  assert.equal(state.submitError.value, true)
  assert.equal(handled, 0)
  const retry = state.submit('说明'); submissions[1].resolve(); await retry
  assert.equal(handled, 1)
  const late = state.load(); dispose(); queries[2].resolve({ rows: [{ id: 'disposed' }], total: 1 }); await late
  assert.notEqual(state.rows.value[0]?.id, 'disposed')
  console.log('PASS: 分页迟到响应、关闭详情、卸载保护、重复提交、失败重试与成功刷新')
}
verifyLifecycle().catch(error => { console.error(error); process.exitCode = 1 })
