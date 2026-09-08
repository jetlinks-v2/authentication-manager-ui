import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { test } from 'node:test'

const moduleRoot = resolve(import.meta.dirname, '..')
const workspaceRoot = resolve(moduleRoot, '../../..')
const coreRoot = resolve(workspaceRoot, 'ui/jetlinks-web-core/src')

const readSourceTree = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const sources = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return readSourceTree(path)
    if (!/\.(?:ts|tsx|vue|js|jsx|json|less|css)$/.test(entry.name)) return ''
    return readFile(path, 'utf8')
  }))
  return sources.join('\n')
}

const [apiSource, registerSource, inboxSource, realtimeSource, notificationDetailSource, announcementDetailSource, noticeListLoaderSource, moduleSource, moduleMenuSource, saasMenuSource, managementSource, pageSource, saasCenterSource, projectCenterSource, projectMessageSource, coreSource, coreCenterSource, coreRecordSource, coreSubscriptionSource, coreDialogSource, coreNoticeSource, coreNoticeItemSource, coreRealtimeSource, coreNoticeInfoSource, coreNoticeListHandlerSource] = await Promise.all([
  readFile(resolve(moduleRoot, 'views/system/Announcement/api.ts'), 'utf8'),
  readFile(resolve(moduleRoot, 'views/system/Announcement/register.ts'), 'utf8'),
  readFile(resolve(moduleRoot, 'views/system/Announcement/components/AnnouncementInbox.vue'), 'utf8'),
  readFile(resolve(moduleRoot, 'views/system/Announcement/realtimeNotification.ts'), 'utf8'),
  readFile(resolve(moduleRoot, 'views/system/Announcement/components/NotificationDetail.vue'), 'utf8'),
  readFile(resolve(moduleRoot, 'views/system/Announcement/components/AnnouncementDetail.vue'), 'utf8'),
  readFile(resolve(moduleRoot, 'views/system/Announcement/noticeListLoader.ts'), 'utf8'),
  readFile(resolve(moduleRoot, 'index.ts'), 'utf8'),
  readFile(resolve(moduleRoot, 'baseMenu.json'), 'utf8'),
  readFile(resolve(workspaceRoot, 'ui/modules/saas-manager-ui/baseMenu.json'), 'utf8'),
  readFile(resolve(moduleRoot, 'views/system/Announcement/components/ManagementView.vue'), 'utf8'),
  readFile(resolve(moduleRoot, 'views/system/Announcement/index.vue'), 'utf8'),
  readFile(resolve(workspaceRoot, 'ui/modules/saas-manager-ui/views/personalCenter/index.vue'), 'utf8'),
  readFile(resolve(workspaceRoot, 'ui/modules/project-side-ui/views/PersonCenter/index.vue'), 'utf8'),
  readFile(resolve(workspaceRoot, 'ui/modules/project-side-ui/views/PersonCenter/components/StationMessage.vue'), 'utf8'),
  readSourceTree(coreRoot),
  readFile(resolve(workspaceRoot, 'ui/jetlinks-web-core/src/api/account/center.ts'), 'utf8'),
  readFile(resolve(workspaceRoot, 'ui/jetlinks-web-core/src/api/account/notificationRecord.ts'), 'utf8'),
  readFile(resolve(workspaceRoot, 'ui/jetlinks-web-core/src/api/account/notificationSubscription.ts'), 'utf8'),
  readFile(resolve(workspaceRoot, 'ui/jetlinks-web-core/src/views/account/center/components/StationMessage/components/NotificationRecord/components/ViewDialog.vue'), 'utf8'),
  readFile(resolve(workspaceRoot, 'ui/jetlinks-web-core/src/layout/components/Notice.vue'), 'utf8'),
  readFile(resolve(workspaceRoot, 'ui/jetlinks-web-core/src/layout/components/NoticeItem.vue'), 'utf8'),
  readFile(resolve(workspaceRoot, 'ui/jetlinks-web-core/src/layout/components/noticeRealtimeHandler.ts'), 'utf8'),
  readFile(resolve(workspaceRoot, 'ui/jetlinks-web-core/src/layout/components/NoticeInfo.vue'), 'utf8'),
  readFile(resolve(workspaceRoot, 'ui/jetlinks-web-core/src/layout/components/noticeListHandler.ts'), 'utf8'),
])

const findMenus = (menus, code) => menus.flatMap(menu => [
  ...(menu.code === code ? [menu] : []),
  ...findMenus(menu.children || [], code),
])

