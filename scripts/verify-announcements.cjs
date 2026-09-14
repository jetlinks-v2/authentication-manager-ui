const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const root = path.resolve(__dirname, '../visDashboard/Base/shared')
const calls = []
let response = { success: true, result: { data: [{ id: 'notice', topicName: '公告标题', message: '公告摘要', notifyTime: 0, detailJson: '{"bulletinId":"bulletin","publishVersion":1}' }], total: 1 } }
function loadFile(filePath, cache = new Map()) {
  if (cache.has(filePath)) return cache.get(filePath)
  const exports = {}
  cache.set(filePath, exports)
  const source = fs.readFileSync(filePath + '.ts', 'utf8')
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
  const baseDir = path.dirname(filePath)
  const dependency = id => {
    if (id === '@jetlinks-web/core') return { request: { post: async (...args) => { calls.push(args); return response } } }
    if (id === '@jetlinks-web-core/locales') return { __esModule: true, default: { global: { locale: { value: 'en' } } } }
    if (id === './navigation') return { HOME_TARGETS: { messages: { menus: ['account/center'] } } }
    if (id.startsWith('.')) return loadFile(path.resolve(baseDir, id), cache)
    return require(id)
  }
  new Function('require', 'exports', js)(dependency, exports)
  return exports
}
function load(name) {
  return loadFile(path.join(root, name))
}

async function main() {
  const { loadAnnouncements } = load('apiAnnouncements')
  const rows = await loadAnnouncements()
  assert.equal(calls.length, 1)
  assert.equal(calls[0][0], '/notifications/_query')
  assert.deepEqual(calls[0][1], { paging: true, pageSize: 5, pageIndex: 0, sorts: [{ name: 'notifyTime', order: 'desc' }], terms: [{ column: 'topicProvider', termType: 'eq', value: 'SystemBulletin' }] })
  assert.equal(rows[0].label, '公告标题')
  assert.equal(rows[0].description, '公告摘要')
  assert.equal(rows[0].notification.detailJson, response.result.data[0].detailJson)
  response = { success: true, result: { data: [{ id: 'legacy', topicName: '历史公告' }] } }
  assert.equal((await loadAnnouncements())[0].date, '')
  response = { result: { data: [{ topicName: '系统公告', message: '旧公告标题', detailJson: '{"id":"old","title":"真实标题"}' }] } }
  assert.equal((await loadAnnouncements())[0].label, '真实标题')
  response = { result: { data: [{ topicName: '系统公告', message: '旧公告标题', detailJson: '{broken' }] } }
  assert.equal((await loadAnnouncements())[0].label, '旧公告标题')
  response = { success: true, result: { data: [{
    id: 'i18n',
    topicName: 'System Bulletin',
    message: 'Legacy summary',
    detailJson: JSON.stringify({
      bulletinId: 'i18n',
      publishVersion: 1,
      i18nMessages: {
        title: { zh: '中文标题', en: 'English title' },
        summary: { zh: '中文摘要', en: 'English summary' },
      },
    }),
  }] } }
  const i18nRows = await loadAnnouncements()
  assert.equal(i18nRows[0].label, 'English title')
  assert.equal(i18nRows[0].description, 'English summary')
  response = { success: true, result: { data: [] } }
  assert.deepEqual(await loadAnnouncements(), [])
  response = { success: true, result: { data: [
    { id: '1', topicName: '未读第一条', state: { value: 'unread' } },
    { id: '2', topicName: '未读第二条', state: 'unread' },
  ] } }
  let rowsWithState = await loadAnnouncements()
  assert.equal(rowsWithState[0].isNew, true)
  assert.equal(rowsWithState[1].isNew, false)
  response = { success: true, result: { data: [{ id: '1', topicName: '已读第一条', state: { value: 'read' } }] } }
  rowsWithState = await loadAnnouncements()
  assert.equal(rowsWithState[0].isNew, false)
  console.log('PASS: 当前用户过滤、最新 5 条、标题摘要、i18n 标题摘要、详情引用、未读第一条 New 标识、缺失日期、空态与失败响应')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
