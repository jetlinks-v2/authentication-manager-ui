import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadLogModule } from './logTestLoader.mjs'

const loadHandler = () => {
  const dialogs = []
  const NotificationDetail = {}
  const handler = loadLogModule('views/system/Announcement/realtimeNotification.ts', {
    vue: { h: (component, props) => ({ component, props }) },
    'ant-design-vue': { Modal: { info: options => dialogs.push(options) } },
    '@jetlinks-web-core/locales': { __esModule: true, default: { global: { t: key => key } } },
    './components/NotificationDetail.vue': { __esModule: true, default: NotificationDetail },
    './api': { parseSystemBulletinDetail: payload => payload.detail },
    './announcementI18n': { resolveAnnouncementText: (detail, field) => detail?.[field] },
    './bulletinTypeIcon': { createBulletinTypeIconNode: type => `icon:${type || 'default'}` },
  })
  return { ...handler, dialogs, NotificationDetail }
}

test('creates a typed icon node for programmatic realtime tips', () => {
  const icons = {
    FileTextOutlined: {},
    NotificationOutlined: {},
    RocketOutlined: {},
    SafetyCertificateOutlined: {},
    ToolOutlined: {},
    WarningOutlined: {},
  }
  const { createBulletinTypeIconNode } = loadLogModule(
    'views/system/Announcement/bulletinTypeIcon.ts', {
      vue: { h: (component, props) => ({ component, props }) },
      '@ant-design/icons-vue': icons,
    },
  )

  assert.deepEqual(createBulletinTypeIconNode('release'), {
    component: icons.RocketOutlined,
    props: {
      style: { color: '#1677ff' },
    },
  })
})

test('list bulletin opens the detail dialog and confirms read only from the action button', async () => {
  const { handleSystemBulletinNotice, dialogs, NotificationDetail } = loadHandler()
  const payload = {
    id: 'received-1',
    topicProvider: 'SystemBulletin',
    detail: { bulletinId: 'bulletin-1', publishVersion: 2, title: '发布公告' },
  }
  let reads = 0

  assert.equal(handleSystemBulletinNotice({
    payload,
    source: 'list',
    markRead: async () => { reads += 1 },
  }), true)
  assert.equal(dialogs.length, 1)
  assert.equal(Object.hasOwn(dialogs[0], 'title'), false)
  assert.equal(dialogs[0].width, 900)
  assert.equal(dialogs[0].content.component, NotificationDetail)
  assert.equal(dialogs[0].content.props.data, payload)
  assert.equal(reads, 0)
  await dialogs[0].onOk()
  assert.equal(reads, 1)
})

test('realtime bulletin shows a light tip and opens the detail dialog only after tip click', async () => {
  const { handleSystemBulletinNotice, dialogs } = loadHandler()
  const payload = {
    id: 'received-1',
    topicProvider: 'SystemBulletin',
    message: '摘要',
    detail: { title: '发布公告', summary: '摘要', type: 'release' },
  }
  const tips = []
  let reads = 0

  assert.equal(handleSystemBulletinNotice({
    payload,
    source: 'realtime',
    showTip: tip => tips.push(tip),
    markRead: async () => { reads += 1 },
  }), true)
  assert.equal(dialogs.length, 0)
  assert.equal(tips.length, 1)
  assert.equal(tips[0].title, '发布公告')
  assert.equal(tips[0].description, '摘要')
  assert.equal(tips[0].icon, 'icon:release')

  tips[0].onClick()
  assert.equal(dialogs.length, 1)
  assert.equal(reads, 0)
  await dialogs[0].onOk()
  assert.equal(reads, 1)
})

test('registered bulletin handling suppresses the generic fallback and ignores other providers', async () => {
  const { handleSystemBulletinNotice, dialogs } = loadHandler()
  const { handleRegisteredRealtimeNotice } = loadLogModule(
    '../../jetlinks-web-core/src/layout/components/noticeRealtimeHandler.ts', {
      '@jetlinks-web-core/utils/components-registry': { componentsRegistry: {
        getRegistry: () => [{ code: 'SystemBulletin', props: { handler: handleSystemBulletinNotice } }],
      } },
    },
  )
  const tips = []
  const context = {
    source: 'realtime',
    markRead: async () => {},
    refresh: () => {},
    showTip: tip => tips.push(tip),
  }

  assert.equal(await handleRegisteredRealtimeNotice(
    { id: 'bulletin-1', topicProvider: 'SystemBulletin', topicName: '公告' }, context,
  ), true)
  assert.equal(tips.length, 1)
  assert.equal(dialogs.length, 0)
  assert.equal(await handleRegisteredRealtimeNotice(
    { id: 'message-1', topicProvider: 'OtherProvider' }, context,
  ), false)
})
