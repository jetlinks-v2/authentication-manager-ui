import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { test } from 'node:test'
import ts from 'typescript'

const source = await readFile(
  resolve(import.meta.dirname, '../views/system/Announcement/loginPopup.ts'),
  'utf8',
)

const loadHandler = (records, autoConfirm = true) => {
  const reads = []
  const popups = []
  const queries = []
  const navigations = []
  const user = { tabKey: '', other: { tabKey: '' }, messageInfo: {} }
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText
  const exports = {}
  const dependency = (id) => {
    if (id === 'vue') return { h: (type, props, children) => ({ type, props, children }) }
    if (id === 'ant-design-vue') {
      return { Button: 'Button', Modal: { info: options => {
        popups.push(options)
        if (autoConfirm) queueMicrotask(() => options.footer().children.find(node => node?.props?.type === 'primary').props.onClick())
        return { destroy: () => options.afterClose() }
      } } }
    }
    if (id === '@jetlinks-web-core/locales') {
      return { __esModule: true, default: { global: { t: (key, params) => params ? `${key}:${params.count}` : key } } }
    }
    if (id === '@jetlinks-web-core/store/user') return { useUserStore: () => user }
    if (id === '@jetlinks-web-core/store/menu') return { useMenuStore: () => ({
      routerPush: (...args) => navigations.push(args),
    }) }
    if (id === './api') {
      return {
        SYSTEM_BULLETIN_PROVIDER: 'SystemBulletin',
        queryAnnouncementInboxNoPaging: async query => {
          queries.push(query)
          return { result: records.map(record => ({
            state: { value: 'unread' }, ...record,
            ...(reads.includes(record.id) ? { state: { value: 'read' } } : {}),
          })) }
        },
        parseSystemBulletinDetail: record => JSON.parse(record.detailJson),
        changeAnnouncementReadState: async (_type, ids) => { reads.push(...ids) },
      }
    }
    return {}
  }
  new Function('require', 'exports', js)(dependency, exports)
  return { handler: exports.handleSystemBulletinLogin, reads, popups, queries, navigations, user }
}

test('shows only the latest unread popup and leaves all other announcements unread', async () => {
  const fixture = loadHandler([
    { id: 'new-popup', notifyTime: 30, topicName: 'New', detailJson: JSON.stringify({ others: { popup: true } }) },
    { id: 'normal', notifyTime: 20, topicName: 'Normal', detailJson: JSON.stringify({ others: { popup: false } }) },
    { id: 'old-popup', notifyTime: 10, topicName: 'Old', detailJson: JSON.stringify({ others: { popup: true } }) },
  ])
  let refreshCount = 0

  await fixture.handler({ topicProviders: ['SystemBulletin'], refresh: () => { refreshCount += 1 } })

  assert.deepEqual(fixture.reads, ['new-popup'])
  assert.equal(fixture.popups.length, 1)
  assert.equal(fixture.popups[0].content.props.data.id, 'new-popup')
  assert.equal(fixture.popups[0].footer().children[0].children.default(), 'Announcement.notification.historyUnread:2')
  assert.deepEqual(fixture.navigations, [])
  assert.equal(fixture.popups.every(options => !Object.hasOwn(options, 'title')), true)
  assert.equal(fixture.popups.every(options => options.width === 900), true)
  assert.deepEqual(fixture.queries[0].terms, [{
    column: 'topicProvider',
    termType: 'eq',
    value: 'SystemBulletin',
  }])
  assert.equal(refreshCount, 1)
})

const announcement = (id, notifyTime, popup = true) => ({
  id, notifyTime, detailJson: JSON.stringify({ others: { popup } }),
})
const context = { topicProviders: ['SystemBulletin'], refresh: () => {} }

test('chooses the newest popup even when the newest unread announcement has popup disabled', async () => {
  const fixture = loadHandler([
    announcement('old-popup', 10),
    announcement('new-normal', 40, false),
    announcement('latest-popup', 30),
    announcement('old-normal', 20, false),
  ])
  await fixture.handler(context)
  assert.equal(fixture.popups.length, 1)
  assert.equal(fixture.popups[0].content.props.data.id, 'latest-popup')
  assert.equal(fixture.popups[0].footer().children[0].children.default(), 'Announcement.notification.historyUnread:3')
  assert.deepEqual(fixture.reads, ['latest-popup'])
})

