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
    if (id === '@jetlinks-web/core') return { request: { post: async (...args) => { calls.push(args); return response } } }
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
  assert.deepEqual(calls.at(-1)[1].terms, [{ column: 'state', termType: 'eq', value: 'warning' }])
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
  assert.deepEqual(calls.at(-1)[1].terms, [{ column: 'id', termType: 'eq', value: 'alarm' }])
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
  console.log('PASS: 两类查询、分页、枚举、详情复查、处理契约、空输入/已处理拦截、失败与空态')
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
