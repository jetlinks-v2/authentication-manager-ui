import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { transformSync } from 'esbuild'
import * as vue from 'vue'
import { loadLogModule } from './logTestLoader.mjs'

const loadApi = (request) => loadLogModule('views/system/Announcement/api.ts', {
  '@jetlinks-web/core': { request },
  './receivedDataSource': {},
  './announcementI18n': {
    resolveAnnouncementText: (record, key) => record[key] || '',
    buildAnnouncementI18nFields: (draft) => draft,
  },
})
const draft = { title: 'Audience contract', content: 'Content', type: { value: 'default', text: 'Default' } }
const audience = { userIds: ['user-a', 'user-b'], organizationIds: ['org-a', 'org-b'] }
const dimensions = [
  { type: 'user', id: 'user-a' }, { type: 'user', id: 'user-b' },
  { type: 'org', id: 'org-a' }, { type: 'org', id: 'org-b' },
]

test('saving content never submits a delivery scope or publication intent, even from a projected management record', async () => {
  let saved
  const { saveAnnouncement } = loadApi({ post: async (url, body) => {
    assert.equal(url, '/system/bulletin/_save')
    saved = body
  } })
  await saveAnnouncement({ ...draft, ...audience, id: 'withdrawn', dimension: dimensions,
    sourceDimension: { type: 'tenant', id: 'one' }, deliveryState: 'revoked', deliveryVersion: 3,
    publish: true, allVisible: true, deployType: 'now' })
  assert.deepEqual(saved, { id: 'withdrawn', ...draft, summary: undefined, i18nMessages: undefined })
})

test('publishing sends this selection as DimensionInfo values to the existing deploy endpoint', async () => {
  const calls = []
  const { publishAnnouncement } = loadApi({ put: async (...args) => calls.push(args) })
  await publishAnnouncement('bulletin-a', audience)
  assert.deepEqual(calls, [['/system/bulletin/_deploy', { dimension: dimensions, deployType: 'now' },
    { params: { id: 'bulletin-a' } }]])
})

test('empty selection explicitly publishes to the source scope without allVisible or inherited targets', async () => {
  let published
  const { publishAnnouncement } = loadApi({ put: async (_, body) => { published = body } })
  await publishAnnouncement('withdrawn', { userIds: [], organizationIds: [] })
  assert.deepEqual(published, { dimension: [], deployType: 'now' })
})

test('management details preserve delivery lifecycle and source without converting them into an editable audience', async () => {
  const projected = { ...draft, id: 'bulletin-a', dimension: dimensions,
    sourceDimension: { type: 'tenant', id: 'one' }, deliveryState: 'revoked', deliveryVersion: 3 }
  const { getAnnouncement, queryAnnouncements } = loadApi({
    get: async () => ({ result: projected }),
    post: async () => ({ result: { data: [projected], total: 1 } }),
  })
  for (const record of [await getAnnouncement(projected.id), (await queryAnnouncements({})).result.data[0]]) {
    assert.deepEqual(record.dimension, dimensions)
    assert.deepEqual(record.sourceDimension, projected.sourceDimension)
    assert.equal(record.deliveryState, 'revoked')
    assert.equal(record.deliveryVersion, 3)
    assert.equal('userIds' in record, false)
  }
})

test('selected IDs remain intact for server validation, and failure never retries an all-users request', async () => {
  const calls = []
  const failure = new Error('invalid audience')
  const { publishAnnouncement } = loadApi({ put: async (...args) => { calls.push(args); throw failure } })
  await assert.rejects(publishAnnouncement('withdrawn', { userIds: ['removed-user'], organizationIds: ['empty-org'] }), failure)
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0][1].dimension, [
    { type: 'user', id: 'removed-user' }, { type: 'org', id: 'empty-org' },
  ])
})

const loadSfc = (filename, names, dependencies, props = {}, events = []) => {
  const source = readFileSync(new URL(`../views/system/Announcement/${filename}`, import.meta.url), 'utf8')
    .match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
  const { code } = transformSync(`${source}\nexport { ${names} }`, { loader: 'ts', format: 'cjs' })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', 'defineOptions', 'defineProps', 'defineEmits', code)(
    name => dependencies[name] || {}, module, module.exports, () => {}, () => props,
    () => (...args) => events.push(args),
  )
  return module.exports
}

const loadManagementPage = (api) => {
  const notifications = []
  let searches = 0
  const page = loadSfc('index.vue', 'openPublish, publishAnnouncement, saveAnnouncement, managementViewRef, editorOpen, saving, publishOpen, publishing', {
    vue: { ref: vue.ref, computed: vue.computed },
    'vue-i18n': { useI18n: () => ({ t: key => key, locale: { value: 'zh' } }) },
    '@jetlinks-web/utils': { onlyMessage: message => notifications.push(message) },
    './useAnnouncementAudience': { useAnnouncementAudience: () => ({ initializeUserOptions: () => searches++ }) },
    './api': api,
  })
  let reloads = 0
  page.managementViewRef.value = { reload: () => reloads++ }
  return { ...page, notifications, reloads: () => reloads, searches: () => searches }
}

