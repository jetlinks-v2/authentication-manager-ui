import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadLogModule } from './logTestLoader.mjs'

const loadApi = (request) => loadLogModule('views/system/Announcement/api.ts', {
  '@jetlinks-web/core': { request },
  '@jetlinks-web-core/api/account/notificationRecord': {},
  './announcementI18n': {
    resolveAnnouncementText: (record, key) => record[key] || '',
    buildAnnouncementI18nFields: (draft) => draft,
  },
})

const draft = {
  title: 'Audience contract',
  content: 'Content',
  type: { value: 'default', text: 'Default' },
  userIds: ['user-a', 'user-b'],
  organizationIds: ['org-a', 'org-b'],
  publish: false,
}
const dimensions = [
  { type: 'user', id: 'user-a' },
  { type: 'user', id: 'user-b' },
  { type: 'org', id: 'org-a' },
  { type: 'org', id: 'org-b' },
]

test('saves each selected user and organization as a DimensionInfo', async () => {
  let saved
  const { saveAnnouncement } = loadApi({ post: async (url, body) => {
    assert.equal(url, '/system/bulletin/_save')
    saved = body
  } })
  await saveAnnouncement(draft)
  assert.deepEqual(saved.dimension, dimensions)
  assert.equal(saved.allVisible, false)
})

test('keeps the default audience when no users or organizations are selected', async () => {
  let saved
  const { saveAnnouncement } = loadApi({ post: async (_, body) => { saved = body } })
  await saveAnnouncement({ ...draft, userIds: [], organizationIds: [] })
  assert.deepEqual(saved.dimension, [])
  assert.equal(saved.allVisible, true)
})

test('loads all matching dimensions for detail editing and preserves them on save', async () => {
  let saved
  const record = { ...draft, id: 'bulletin-a', dimension: dimensions }
  const { getAnnouncement, saveAnnouncement } = loadApi({
    get: async () => ({ result: record }),
    post: async (_, body) => { saved = body },
  })
  const loaded = await getAnnouncement(record.id)
  assert.deepEqual(loaded.userIds, draft.userIds)
  assert.deepEqual(loaded.organizationIds, draft.organizationIds)
  await saveAnnouncement({ ...loaded, publish: false })
  assert.deepEqual(saved.dimension, dimensions)
})

test('normalizes list audiences without treating other dimension types as user selections', async () => {
  const { queryAnnouncements } = loadApi({ post: async () => ({
    success: true,
    result: { data: [{ ...draft, id: 'bulletin-a', dimension: [
      ...dimensions,
      { type: 'tenant', id: 'project-a' },
    ] }], total: 1 },
  }) })
  const response = await queryAnnouncements({})
  assert.deepEqual(response.result.data[0].userIds, draft.userIds)
  assert.deepEqual(response.result.data[0].organizationIds, draft.organizationIds)
})
