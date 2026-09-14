import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { test } from 'node:test'
import ts from 'typescript'

const loaderPath = resolve(import.meta.dirname, '../views/system/Announcement/noticeListLoader.ts')

const loadLoader = async ({ list, unread, detail }) => {
  const source = await readFile(loaderPath, 'utf8')
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText
  const exports = {}
  const dependency = (id) => {
    if (id === '@jetlinks-web-core/api/account/notificationRecord') {
      return {
        getList_api: async () => ({ result: { data: list } }),
        getUnreadNoPagingList_api: async () => ({ result: { data: unread } }),
      }
    }
    if (id === './api') {
      return {
        SYSTEM_BULLETIN_PROVIDER: 'SystemBulletin',
        parseSystemBulletinDetail: (record) => record.detail,
        resolveSystemBulletinReference: (record) => record.detail,
        getSystemBulletinNotificationDetail: async (reference) => detail(reference),
      }
    }
    if (id === './announcementI18n') {
      return {
        getAnnouncementI18n: (others) => others?.i18n || {},
        resolveLocalizedText: (messages) => String(messages?.en || '').trim(),
        resolveAnnouncementText: (record, field) => String(record?.others?.i18n?.[field]?.en || record?.[field] || '').trim(),
      }
    }
    if (id === './bulletinTypeIcon') {
      return {
        resolveBulletinTypeIcon: () => 'NotificationOutlined',
        resolveBulletinTypeColor: () => 'var(--jet-theme-primary)',
      }
    }
    return {}
  }
  new Function('require', 'exports', js)(dependency, exports)
  return exports.loadSystemBulletinNoticeList
}

test('loads bulletin detail when a legacy bell snapshot has no i18n', async () => {
  let detailCalls = 0
  const load = await loadLoader({
    unread: [{
      id: 'notice-1',
      topicProvider: 'SystemBulletin',
      topicName: '中文标题',
      message: '中文摘要',
      state: 'unread',
      detail: { bulletinId: 'bulletin-1', publishVersion: 1 },
    }],
    list: [],
    detail: async () => {
      detailCalls += 1
      return { title: 'English title', summary: 'English summary', type: 'default' }
    },
  })

  const rows = await load({ topicProviders: ['SystemBulletin'] })
  assert.equal(detailCalls, 1)
  assert.equal(rows[0].topicName, 'English title')
  assert.equal(rows[0].message, 'English summary')
})

test('does not refetch when the notification snapshot already carries both i18n fields', async () => {
  let detailCalls = 0
  const load = await loadLoader({
    unread: [{
      id: 'notice-2',
      topicProvider: 'SystemBulletin',
      topicName: '中文标题',
      message: '中文摘要',
      state: 'unread',
      detail: {
        bulletinId: 'bulletin-2',
        publishVersion: 1,
        others: { i18n: { title: { en: 'English title' }, summary: { en: 'English summary' } } },
      },
    }],
    list: [],
    detail: async () => {
      detailCalls += 1
      return { title: 'Should not load', summary: '', type: 'default' }
    },
  })

  const rows = await load({ topicProviders: ['SystemBulletin'] })
  assert.equal(detailCalls, 0)
  assert.equal(rows[0].topicName, 'English title')
  assert.equal(rows[0].message, 'English summary')
})

test('refetches when an i18n snapshot is missing the active language', async () => {
  let detailCalls = 0
  const load = await loadLoader({
    unread: [{
      id: 'notice-3',
      topicProvider: 'SystemBulletin',
      topicName: '中文标题',
      message: '中文摘要',
      state: 'unread',
      detail: {
        bulletinId: 'bulletin-3',
        publishVersion: 1,
        title: '中文标题',
        summary: '中文摘要',
        others: { i18n: { title: { zh: '中文标题' }, summary: { zh: '中文摘要' } } },
      },
    }],
    list: [],
    detail: async () => {
      detailCalls += 1
      return { title: 'English title', summary: 'English summary', type: 'default' }
    },
  })

  const rows = await load({ topicProviders: ['SystemBulletin'] })
  assert.equal(detailCalls, 1)
  assert.equal(rows[0].topicName, 'English title')
  assert.equal(rows[0].message, 'English summary')
})

const loadRegister = async (resolveImpl) => {
  const source = await readFile(resolve(import.meta.dirname, '../views/system/Announcement/register.ts'), 'utf8')
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText
  const exports = {}
  const dependency = (id) => {
    if (id === 'vue') return { defineAsyncComponent: () => ({}) }
    if (id === './api') return { SYSTEM_BULLETIN_PROVIDER: 'SystemBulletin' }
    if (id === './noticeListLoader') {
      return {
        loadSystemBulletinNoticeList: async () => [],
        resolveSystemBulletinNoticeTexts: resolveImpl,
      }
    }
    if (id === './realtimeNotification') return { handleSystemBulletinNotice: () => true }
    return {}
  }
  new Function('require', 'exports', js)(dependency, exports)
  return exports
}

test('registered notification-text resolver unwraps the registry context', async () => {
  const received = []
  const { getRegisterComponents } = await loadRegister(async (records) => {
    received.push(records)
    return records
  })
  const action = getRegisterComponents().find(item => item.targetPage === 'notification-text')
  const rows = await action.props.resolver({ records: [{ id: 'notice-4' }] })
  assert.deepEqual(rows, [{ id: 'notice-4' }])
  assert.ok(Array.isArray(received[0]), 'resolver 必须收到数组入参，而不是 { records } 上下文对象')
})
