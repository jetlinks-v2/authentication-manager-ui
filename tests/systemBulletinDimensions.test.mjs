import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { transformSync } from 'esbuild'
import { loadLogModule } from './logTestLoader.mjs'

const loadApi = (request) => loadLogModule('views/system/Announcement/api.ts', {
  '@jetlinks-web/core': { request },
  './receivedDataSource': {},
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


test('clearing every selected target on an existing withdrawn bulletin saves its all-visible scope before ID-only republish', async () => {
  const id = 'withdrawn-selected-bulletin'
  const record = { ...draft, id, state: 'unpublished', publishVersion: 3, dimension: dimensions }
  const calls = []
  let saved
  const api = loadApi({
    get: async (url) => {
      calls.push(['get', url])
      assert.equal(url, `/system/bulletin/${id}/detail`)
      return { success: true, result: record }
    },
    post: async (url, body) => {
      calls.push(['post', url, body])
      assert.equal(url, '/system/bulletin/_save')
      saved = body
      return { status: 200, success: true, result: id }
    },
    put: async (...args) => {
      calls.push(['put', ...args])
      assert.equal(saved.id, id)
      assert.deepEqual(saved.dimension, [])
      assert.equal(saved.allVisible, true)
      return { status: 200, success: true }
    },
  })
  const loaded = await api.getAnnouncement(id)
  assert.deepEqual(loaded.userIds, draft.userIds)
  assert.deepEqual(loaded.organizationIds, draft.organizationIds)
  loaded.userIds = []
  loaded.organizationIds = []
  const savedResponse = await api.saveAnnouncement({ ...loaded, publish: false })
  assert.equal(savedResponse.success, true)
  assert.equal(saved.id, id)
  assert.deepEqual(saved.dimension, [])
  assert.equal(saved.allVisible, true)
  assert.equal(saved.deployType, 'manual')
  const publishedResponse = await api.publishAnnouncement(loaded.id)
  assert.equal(publishedResponse.success, true)
  assert.deepEqual(calls.map(call => call[0]), ['get', 'post', 'put'])
  assert.deepEqual(calls[2], ['put', '/system/bulletin/_deploy', {}, { params: { id } }])
  assert.deepEqual(record.dimension, dimensions)
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


test('preserves selected targets that are no longer returned by candidate queries for server validation', async () => {
  let saved
  const { getAnnouncement, saveAnnouncement } = loadApi({
    get: async () => ({ result: { ...draft, id: 'withdrawn', dimension: [
      { type: 'user', id: 'removed-user' },
      { type: 'org', id: 'empty-organization' },
    ] } }),
    post: async (_, body) => { saved = body },
  })
  const record = await getAnnouncement('withdrawn')
  await saveAnnouncement({ ...record, publish: false })
  assert.equal(saved.allVisible, false)
  assert.deepEqual(saved.dimension, [
    { type: 'user', id: 'removed-user' },
    { type: 'org', id: 'empty-organization' },
  ])
})

test('republishing uses the same ID-only deploy endpoint and propagates an invalid-scope error without fallback', async () => {
  const calls = []
  const failure = new Error('公告发布范围不能为空')
  const { publishAnnouncement } = loadApi({
    put: async (...args) => { calls.push(args); throw failure },
    post: async () => assert.fail('a failed deployment must not save an all-visible fallback'),
  })
  await assert.rejects(publishAnnouncement('withdrawn'), error => error === failure)
  assert.deepEqual(calls, [['/system/bulletin/_deploy', {}, { params: { id: 'withdrawn' } }]])
})

// Execute the actual page handlers, replacing only UI/lifecycle and HTTP boundaries.
const loadManagementPage = (api) => {
  const source = readFileSync(new URL('../views/system/Announcement/index.vue', import.meta.url), 'utf8')
    .match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
  const { code } = transformSync(source + `
export { publishAnnouncement, saveAnnouncement, managementViewRef, editorOpen, saving }
`, { loader: 'ts', format: 'cjs' })
  const notifications = []
  const module = { exports: {} }
  const dependencies = {
    vue: { ref: value => ({ value }), computed: getter => ({ get value() { return getter() } }), onBeforeUnmount: () => {} },
    'vue-i18n': { useI18n: () => ({ t: key => key, locale: { value: 'zh' } }) },
    '@jetlinks-web/utils': { onlyMessage: message => notifications.push(message) },
    '@authentication-manager-ui/api/system/user': {},
    './api': api,
  }
  new Function('require', 'module', 'exports', 'defineOptions', code)(
    name => dependencies[name] || {}, module, module.exports, () => {},
  )
  let reloads = 0
  module.exports.managementViewRef.value = { reload: () => { reloads++ } }
  return { ...module.exports, notifications, reloads: () => reloads }
}

test('page rejects invalid withdrawn scope without success feedback or record changes, then retries normally', async () => {
  const failure = new Error('公告发布范围不能为空')
  let validScope = false
  const calls = []
  const api = loadApi({ put: async (...args) => {
    calls.push(args)
    if (!validScope) throw failure
    return { status: 200, success: true }
  } })
  const page = loadManagementPage(api)
  const record = Object.freeze({ id: 'withdrawn', state: 'unpublished', publishVersion: 3 })
  await assert.rejects(page.publishAnnouncement(record), error => error === failure)
  assert.deepEqual(page.notifications, [])
  assert.equal(page.reloads(), 0)
  assert.deepEqual(record, { id: 'withdrawn', state: 'unpublished', publishVersion: 3 })
  validScope = true
  await page.publishAnnouncement(record)
  assert.equal(page.reloads(), 1)
  assert.deepEqual(page.notifications, ['Announcement.message.published'])
  assert.deepEqual(calls[0], calls[1])
})

test('editor retains the selected draft and exits loading after invalid-scope failure, closing only after success', async () => {
  const failure = new Error('公告发布范围不能为空')
  let validScope = false
  const api = loadApi({ post: async () => {
    if (!validScope) throw failure
    return { status: 200, success: true }
  } })
  const page = loadManagementPage(api)
  page.editorOpen.value = true
  const editingDraft = { ...draft, id: 'withdrawn', publish: true }
  const original = structuredClone(editingDraft)
  await assert.rejects(page.saveAnnouncement(editingDraft), error => error === failure)
  assert.equal(page.editorOpen.value, true)
  assert.equal(page.saving.value, false)
  assert.equal(page.reloads(), 0)
  assert.deepEqual(page.notifications, [])
  assert.deepEqual(editingDraft, original)
  validScope = true
  await page.saveAnnouncement(editingDraft)
  assert.equal(page.editorOpen.value, false)
  assert.equal(page.saving.value, false)
  assert.equal(page.reloads(), 1)
  assert.deepEqual(page.notifications, ['Announcement.message.published'])
})
