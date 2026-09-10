const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const root = path.resolve(__dirname, '../visDashboard/Base/shared')
const calls = []
let response = { success: true, result: { data: [{ id: 'notice', topicName: '公告标题', message: '公告摘要', notifyTime: 0, detailJson: '{"bulletinId":"bulletin","publishVersion":1}' }], total: 1 } }
function load(name) {
  const exports = {}
  const source = fs.readFileSync(path.join(root, name + '.ts'), 'utf8')
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
  const dependency = id => {
    if (id === '@jetlinks-web/core') return { request: { post: async (...args) => { calls.push(args); return response } } }
    if (id === './navigation') return { HOME_TARGETS: { messages: { menus: ['account/center'] } } }
    if (id.startsWith('./')) return load(id.slice(2))
    return require(id)
  }
  new Function('require', 'exports', js)(dependency, exports)
  return exports
}
async function main() {
  const { loadAnnouncements } = load('apiAnnouncements')
  const rows = await loadAnnouncements()
  assert.equal(calls.length, 1)
  assert.equal(calls[0][0], '/notifications/_query')
  assert.deepEqual(calls[0][1], { paging: true, pageSize: 4, pageIndex: 0, sorts: [{ name: 'notifyTime', order: 'desc' }], terms: [{ column: 'topicProvider', termType: 'eq', value: 'SystemBulletin' }] })
  assert.equal(rows[0].label, '公告标题')
  assert.equal(rows[0].description, '公告摘要')
  assert.equal(rows[0].notification.detailJson, response.result.data[0].detailJson)
  response = { success: true, result: { data: [{ id: 'legacy', topicName: '历史公告' }] } }
  assert.equal((await loadAnnouncements())[0].date, '')
  response = { result: { data: [{ topicName: '系统公告', message: '旧公告标题', detailJson: '{"id":"old","title":"真实标题"}' }] } }
  assert.equal((await loadAnnouncements())[0].label, '真实标题')
  response = { result: { data: [{ topicName: '系统公告', message: '旧公告标题', detailJson: '{broken' }] } }
  assert.equal((await loadAnnouncements())[0].label, '旧公告标题')
  response = { success: true, result: { data: [] } }
  assert.deepEqual(await loadAnnouncements(), [])
  response = { success: false, status: 403 }
  await assert.rejects(loadAnnouncements())
  console.log('PASS: 当前用户过滤、最新 4 条、标题摘要、详情引用、缺失日期、空态与失败响应')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