test('keeps bulletin API and notification renderer registration in authentication-manager-ui', () => {
  assert.match(apiSource, /SYSTEM_BULLETIN_PROVIDER = 'SystemBulletin'/)
  assert.match(apiSource, /post\('\/system\/bulletin\/detail\/_query'/)
  assert.doesNotMatch(apiSource, /post\('\/system\/bulletin\/_query'/)
  assert.match(apiSource, /system\/bulletin\/\$\{encodeURIComponent\(reference\.bulletinId\)\}/)
  assert.match(registerSource, /NotificationDetail\.vue/)
  assert.match(registerSource, /targetPage: 'notification-provider'/)
  assert.match(moduleSource, /views\/system\/Announcement\/register/)
})

test('renders realtime bulletin title and content without summary in a synchronous modal component', () => {
  assert.match(realtimeSource, /import NotificationDetail from '.\/components\/NotificationDetail\.vue'/)
  assert.match(realtimeSource, /content: h\(NotificationDetail/)
  assert.match(realtimeSource, /class: 'announcement-notification-modal'/)
  assert.match(realtimeSource, /appContext/)
  assert.match(realtimeSource, /onOk: \(\) => markRead\(\)/)
  assert.doesNotMatch(realtimeSource, /void markRead\(\)/)
  assert.doesNotMatch(realtimeSource, /defineAsyncComponent/)
  assert.match(realtimeSource, /payload\.topicName \|\| payload\.title \|\| payload\.message/)
  assert.match(inboxSource, /:title="getNotificationTitle\(detailRecord\)/)
  assert.match(notificationDetailSource, /detail\.content/)
  assert.match(notificationDetailSource, /class="announcement-notification-scroll"/)
  assert.match(notificationDetailSource, /max-height: min\(70dvh, 48rem\)/)
  assert.match(notificationDetailSource, /overflow-y: auto/)
  assert.match(notificationDetailSource, /\.announcement-notification-modal \.ant-modal-confirm-content/)
  assert.match(notificationDetailSource, /max-width: 100%/)
  assert.doesNotMatch(notificationDetailSource, /<a-divider/)
  assert.doesNotMatch(notificationDetailSource, /detail\.title/)
  assert.doesNotMatch(notificationDetailSource, /detail\.summary/)
})

test('uses the bulletin title and internal scrolling for management details', () => {
  assert.match(pageSource, /:title="detailRecord\?\.title \|\| \$t\('Announcement\.action\.view'\)"/)
  assert.match(announcementDetailSource, /class="announcement-detail-scroll"/)
  assert.match(announcementDetailSource, /max-height: min\(70dvh, 48rem\)/)
  assert.match(announcementDetailSource, /overflow-y: auto/)
  assert.doesNotMatch(announcementDetailSource, /<a-divider/)
  assert.doesNotMatch(announcementDetailSource, /record\.title/)
})

test('loads all unread bulletins before the five latest read bulletins in the bell', () => {
  assert.match(registerSource, /props: \{ listHandler: loadSystemBulletinNoticeList \}/)
  assert.match(noticeListLoaderSource, /const READ_NOTICE_LIMIT = 5/)
  assert.match(noticeListLoaderSource, /getUnreadNoPagingList_api\(\{\s*paging: false,/)
  assert.match(noticeListLoaderSource, /pageSize: READ_NOTICE_LIMIT/)
  assert.match(noticeListLoaderSource, /\{ column: 'state', termType: 'eq', value: 'read' \}/)
  assert.match(noticeListLoaderSource, /filter\(record => stateValue\(record\) === 'unread'\)/)
  assert.match(noticeListLoaderSource, /filter\(record => stateValue\(record\) === 'read'\)/)
  assert.match(noticeListLoaderSource, /sort\(byNotifyTimeDesc\)/)
  assert.match(noticeListLoaderSource, /return mergeNoticeGroups\(unread, read\)/)
  assert.match(coreNoticeListHandlerSource, /notification-provider:default/)
  assert.match(coreNoticeListHandlerSource, /handlers\.some\(current => current !== handler\)/)
  assert.match(coreNoticeInfoSource, /loadRegisteredNoticeList\(providers, DROPDOWN_PAGE_SIZE\)/)
  assert.match(coreNoticeInfoSource, /result => result \?\? defaultNoticeList\(providers\)/)
  assert.match(coreNoticeInfoSource, /const currentRequestId = \+\+listRequestId/)
})

test('registers one bulletin inbox for both personal-center hosts', () => {
  assert.match(registerSource, /inboxRegistration\('account\/center'\)/)
  assert.match(registerSource, /inboxRegistration\('systemConfig\/personCenter'\)/)
  assert.match(registerSource, /AnnouncementInbox\.vue/)
  assert.match(inboxSource, /queryAnnouncementInbox/)
  assert.match(inboxSource, /NotificationDetail/)
  assert.match(saasCenterSource, /useRegistryOptions/)
  assert.match(saasCenterSource, /RegistryComponent/)
  assert.match(projectCenterSource, /useRegistryOptions/)
  assert.match(projectCenterSource, /RegistryComponent/)
  assert.match(projectMessageSource, /excludeProviders/)
  assert.doesNotMatch(saasCenterSource, /SystemBulletin|system\/bulletin/)
  assert.doesNotMatch(projectCenterSource, /SystemBulletin|system\/bulletin/)
  assert.doesNotMatch(projectMessageSource, /SystemBulletin|system\/bulletin/)
})

test('shows bulletin title and summary as separate columns with visible inbox actions', () => {
  assert.match(managementSource, /key: 'announcementTitle'/)
  assert.match(managementSource, /#announcementTitle="record"/)
  assert.match(managementSource, /dataIndex: 'summary'/)
  assert.match(managementSource, /key: 'announcementSummary'/)
  assert.match(managementSource, /#announcementSummary="record"/)
  assert.doesNotMatch(managementSource, /#(?:title|summary)=/)
  assert.match(managementSource, /:line-clamp="1"/)
  assert.match(managementSource, /:tooltip="\{ placement: 'topLeft' \}"/)
  assert.doesNotMatch(managementSource, /announcement-title-cell__summary/)
  assert.match(inboxSource, /dataIndex: 'title'/)
  assert.match(inboxSource, /key: 'announcementTitle'/)
  assert.match(inboxSource, /#announcementTitle="record"/)
  assert.match(inboxSource, /dataIndex: 'summary'/)
  assert.match(inboxSource, /key: 'announcementSummary'/)
  assert.match(inboxSource, /#announcementSummary="record"/)
  assert.doesNotMatch(inboxSource, /#(?:title|summary)=/)
  assert.match(inboxSource, /:line-clamp="1"/)
  assert.match(inboxSource, /:tooltip="\{ placement: 'topLeft' \}"/)
  assert.match(inboxSource, /v-if="record\.state\?\.value === 'unread'"/)
  assert.match(inboxSource, /:tooltip="\{ title: \$t\('Announcement\.inbox\.markRead'\) \}"/)
  assert.match(inboxSource, /:tooltip="\{ title: \$t\('Announcement\.inbox\.view'\) \}"/)
  assert.match(inboxSource, /Announcement\.inbox\.markRead/)
  assert.match(inboxSource, /Announcement\.inbox\.view/)
  assert.doesNotMatch(inboxSource, /Announcement\.inbox\.markUnread|_unread/)
  assert.doesNotMatch(inboxSource, /\{\{\s*\$t\('Announcement\.inbox\.(?:markRead|view)'\)\s*\}\}/)
})

test('keeps only project menu metadata in the owner module and operations binding in saas', () => {
  const ownerMenus = findMenus(JSON.parse(moduleMenuSource), 'system/Announcement')
  const saasMenus = findMenus(JSON.parse(saasMenuSource), 'system/Announcement')
  assert.equal(ownerMenus.length, 1)
  assert.equal(ownerMenus[0].owner, 'cloud')
  assert.equal(saasMenus.length, 1)
  assert.equal(saasMenus[0].owner, 'iot')
  assert.equal(saasMenus[0].options?.appName, 'authentication-manager')
})

test('publishes from the management row through deploy endpoint after confirmation', () => {
  assert.match(managementSource, /Announcement\.confirm\.publish/)
  assert.match(managementSource, /onConfirm: \(\) => \$emit\('publish', record\)/)
  assert.match(pageSource, /publishAnnouncementApi\(record\.id\)/)
  assert.doesNotMatch(pageSource, /editingRecord\.value = await getAnnouncement\(record\.id\)/)
})

test('keeps web-core notification handling business-neutral', () => {
  assert.doesNotMatch(coreSource, /SystemBulletin|systemBulletin|system\/bulletin|AnnouncementHistory/)
  assert.doesNotMatch(coreCenterSource, /SystemBulletin|systemBulletin|system\/bulletin/)
  assert.doesNotMatch(coreRecordSource, /SystemBulletin|system\/bulletin/)
  assert.doesNotMatch(coreSubscriptionSource, /SystemBulletin|system\/bulletin/)
  assert.doesNotMatch(coreDialogSource, /SystemBulletin|systemBulletin|system\/bulletin/)
  assert.doesNotMatch(coreNoticeSource, /SystemBulletin|systemBulletin|system\/bulletin/)
  assert.match(coreNoticeSource, /appContext/)
  assert.match(coreNoticeItemSource, /appContext/)
  assert.match(coreNoticeItemSource, /v-if="state === 'unread'"/)
  assert.match(coreNoticeItemSource, /CheckCircleOutlined/)
  assert.match(coreNoticeItemSource, /EyeOutlined/)
  assert.match(coreNoticeItemSource, /components\.NoticeItem\.265390-2/)
  assert.match(coreNoticeItemSource, /<a\s+class="list-item__action"\s+role="button"/)
  assert.doesNotMatch(coreNoticeItemSource, /<a-button class="list-item__(?:state-)?action"/)
  assert.match(coreNoticeItemSource, /format\('YYYY-MM-DD HH:mm:ss'\)/)
  assert.match(coreNoticeItemSource, /color: var\(--jet-theme-text-disabled\)/)
  assert.doesNotMatch(coreNoticeItemSource, /_unread/)
  assert.match(coreRealtimeSource, /appContext/)
})
