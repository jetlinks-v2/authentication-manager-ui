import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadLogModule } from './logTestLoader.mjs'

test('received publication uses explicit bulletin ID and version for detail', async () => {
  const calls = []
  const api = loadLogModule('views/system/Announcement/api.ts', {
    '@jetlinks-web/core': { request: { get: async (...args) => { calls.push(args); return { result: { id: 'bulletin-A', type: 'custom' } } } } },
    './announcementI18n': { resolveAnnouncementText: (row, key) => row[key] || '' },
    '@jetlinks-web-core/api/account/notificationRecord': {},
  })
  const reference = api.resolveSystemBulletinReference({ id: 'bulletin-A:3', bulletinId: 'bulletin-A', publishVersion: 3,
    detail: { bulletinId: 'stale', publishVersion: 2 } })
  assert.deepEqual(reference, { bulletinId: 'bulletin-A', publishVersion: 3 })
  await api.getSystemBulletinNotificationDetail(reference)
  assert.equal(calls[0][0], '/system/bulletin/bulletin-A')
  assert.deepEqual(calls[0][1], { publishVersion: 3 })
  for (const input of [
    { id: 'bulletin-A:3', bulletinId: 'bulletin-A', dataId: 'bulletin-A:3' },
    { id: 'bulletin-A:3', publishVersion: 3, dataId: 'bulletin-A:3' },
    { bulletinId: 'bulletin-A', publishVersion: 0, detail: { bulletinId: 'old', publishVersion: 2 } },
    { bulletinId: 'bulletin-A', publishVersion: 1.5 },
  ]) assert.equal(api.resolveSystemBulletinReference(input), undefined)
  assert.equal(calls.length, 1)
})

test('closing the detail does not confirm; only OK invokes local confirmation', async () => {
  let options, writes = 0
  const modal = loadLogModule('views/system/Announcement/realtimeNotification.ts', {
    'vue': { h: () => ({}) },
    'ant-design-vue': { Modal: { info: value => { options = value } } },
    '@jetlinks-web-core/locales': { __esModule: true, default: { global: { t: key => key } } },
    './components/NotificationDetail.vue': { __esModule: true, default: {} },
    './api': { parseSystemBulletinDetail: () => ({ title: '公告' }) },
    './announcementI18n': { resolveAnnouncementText: (detail, key) => detail[key] },
    './bulletinTypeIcon': {},
  })
  modal.openAnnouncementDetail({ payload: {}, markRead: async () => { writes++ } })
  assert.equal(options.closable, true)
  assert.equal(options.onCancel, undefined)
  assert.equal(writes, 0)
  await options.onOk()
  assert.equal(writes, 1)
})