test('hides the unread-count button when only the current unread announcement exists', async () => {
  const fixture = loadHandler([announcement('only', 10)])
  await fixture.handler(context)
  assert.equal(fixture.popups.length, 1)
  assert.equal(fixture.popups[0].footer().children.filter(Boolean).length, 1)
  assert.deepEqual(fixture.reads, ['only'])
})

test('ten unread announcements produce one popup with nine remaining and confirm only after clicking', async () => {
  const fixture = loadHandler(Array.from({ length: 10 }, (_, i) => announcement(`bulletin-${i}`, i)), false)
  let refreshCount = 0
  const pending = fixture.handler({ ...context, refresh: () => { refreshCount += 1 } })
  await Promise.resolve()
  assert.equal(fixture.popups.length, 1)
  assert.equal(fixture.popups[0].content.props.data.id, 'bulletin-9')
  assert.deepEqual(fixture.reads, [])
  assert.equal(refreshCount, 0)
  const footer = fixture.popups[0].footer()
  assert.equal(footer.children[0].children.default(), 'Announcement.notification.historyUnread:9')
  footer.children[1].props.onClick()
  await pending
  assert.deepEqual(fixture.reads, ['bulletin-9'])
  assert.equal(refreshCount, 1)
  assert.equal(fixture.popups.length, 1)
})

test('unread-count action confirms only the displayed bulletin then opens the announcement message center', async () => {
  const fixture = loadHandler([announcement('latest', 20), announcement('older', 10)], false)
  const pending = fixture.handler(context)
  await Promise.resolve()
  const buttons = fixture.popups[0].footer().children
  assert.equal(buttons[0].children.default(), 'Announcement.notification.historyUnread:1')
  assert.equal(buttons[1].props.type, 'primary')
  assert.deepEqual(fixture.reads, [])
  buttons[0].props.onClick()
  await pending
  assert.deepEqual(fixture.reads, ['latest'])
  assert.deepEqual(fixture.navigations, [['account/center', {
    params: { tabKey: 'StationMessage', other: { tabKey: 'announcement' } },
  }]])
  assert.equal(fixture.user.tabKey, 'StationMessage')
  assert.equal(fixture.user.other.tabKey, 'announcement')
  assert.equal(fixture.popups.length, 1)
})

test('empty unread list does not open a popup or change any confirmation', async () => {
  const fixture = loadHandler([])
  await fixture.handler(context)
  assert.deepEqual(fixture.popups, [])
  assert.deepEqual(fixture.reads, [])
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

test('refresh and next login do not fall back to old unread popup bulletins after latest confirmation', async () => {
  const records = [announcement('old:1', 10), announcement('latest:1', 20)]
  const fixture = loadHandler(records)
  await fixture.handler(context)
  await fixture.handler(context)
  await fixture.handler(context)
  assert.equal(fixture.popups.length, 1)
  assert.deepEqual(fixture.reads, ['latest:1'])

  records.push(announcement('new:1', 30))
  await fixture.handler(context)
  assert.equal(fixture.popups.length, 2)
  assert.deepEqual(fixture.reads, ['latest:1', 'new:1'])
  records.splice(2, 1, announcement('new:2', 40))
  await fixture.handler(context)
  assert.equal(fixture.popups.length, 3, 'a republished version is a new batch')
})

test('already-read latest popup blocks older unread ones, regardless of a newer non-popup bulletin', async () => {
  const fixture = loadHandler([
    announcement('old', 10),
    { ...announcement('latest-popup', 20), state: { value: 'read' } },
    announcement('normal', 30, false),
  ])
  await fixture.handler(context)
  assert.deepEqual(fixture.popups, [])
  assert.deepEqual(fixture.reads, [])
})

test('history button counts unread records only, excluding already-read older bulletins', async () => {
  const fixture = loadHandler([
    { ...announcement('read-history', 10), state: 'read' },
    announcement('unread-history', 20),
    announcement('latest', 30),
  ])
  await fixture.handler(context)
  assert.equal(fixture.popups[0].footer().children[0].children.default(), 'Announcement.notification.historyUnread:1')
})
