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
