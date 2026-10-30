import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { transformSync } from 'esbuild'
import * as vue from 'vue'
import { loadLogModule } from './logTestLoader.mjs'

const loadApi = request => loadLogModule('views/system/Announcement/api.ts', {
  '@jetlinks-web/core': { request },
  './receivedDataSource': {},
  './announcementI18n': {
    resolveAnnouncementText: (record, key) => record[key] || '',
    resolveAnnouncementTypeLabel: (type, fallback = '') => fallback || type || '',
    buildAnnouncementI18nFields: draft => draft,
  },
})

const draft = {
  title: '全服公告',
  summary: '摘要',
  content: '正文',
  type: 'maintenance',
  popup: true,
  deliveryScope: { saas: true, regionIds: ['region-a', 'region-b'] },
  publish: true,
  others: { source: 'operation' },
}

test('saving content returns the backend bulletin id and persists the SaaS delivery scope', async () => {
  let saved
  const { saveAnnouncement } = loadApi({
    post: async (url, body) => {
      assert.equal(url, '/system/bulletin/_save')
      saved = body
      return { success: true, result: 'bulletin-1' }
    },
  })

  assert.equal(await saveAnnouncement(draft), 'bulletin-1')
  assert.deepEqual(saved, {
    id: undefined,
    title: draft.title,
    summary: draft.summary,
    content: draft.content,
    i18nMessages: undefined,
    type: 'maintenance',
    others: {
      source: 'operation',
      popup: true,
      deliveryScope: { saas: true, regionIds: ['region-a', 'region-b'] },
    },
  })
  assert.equal('dimension' in saved, false)
  assert.equal('deployType' in saved, false)
})

test('publishing delegates the saved delivery scope to the SaaS orchestrator', async () => {
  const calls = []
  const { publishAnnouncement } = loadApi({ put: async (...args) => calls.push(args) })

  await publishAnnouncement('bulletin-1', draft.deliveryScope)

  assert.deepEqual(calls, [[
    '/saas/bulletin/_deploy',
    {
      all: true,
      runtimes: [
        { id: 'region-a', projects: [] },
        { id: 'region-b', projects: [] },
      ],
    },
    { params: { id: 'bulletin-1' } },
  ]])
})

test('revoking uses the same body contract and normalizes runtime ids', async () => {
  const calls = []
  const { withdrawAnnouncement } = loadApi({ put: async (...args) => calls.push(args) })

  await withdrawAnnouncement('bulletin-1', {
    saas: false,
    regionIds: [' region-a ', '', 'region-a'],
  })

  assert.deepEqual(calls, [[
    '/saas/bulletin/_revocation',
    {
      all: false,
      runtimes: [
        { id: 'region-a', projects: [] },
      ],
    },
    { params: { id: 'bulletin-1' } },
  ]])
})

test('normalizing saved scope ignores null blank and duplicate regions', async () => {
  const { queryAnnouncements } = loadApi({
    post: async () => ({
      success: true,
      result: {
        data: [{
          id: 'bulletin-1',
          title: '公告',
          content: '正文',
          others: {
            deliveryScope: {
              saas: false,
              regionIds: [null, ' region-a ', '', 'region-a'],
            },
          },
        }],
        total: 1,
        pageIndex: 0,
        pageSize: 20,
      },
    }),
  })

  const response = await queryAnnouncements({ pageIndex: 0, pageSize: 20 })
  assert.deepEqual(response.result.data[0].deliveryScope, {
    saas: false,
    regionIds: ['region-a'],
  })
})

const loadPage = (api) => {
  const source = readFileSync(new URL('../views/system/Announcement/index.vue', import.meta.url), 'utf8')
    .match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
  const { code } = transformSync(`${source}\nexport { saveAnnouncement, publishAnnouncement, managementViewRef, editorOpen, savingAction }`, {
    loader: 'ts', format: 'cjs',
  })
  const messages = []
  const module = { exports: {} }
  new Function('require', 'module', 'exports', 'defineOptions', code)(name => ({
    vue: { ref: vue.ref, computed: vue.computed },
    'vue-i18n': { useI18n: () => ({ t: key => key, locale: { value: 'zh' } }) },
    '@jetlinks-web/utils': { onlyMessage: message => messages.push(message) },
    './api': api,
  })[name] || {}, module, module.exports, () => {})
  let reloads = 0
  module.exports.managementViewRef.value = { reload: () => reloads++ }
  return { ...module.exports, messages, reloads: () => reloads }
}

test('save and publish waits for the saved id before deploying and keeps the editor open on publish failure', async () => {
  const order = []
  const failure = new Error('publish failed')
  let publishSucceeds = false
  const page = loadPage({
    saveAnnouncement: async () => { order.push('save'); return 'bulletin-1' },
    publishAnnouncement: async (id, scope) => {
      order.push(`publish:${id}`)
      assert.deepEqual(scope, draft.deliveryScope)
      if (!publishSucceeds) throw failure
    },
  })
  page.editorOpen.value = true

  await assert.rejects(page.saveAnnouncement(draft), failure)
  assert.deepEqual(order, ['save', 'publish:bulletin-1'])
  assert.equal(page.editorOpen.value, true)
  assert.equal(page.reloads(), 0)

  publishSucceeds = true
  await page.saveAnnouncement(draft)
  assert.deepEqual(order, ['save', 'publish:bulletin-1', 'save', 'publish:bulletin-1'])
  assert.equal(page.editorOpen.value, false)
  assert.equal(page.reloads(), 1)
  assert.deepEqual(page.messages, ['Announcement.message.published'])
})
