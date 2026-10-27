import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadLogModule } from './logTestLoader.mjs'

const loadHandler = () => {
  const dialogs = []
  const NotificationDetail = {}
  let scope = "service:user-1"
  const readIds = []
  let destroyed = 0
  const handler = loadLogModule('views/system/Announcement/realtimeNotification.ts', {
    vue: { h: (component, props) => ({ component, props }) },
    'ant-design-vue': { Modal: { info: options => { dialogs.push(options); return { destroy: () => { destroyed++; options.afterClose?.() } } } } },
    './localReadStore': { getAnnouncementReadScope: () => scope, getAnnouncementReadIds: () => readIds },
    '@jetlinks-web/core': { request: {} },
    './receivedDataSource': {},
    '@jetlinks-web-core/locales': { __esModule: true, default: { global: { t: key => key } } },
    './components/NotificationDetail.vue': { __esModule: true, default: NotificationDetail },
    './announcementI18n': { resolveAnnouncementText: (detail, field) => detail?.[field] },
  })
  return { ...handler, dialogs, NotificationDetail, readIds, setScope: value => { scope = value }, destroyed: () => destroyed }
}

for (const source of ['realtime', 'list']) {
  test(`${source} bulletin opens a centered dialog directly and marks read only on confirmation`, async () => {
    const { handleSystemBulletinNotice, dialogs, NotificationDetail } = loadHandler()
    const payload = { id: 'received-1', topicProvider: 'SystemBulletin',
      detail: { bulletinId: 'bulletin-1', publishVersion: 2, title: '发布公告' } }
    const appContext = {}
    let tips = 0
    let reads = 0
    const handled = handleSystemBulletinNotice({ payload, source, appContext,
      showTip: () => { tips += 1 }, markRead: async () => { reads += 1 }, refresh: () => {} })

    assert.equal(handled, true)
    assert.equal(tips, 0)
    assert.equal(dialogs.length, 1)
    const dialog = dialogs[0]
    assert.equal(dialog.centered, true)
    assert.equal(dialog.closable, true)
    assert.equal(dialog.title, '发布公告')
    assert.equal(dialog.content.component, NotificationDetail)
    assert.equal(dialog.content.props.data, payload)
    assert.equal(dialog.appContext, appContext)
    assert.equal(reads, 0)
    await dialog.onOk()
    assert.equal(reads, 1)
  })
}

test('registered bulletin handling suppresses the generic tip and leaves other providers unhandled', async () => {
  const { handleSystemBulletinNotice, dialogs } = loadHandler()
  const { handleRegisteredRealtimeNotice } = loadLogModule(
    '../../jetlinks-web-core/src/layout/components/noticeRealtimeHandler.ts', {
      '@jetlinks-web-core/utils/components-registry': { componentsRegistry: {
        getRegistry: () => [{ code: 'SystemBulletin', props: { handler: handleSystemBulletinNotice } }],
      } },
    },
  )
  let tips = 0
  const context = { source: 'realtime', markRead: async () => {}, refresh: () => {},
    showTip: () => { tips += 1 } }
  assert.equal(await handleRegisteredRealtimeNotice(
    { id: 'bulletin-1', topicProvider: 'SystemBulletin', topicName: '公告' }, context,
  ), true)
  assert.equal(dialogs.length, 1)
  assert.equal(tips, 0)
  assert.equal(await handleRegisteredRealtimeNotice(
    { id: 'message-1', topicProvider: 'OtherProvider' }, context,
  ), false)
  assert.equal(dialogs.length, 1)
})


test('realtime batches deduplicate, confirmed batches stay quiet and a new version opens', () => {
  const handler = loadHandler()
  const context = { source: 'realtime', markRead: async () => {}, refresh: () => {} }
  handler.readIds.push('confirmed')
  for (const id of ['confirmed', 'batch-1', 'batch-1', 'batch-2']) {
    assert.equal(handler.handleSystemBulletinNotice({ ...context, payload: { id } }), true)
  }
  assert.equal(handler.dialogs.length, 2)
  handler.handleSystemBulletinNotice({ ...context, source: 'list', payload: { id: 'confirmed' } })
  assert.equal(handler.dialogs.length, 3)
})

test('identity cleanup destroys realtime dialogs and invalidates old confirmation callbacks', async () => {
  const handler = loadHandler()
  let reads = 0
  const context = { source: 'realtime', markRead: async () => { reads++ }, refresh: () => {}, payload: { id: 'batch' } }
  handler.handleSystemBulletinNotice(context)
  const old = handler.dialogs[0]
  handler.setScope('service:user-2')
  handler.disposeAnnouncementRealtimeDialogs()
  assert.equal(handler.destroyed(), 1)
  await old.onOk()
  assert.equal(reads, 0)
  handler.handleSystemBulletinNotice(context)
  assert.equal(handler.dialogs.length, 2)
})

test('closing an announcement does not confirm and does not reopen on a repeated realtime frame', async () => {
  const handler = loadHandler()
  let reads = 0
  const context = { source: 'realtime', markRead: async () => { reads++ }, refresh: () => {}, payload: { id: 'batch' } }
  handler.handleSystemBulletinNotice(context)
  handler.dialogs[0].afterClose()
  handler.handleSystemBulletinNotice(context)
  assert.equal(handler.dialogs.length, 1)
  await handler.dialogs[0].onOk()
  assert.equal(reads, 0)
})
