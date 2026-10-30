import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadLogModule } from './logTestLoader.mjs'

test('overview loads bulletin reception rows and keeps the publication reference for its detail', async () => {
  const calls = []
  const row = { id: 'intent-1', topicName: 'Platform notice', message: 'Summary', state: { value: 'unread' },
    notifyTime: Date.now(), detail: { bulletinId: 'bulletin-1', publishVersion: 2 } }
  const module = loadLogModule('visDashboard/Base/shared/apiAnnouncements.ts', {
    '../../../views/system/Announcement/api': { queryAnnouncementInbox: async query => {
      calls.push(query)
      return { result: { data: [row] } }
    } },
    '../../../views/system/Announcement/announcementI18n': { resolveAnnouncementText: () => '' },
    './navigation': { HOME_TARGETS: { messages: 'account/center' } },
  })
  const rows = await module.loadAnnouncements()
  assert.equal(calls[0].pageSize, 5)
  assert.equal(rows[0].label, 'Platform notice')
  assert.equal(rows[0].isNew, true)
  assert.equal(rows[0].notification, row)
})

test('the real bulletin registration enables detail confirmation and routes it through its own source', async () => {
  const changes = []
  const api = {
    SYSTEM_BULLETIN_PROVIDER: 'SystemBulletin',
    queryAnnouncementInbox: async () => ({success: true, result: {data: []}}),
    queryAnnouncementInboxNoPaging: async () => ({success: true, result: []}),
    countAnnouncementInbox: async () => ({success: true, result: 0}),
    countAnnouncementUnread: async () => ({success: true, result: {count: 0}}),
    changeAnnouncementReadState: async (state, ids) => { changes.push({state, ids}); return {status: 200, success: true} },
    markAllAnnouncementsRead: async () => ({status: 200, success: true}),
  }
  const registration = loadLogModule('views/system/Announcement/register.ts', {
    './api': api,
    './noticeListLoader': {},
    './realtimeNotification': {},
    './loginPopup': {},
    './localReadStore': {subscribeAnnouncementReadChanges: () => () => {}},
    './realtimeSubscription': {subscribeAnnouncementRealtime: () => () => {}},
    '@jetlinks-web-core/locales': {__esModule: true, default: {global: {t: key => key}}},
  })
  const registrations = registration.getRegisterComponents().filter(item => item.targetPage === 'notification-provider')
  const core = loadLogModule('../../jetlinks-web-core/src/layout/components/noticeListHandler.ts', {
    '@jetlinks-web-core/utils/components-registry': {componentsRegistry: {getRegistry: () => registrations}},
    '@jetlinks-web-core/api/account/notificationRecord': {changeStatus_api: () => assert.fail('must use the bulletin source')},
  })
  const source = core.getNoticeDataSource(['SystemBulletin'])
  assert.equal(source.confirmOnDetail, true, 'the existing personal-center confirmation must opt into marking read')
  assert.equal(source.changeState, api.changeAnnouncementReadState)
  await core.changeNoticeReadState(['SystemBulletin'], '_read', ['publication-v2'])
  assert.deepEqual(changes, [{state: '_read', ids: ['publication-v2']}])
})
