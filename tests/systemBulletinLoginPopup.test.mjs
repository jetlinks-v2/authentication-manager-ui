import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { test } from 'node:test'
import ts from 'typescript'

const source = await readFile(
  resolve(import.meta.dirname, '../views/system/Announcement/loginPopup.ts'),
  'utf8',
)

const loadHandler = (records) => {
  const reads = []
  const popups = []
  const queries = []
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText
  const exports = {}
  const dependency = (id) => {
    if (id === 'vue') return { h: (_component, props) => props }
    if (id === 'ant-design-vue') {
      return { Modal: { info: options => { popups.push(options); options.onOk() } } }
    }
    if (id === '@jetlinks-web-core/locales') {
      return { __esModule: true, default: { global: { t: key => key } } }
    }
    if (id === './api') {
      return {
        SYSTEM_BULLETIN_PROVIDER: 'SystemBulletin',
        queryAnnouncementInboxNoPaging: async query => {
          queries.push(query)
          return { result: records }
        },
        parseSystemBulletinDetail: record => JSON.parse(record.detailJson),
        changeAnnouncementReadState: async (_type, ids) => { reads.push(...ids) },
      }
    }
    return {}
  }
  new Function('require', 'exports', js)(dependency, exports)
  return { handler: exports.handleSystemBulletinLogin, reads, popups, queries }
}

test('shows popup bulletins oldest first and marks only those records read', async () => {
  const fixture = loadHandler([
    { id: 'new-popup', notifyTime: 30, topicName: 'New', detailJson: JSON.stringify({ others: { popup: true } }) },
    { id: 'normal', notifyTime: 20, topicName: 'Normal', detailJson: JSON.stringify({ others: { popup: false } }) },
    { id: 'old-popup', notifyTime: 10, topicName: 'Old', detailJson: JSON.stringify({ others: { popup: true } }) },
  ])
  let refreshCount = 0

  await fixture.handler({ topicProviders: ['SystemBulletin'], refresh: () => { refreshCount += 1 } })

  assert.deepEqual(fixture.reads, ['old-popup', 'new-popup'])
  assert.equal(fixture.popups.length, 2)
  assert.equal(fixture.popups.every(options => !Object.hasOwn(options, 'title')), true)
  assert.equal(fixture.popups.every(options => options.width === 900), true)
  assert.deepEqual(fixture.queries[0].terms, [{
    column: 'topicProvider',
    termType: 'eq',
    value: 'SystemBulletin',
  }, {
    column: 'state',
    termType: 'eq',
    value: 'unread',
  }])
  assert.equal(refreshCount, 1)
})

test('leaves normal unread announcements in the bell', async () => {
  const fixture = loadHandler(
    [{ id: 'normal', notifyTime: 10, topicName: 'Normal', detailJson: JSON.stringify({ others: { popup: false } }) }],
  )
  let refreshCount = 0

  await fixture.handler({ topicProviders: ['SystemBulletin'], refresh: () => { refreshCount += 1 } })

  assert.deepEqual(fixture.reads, [])
  assert.deepEqual(fixture.popups, [])
  assert.equal(refreshCount, 0)
})