test('opening publish does not publish; failures retain selection, and only successful retry closes and refreshes', async () => {
  const failure = new Error('invalid audience')
  let accepted = false
  const calls = []
  const page = loadManagementPage({ publishAnnouncement: async (...args) => {
    calls.push(args)
    if (!accepted) throw failure
  } })
  const record = Object.freeze({ id: 'withdrawn', deliveryState: 'revoked', dimension: dimensions })
  page.openPublish(record)
  assert.equal(calls.length, 0)
  assert.equal(page.searches(), 1)
  assert.equal(page.publishOpen.value, true)
  await assert.rejects(page.publishAnnouncement(audience), failure)
  assert.equal(page.publishOpen.value, true)
  assert.equal(page.publishing.value, false)
  assert.equal(page.reloads(), 0)
  assert.deepEqual(page.notifications, [])
  accepted = true
  await page.publishAnnouncement(audience)
  assert.deepEqual(calls, [['withdrawn', audience], ['withdrawn', audience]])
  assert.equal(page.publishOpen.value, false)
  assert.equal(page.reloads(), 1)
  assert.deepEqual(page.notifications, ['Announcement.message.published'])
})

test('pending publication ignores duplicate confirmation', async () => {
  let resolve, calls = 0
  const page = loadManagementPage({ publishAnnouncement: () => {
    calls++
    return new Promise(done => { resolve = done })
  } })
  page.openPublish({ id: 'one' })
  const pending = page.publishAnnouncement(audience)
  await page.publishAnnouncement(audience)
  assert.equal(calls, 1)
  resolve()
  await pending
  assert.equal(page.publishing.value, false)
})

test('publish dialog starts each opening empty, keeps choices after a failed request, and emits a detached selection', async () => {
  const props = vue.reactive({ open: false, loading: false })
  const events = []
  const scope = vue.effectScope()
  const dialog = scope.run(() => loadSfc('components/AnnouncementPublishDialog.vue', 'audience, submit', {
    vue, 'vue-i18n': { useI18n: () => ({ t: key => key }) },
  }, props, events))
  props.open = true
  await vue.nextTick()
  assert.deepEqual({ ...dialog.audience }, { userIds: [], organizationIds: [] })
  dialog.audience.userIds = ['user-a']
  dialog.submit()
  assert.deepEqual(events[0], ['publish', { userIds: ['user-a'], organizationIds: [] }])
  props.loading = true
  dialog.submit()
  assert.equal(events.length, 1)
  props.loading = false
  await vue.nextTick()
  assert.deepEqual(dialog.audience.userIds, ['user-a'])
  dialog.audience.userIds.push('user-b')
  assert.deepEqual(events[0][1].userIds, ['user-a'])
  props.open = false
  await vue.nextTick()
  props.open = true
  await vue.nextTick()
  assert.deepEqual({ ...dialog.audience }, { userIds: [], organizationIds: [] })
  scope.stop()
})

test('editor retains content on save failure and never reports publication after saving', async () => {
  const failure = new Error('save failed')
  let accepted = false
  const page = loadManagementPage({ saveAnnouncement: async () => { if (!accepted) throw failure } })
  page.editorOpen.value = true
  await assert.rejects(page.saveAnnouncement({ ...draft, id: 'one' }), failure)
  assert.equal(page.editorOpen.value, true)
  assert.equal(page.saving.value, false)
  assert.deepEqual(page.notifications, [])
  accepted = true
  await page.saveAnnouncement({ ...draft, id: 'one' })
  assert.equal(page.editorOpen.value, false)
  assert.deepEqual(page.notifications, ['Announcement.message.updated'])
})

test('delivery display distinguishes unselected, empty, all-users and source-wide targets across lifecycle states', () => {
  const { formatAnnouncementAudience } = loadLogModule('views/system/Announcement/announcementAudience.ts')
  const t = (key, values) => values ? `${key}:${values.userCount}/${values.organizationCount}` : key
  const base = { dimension: [], deliveryState: 'unselected' }
  assert.equal(formatAnnouncementAudience(base, t), 'Announcement.delivery.unselected')
  assert.equal(formatAnnouncementAudience({ ...base, deliveryState: 'published' }, t),
    'Announcement.delivery.published · Announcement.scope.empty')
  assert.equal(formatAnnouncementAudience({ ...base, deliveryState: 'published', dimension: [{ type: 'user', id: '*' }] }, t),
    'Announcement.delivery.published · Announcement.scope.platform')
  assert.equal(formatAnnouncementAudience({ ...base, deliveryState: 'scheduled',
    sourceDimension: { type: 'tenant', id: 'one' }, dimension: [{ type: 'tenant', id: 'one' }] }, t),
    'Announcement.delivery.scheduled · Announcement.scope.platform')
  assert.equal(formatAnnouncementAudience({ ...base, deliveryState: 'revoked', dimension: dimensions }, t),
    'Announcement.delivery.revoked · Announcement.scope.selected:2/2')
})
