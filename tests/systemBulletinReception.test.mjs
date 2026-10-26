import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadLogModule } from './logTestLoader.mjs'

const loadApi = (request) => loadLogModule('views/system/Announcement/api.ts', {
  '@jetlinks-web/core': { request },
  './announcementI18n': {},
})

test('all reception queries call bulletin endpoints independently of ordinary notification APIs', async () => {
  const calls = []
  const api = loadApi({ post: async (url, params) => { calls.push([url, params]); return { status: 200 } } })
  const query = { pageIndex: 1, pageSize: 5, terms: [{ column: 'state', termType: 'eq', value: 'read' }] }
  await api.queryAnnouncementInbox(query)
  await api.queryAnnouncementInboxNoPaging(query)
  await api.countAnnouncementInbox(query)
  await api.countAnnouncementUnread(query)
  assert.deepEqual(calls, [
    ['/system/bulletin/received/_query', query],
    ['/system/bulletin/received/_query/no-paging', query],
    ['/system/bulletin/received/_count', query],
    ['/system/bulletin/received/unread/_count', query],
  ])
})

test('read, unread and all-read use stable received IDs and the bulletin state endpoints', async () => {
  const calls = []
  const api = loadApi({ put: async (url, ids) => { calls.push([url, ids]); return { status: 200 } } })
  await api.changeAnnouncementReadState('_read', ['intent-1', 'intent-2'])
  await api.changeAnnouncementReadState('_unread', ['intent-2'])
  await api.markAllAnnouncementsRead()
  assert.deepEqual(calls, [
    ['/system/bulletin/received/_state/read', ['intent-1', 'intent-2']],
    ['/system/bulletin/received/_state/unread', ['intent-2']],
    ['/system/bulletin/received/_read', undefined],
  ])
})

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
