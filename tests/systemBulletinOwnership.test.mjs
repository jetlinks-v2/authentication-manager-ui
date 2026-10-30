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

const [apiSource, registerSource, inboxSource, realtimeSource, notificationDetailSource, announcementDetailSource, noticeListLoaderSource, bulletinTypeIconSource, moduleSource, moduleMenuSource, saasMenuSource, managementSource, pageSource, saasCenterSource, projectCenterSource, coreSource, coreCenterSource, coreRecordSource, coreSubscriptionSource, coreDialogSource, coreNoticeSource, coreNoticeItemSource, coreRealtimeSource, coreNoticeInfoSource, coreNoticeListHandlerSource, zhLocaleSource, enLocaleSource, saasMessageContentSource, projectMessageListSource] = await Promise.all([
  readFile(resolve(moduleRoot, 'views/system/Announcement/api.ts'), 'utf8'),
  readFile(resolve(moduleRoot, 'views/system/Announcement/register.ts'), 'utf8'),
  readFile(resolve(moduleRoot, 'views/system/Announcement/components/AnnouncementInbox.vue'), 'utf8'),
  readFile(resolve(moduleRoot, 'views/system/Announcement/realtimeNotification.ts'), 'utf8'),
  readFile(resolve(moduleRoot, 'views/system/Announcement/components/NotificationDetail.vue'), 'utf8'),
  readFile(resolve(moduleRoot, 'views/system/Announcement/components/AnnouncementDetail.vue'), 'utf8'),
  readFile(resolve(moduleRoot, 'views/system/Announcement/noticeListLoader.ts'), 'utf8'),
  readFile(resolve(moduleRoot, 'views/system/Announcement/bulletinTypeIcon.ts'), 'utf8'),
  readFile(resolve(moduleRoot, 'index.ts'), 'utf8'),
  readFile(resolve(moduleRoot, 'baseMenu.json'), 'utf8'),
  readFile(resolve(workspaceRoot, 'ui/modules/saas-manager-ui/baseMenu.json'), 'utf8'),
  readFile(resolve(moduleRoot, 'views/system/Announcement/components/ManagementView.vue'), 'utf8'),
  readFile(resolve(moduleRoot, 'views/system/Announcement/index.vue'), 'utf8'),
  readFile(resolve(workspaceRoot, 'ui/modules/saas-manager-ui/views/personalCenter/index.vue'), 'utf8'),
  readFile(resolve(workspaceRoot, 'ui/modules/project-side-ui/views/PersonCenter/index.vue'), 'utf8'),
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
  readFile(resolve(moduleRoot, 'locales/lang/zh.json'), 'utf8'),
  readFile(resolve(moduleRoot, 'locales/lang/en.json'), 'utf8'),
  readFile(resolve(workspaceRoot, 'ui/modules/saas-manager-ui/views/personalCenter/components/MessageContent.vue'), 'utf8'),
  readFile(resolve(workspaceRoot, 'ui/modules/project-side-ui/views/PersonCenter/components/StationMessage.vue'), 'utf8'),
])

const findMenus = (menus, code) => menus.flatMap(menu => [
  ...(menu.code === code ? [menu] : []),
  ...findMenus(menu.children || [], code),
])

test('keeps bulletin API and notification renderer registration in authentication-manager-ui', () => {
  assert.match(apiSource, /SYSTEM_BULLETIN_PROVIDER = 'SystemBulletin'/)
  assert.doesNotMatch(apiSource, /system\/bulletin\/type|s_bulletin_type/)
  assert.match(apiSource, /post\('\/system\/bulletin\/detail\/_query'/)
  assert.doesNotMatch(apiSource, /post\('\/system\/bulletin\/_query'/)
  assert.match(apiSource, /system\/bulletin\/\$\{encodeURIComponent\(reference\.bulletinId\)\}/)
  assert.match(apiSource, /parseSystemBulletinDetail/)
  assert.match(registerSource, /NotificationDetail\.vue/)
  assert.match(registerSource, /targetPage: 'notification-provider'/)
  assert.match(registerSource, /dataSource:/)
  assert.match(registerSource, /query: queryAnnouncementInbox/)
  assert.match(registerSource, /targetPage: 'notification-text'/)
  assert.match(registerSource, /targetPage: 'notification-login'/)
  assert.match(moduleSource, /views\/system\/Announcement\/register/)
})

test('runs popup bulletins once from the business-neutral login notification hook', async () => {
  const [loginSource, headerSource, loginCoreSource] = await Promise.all([
    readFile(resolve(moduleRoot, 'views/system/Announcement/loginPopup.ts'), 'utf8'),
    readFile(resolve(coreRoot, 'layout/components/useHeaderNotice.ts'), 'utf8'),
    readFile(resolve(coreRoot, 'layout/components/noticeLoginHandler.ts'), 'utf8'),
  ])
  assert.match(registerSource, /props: \{ handler: handleSystemBulletinLogin \}/)
  assert.match(loginSource, /queryAnnouncementInboxNoPaging/)
  assert.match(loginSource, /detail\?\.others\?\.popup !== true/)
  assert.match(loginSource, /changeAnnouncementReadState\('_read', \[record\.id\]\)/)
  assert.match(loginSource, /await showLoginPopup\(record, appContext\)/)
  assert.doesNotMatch(loginSource, /Modal\.info\(\{\s*class: 'announcement-notification-modal',\s*title:/)
  assert.match(loginSource, /sorts: \[\{ name: 'notifyTime', order: 'asc' \}\]/)
  assert.match(headerSource, /let loginHandlersStarted = false/)
  assert.match(headerSource, /!loginHandlersStarted && providers\.length/)
  assert.match(headerSource, /runRegisteredLoginNoticeHandlers/)
  assert.match(loginCoreSource, /notification-login:handlers/)
  assert.doesNotMatch(loginCoreSource, /SystemBulletin|system\/bulletin|Announcement/)
})

test('edits title, summary, type, popup and Markdown content with draft or publish intent', async () => {
  const [editorSource, i18nDialogSource] = await Promise.all([
    readFile(resolve(moduleRoot, 'views/system/Announcement/components/AnnouncementEditorDialog.vue'), 'utf8'),
    readFile(resolve(moduleRoot, 'views/system/Announcement/components/AnnouncementI18nTextDialog.vue'), 'utf8'),
  ])
  assert.match(editorSource, /Announcement\.editor\.title/)
  assert.match(editorSource, /Announcement\.editor\.summary/)
  assert.match(editorSource, /v-model:value="form\.summary"/)
  assert.match(editorSource, /Announcement\.editor\.type/)
  assert.match(editorSource, /v-model:value="form\.type"/)
  assert.match(editorSource, /<a-select[\s\S]*?:options="typeOptions"/)
  assert.match(editorSource, /BULLETIN_TYPE_VALUES\.map/)
  assert.match(editorSource, /type: ''/)
  assert.match(editorSource, /form\.type = record\?\.type \|\| ''/)
  assert.doesNotMatch(editorSource, /type: 'default'|record\?\.type \|\| 'default'/)
  assert.match(editorSource, /<AnnouncementI18nMarkdownEditor/)
  assert.match(editorSource, /v-model="form\.i18nMessages\.content"/)
  assert.match(editorSource, /:rows="14"/)
  assert.match(editorSource, /openTextI18n\('title'\)/)
  assert.match(editorSource, /openTextI18n\('summary'\)/)
  assert.doesNotMatch(editorSource, /openTextI18n\('type'\)/)
  assert.match(editorSource, /:loading="loadingAction === 'draft'"/)
  assert.match(editorSource, /:loading="loadingAction === 'publish'"/)
  assert.match(editorSource, /:disabled="!canSubmit \|\| Boolean\(loadingAction\)"/)
  assert.match(pageSource, /savingAction\.value = draft\.publish \? 'publish' : 'draft'/)
  assert.match(i18nDialogSource, /:z-index="I18N_MODAL_Z_INDEX"/)
  assert.match(i18nDialogSource, /I18N_MODAL_Z_INDEX = 1100/)
  assert.match(editorSource, /Announcement\.editor\.popup/)
  assert.match(editorSource, /v-model:checked="form\.popup"/)
  assert.match(editorSource, /submit\(false\)/)
  assert.match(editorSource, /submit\(true\)/)
  assert.match(editorSource, /Announcement\.action\.saveDraft/)
  assert.match(editorSource, /Announcement\.action\.savePublish/)
  assert.doesNotMatch(editorSource, /Announcement\.editor\.(?:users|organizations)/)
  assert.doesNotMatch(editorSource, /form\.(?:userIds|organizationIds)/)
  assert.doesNotMatch(apiSource, /allVisible: true/)
  assert.match(apiSource, /others: \{[\s\S]*?\.\.\.\(draft\.others \|\| \{\}\),[\s\S]*?popup: draft\.popup,[\s\S]*?deliveryScope:/)
  assert.match(apiSource, /saas: draft\.deliveryScope\.saas/)
  assert.match(apiSource, /regionIds: \[\.\.\.new Set\(draft\.deliveryScope\.regionIds\)\]/)
  assert.match(apiSource, /\} = buildAnnouncementI18nFields\(draft\)/)
  assert.match(apiSource, /\n    type,\n/)
  assert.match(editorSource, /type: form\.type\.trim\(\)/)
  assert.match(apiSource, /summary: summary \|\| undefined/)
  assert.match(apiSource, /request\.put\(\s*'\/saas\/bulletin\/_deploy'/)
  assert.doesNotMatch(apiSource, /dimension: \[\], deployType: 'now'/)
  assert.match(pageSource, /const savedId = await saveAnnouncementApi\(draft\)/)
  assert.match(pageSource, /await publishAnnouncementApi\(savedId, draft\.deliveryScope\)/)
  assert.match(editorSource, /publish,/)
})

test('shows one typed realtime tip and opens the bulletin detail after clicking it', () => {
  assert.match(realtimeSource, /import NotificationDetail from '.\/components\/NotificationDetail\.vue'/)
  assert.match(realtimeSource, /content: h\(NotificationDetail/)
  assert.match(realtimeSource, /class: 'announcement-notification-modal'/)
  assert.match(realtimeSource, /appContext/)
  assert.match(realtimeSource, /onOk: \(\) => generation === dialogGeneration \? markRead\(\) : undefined/)
  assert.doesNotMatch(realtimeSource, /void markRead\(\)/)
  assert.doesNotMatch(realtimeSource, /defineAsyncComponent/)
  assert.match(registerSource, /props: \{ handler: handleSystemBulletinNotice \}/)
  assert.match(realtimeSource, /source !== 'realtime' \|\| !showTip/)
  assert.match(realtimeSource, /onClick: \(\) => openAnnouncementDetail\(context\)/)
  assert.match(realtimeSource, /createBulletinTypeIconNode\(parseSystemBulletinDetail\(payload\)\?\.type\)/)
  assert.match(realtimeSource, /showTip\(\{[\s\S]*?title,/)
  assert.match(realtimeSource, /description: summary && summary !== title \? summary : undefined/)
  assert.doesNotMatch(realtimeSource, /Modal\.info\([\s\S]*\{\s*payload\.message\s*\}/)
  assert.match(inboxSource, /:title="getNotificationTitle\(detailRecord\)/)
  assert.match(notificationDetailSource, /detail\.content/)
  assert.match(notificationDetailSource, /class="announcement-notification-scroll"/)
  assert.match(notificationDetailSource, /max-height: min\(70dvh, 48rem\)/)
  assert.match(notificationDetailSource, /overflow-y: auto/)
  assert.match(notificationDetailSource, /\.announcement-notification-modal \.ant-modal-confirm-content/)
  assert.match(notificationDetailSource, /max-width: 100%/)
  assert.match(notificationDetailSource, /class="announcement-notification-dialog-header"/)
  assert.match(notificationDetailSource, /\{\{ detail\.title \}\}/)
  assert.match(notificationDetailSource, /class="announcement-notification-dialog-header__type"/)
  assert.match(notificationDetailSource, /\{\{ detail\.typeText \|\| detail\.type \}\}/)
  assert.match(notificationDetailSource, /dayjs\(detail\.deployTime\)\.format\('YYYY-MM-DD HH:mm:ss'\)/)
  assert.match(notificationDetailSource, /max-height: min\(55dvh, 32rem\)/)
  assert.match(notificationDetailSource, /justify-content: center/)
  assert.match(notificationDetailSource, /min-width: 12rem/)
  assert.match(notificationDetailSource, /\.ant-modal-content \{[\s\S]*?padding: 0;/)
  assert.match(notificationDetailSource, /border-radius: var\(--r-pill\)/)
  assert.doesNotMatch(realtimeSource, /title: resolveNoticeTitle\(payload\) \|\| i18n/)
  assert.doesNotMatch(notificationDetailSource, /<a-divider/)
  assert.doesNotMatch(notificationDetailSource, /detail\.summary/)
})

test('maps fixed and historical bulletin types to one icon vocabulary with a default fallback', () => {
  assert.match(bulletinTypeIconSource, /BULLETIN_TYPE_VALUES = \['maintenance', 'release', 'campaign', 'policy'\]/)
  assert.match(bulletinTypeIconSource, /default: 'NotificationOutlined'/)
  assert.match(bulletinTypeIconSource, /maintenance: 'ToolOutlined'/)
  assert.match(bulletinTypeIconSource, /incident: 'WarningOutlined'/)
  assert.match(bulletinTypeIconSource, /release: 'RocketOutlined'/)
  assert.match(bulletinTypeIconSource, /campaign: 'NotificationOutlined'/)
  assert.match(bulletinTypeIconSource, /security: 'SafetyCertificateOutlined'/)
  assert.match(bulletinTypeIconSource, /policy: 'FileTextOutlined'/)
  assert.match(bulletinTypeIconSource, /DEFAULT_BULLETIN_TYPE_ICON = 'NotificationOutlined'/)
  assert.match(bulletinTypeIconSource, /BULLETIN_TYPE_ICONS\[String\(value \?\? ''\)\.trim\(\)\] \|\| DEFAULT_BULLETIN_TYPE_ICON/)
  assert.doesNotMatch(bulletinTypeIconSource, /billing|urgent|severity/)
  assert.match(realtimeSource, /createBulletinTypeIconNode/)
  assert.match(noticeListLoaderSource, /topicName: title/)
  assert.match(noticeListLoaderSource, /noticeTag: typeText/)
  assert.match(noticeListLoaderSource, /noticeIcon: resolveBulletinTypeIcon\(type\)/)
  assert.match(notificationDetailSource, /const typeIcon = computed\(\(\) => resolveBulletinTypeIcon\(detail\.value\?\.type\)\)/)
  assert.match(notificationDetailSource, /<AIcon :type="typeIcon" \/>/)
})

test('stores localized title, summary, type and Markdown content', async () => {
  const [editorSource, i18nSource, zhLocale, enLocale] = await Promise.all([
    readFile(resolve(moduleRoot, 'views/system/Announcement/components/AnnouncementEditorDialog.vue'), 'utf8'),
    readFile(resolve(moduleRoot, 'views/system/Announcement/announcementI18n.ts'), 'utf8'),
    readFile(resolve(moduleRoot, 'locales/lang/zh.json'), 'utf8'),
    readFile(resolve(moduleRoot, 'locales/lang/en.json'), 'utf8'),
  ])

  assert.match(apiSource, /resolveAnnouncementText\(record, 'title'\)/)
  assert.match(apiSource, /buildAnnouncementI18nFields\(draft\)/)
  assert.match(apiSource, /legacyTitle: record\.title/)
  assert.match(i18nSource, /getAnnouncementI18n/)
  assert.match(i18nSource, /messages\[normalizedLocale\], messages\[language\]/)
  assert.match(editorSource, /<AnnouncementI18nMarkdownEditor/)
  assert.match(editorSource, /v-model="form\.i18nMessages\.content"/)
  assert.match(editorSource, /AnnouncementI18nTextDialog/)
  assert.match(editorSource, /updateAnnouncementLocaleText\(i18n, 'title', currentLanguage\.value, form\.title\)/)
  assert.match(editorSource, /updateAnnouncementLocaleText\(i18n, 'summary', currentLanguage\.value, form\.summary\)/)
  assert.match(editorSource, /type: record\?\.type/)
  assert.doesNotMatch(editorSource, /delete i18n\.content/)
  assert.match(editorSource, /summary: form\.summary\.trim\(\) \|\| undefined/)
  assert.match(editorSource, /content: resolveCompatibilityText\(i18n\.content\)/)
  assert.match(i18nSource, /\['title', 'summary', 'type', 'content'\]/)
  assert.match(apiSource, /typeText: resolveAnnouncementTypeLabel/)
  assert.doesNotMatch(editorSource, /:display-value=/)
  assert.match(i18nSource, /locale === 'zh' \|\| locale === 'en'/)
  assert.equal(JSON.parse(zhLocale)['Announcement.i18n.configure'], '国际化配置')
  assert.equal(JSON.parse(enLocale)['Announcement.i18n.configure'], 'Internationalization')
  assert.equal(JSON.parse(zhLocale)['Announcement.type.campaign'], '运营活动')
  assert.equal(JSON.parse(enLocale)['Announcement.type.campaign'], 'Campaign')
})

test('uses the bulletin title and internal scrolling for management details', () => {
  assert.match(pageSource, /:title="detailTitle"/)
  assert.match(pageSource, /v-model:locale="detailLocale"/)
  assert.match(pageSource, /resolveAnnouncementText\(record, 'title', detailLocale\.value\)/)
  assert.match(announcementDetailSource, /<a-tabs v-model:activeKey="viewLocale"/)
  assert.match(announcementDetailSource, /v-for="item in languagePanes"/)
  assert.match(announcementDetailSource, /resolveAnnouncementText\(props\.record, 'content', item\.value\)/)
  assert.match(announcementDetailSource, /Announcement\.detail\.languageMissing/)
  assert.doesNotMatch(announcementDetailSource, /Announcement\.detail\.(?:summary|scope|state|creator|publishTime|type)/)
  assert.match(announcementDetailSource, /class="announcement-detail-scroll"/)
  assert.match(announcementDetailSource, /max-height: min\(70dvh, 48rem\)/)
  assert.match(announcementDetailSource, /overflow-y: auto/)
  assert.doesNotMatch(announcementDetailSource, /<a-divider/)
  assert.doesNotMatch(announcementDetailSource, /record\.title/)
})

test('loads all unread bulletins before the five latest read bulletins in the bell', () => {
  assert.match(registerSource, /listHandler: loadSystemBulletinNoticeList/)
  assert.match(noticeListLoaderSource, /const READ_NOTICE_LIMIT = 5/)
  assert.match(noticeListLoaderSource, /queryAnnouncementInboxNoPaging\(\{\s*paging: false,/)
  assert.match(noticeListLoaderSource, /pageSize: READ_NOTICE_LIMIT/)
  assert.match(noticeListLoaderSource, /\{ column: 'state', termType: 'eq', value: 'read' \}/)
  assert.match(noticeListLoaderSource, /filter\(record => stateValue\(record\) === 'unread'\)/)
  assert.match(noticeListLoaderSource, /filter\(record => stateValue\(record\) === 'read'\)/)
  assert.match(noticeListLoaderSource, /sort\(byNotifyTimeDesc\)/)
  assert.match(noticeListLoaderSource, /return resolveSystemBulletinNoticeTexts\(mergeNoticeGroups\(unread, read\)\)/)
  assert.match(coreNoticeListHandlerSource, /notification-provider:default/)
  assert.match(coreNoticeListHandlerSource, /handlers\.some\(current => current !== handler\)/)
  assert.match(coreNoticeInfoSource, /loadRegisteredNoticeList\(providers, DROPDOWN_PAGE_SIZE\)/)
  assert.match(coreNoticeInfoSource, /result => result \?\? defaultNoticeList\(providers\)/)
  assert.match(coreNoticeInfoSource, /const currentRequestId = \+\+listRequestId/)
})

test('reuses one core message center in both personal-center hosts', () => {
  const messageImport = /import StationMessage from '@jetlinks-web-core\/views\/account\/center\/components\/StationMessage\/index\.vue'/
  assert.match(saasCenterSource, messageImport)
  assert.match(projectCenterSource, messageImport)
  assert.match(saasCenterSource, /label: t\('SaasRoute\.messageCenter'\),\s*value: 'stationMessage'/)
  assert.match(projectCenterSource, /label: i18n\.global\.t\('SaasRoute\.messageCenter'\), value: 'stationMessage'/)
  assert.match(saasCenterSource, /<StationMessage v-else \/>/)
  assert.match(projectCenterSource, /<StationMessage v-if="activeKey === 'stationMessage'" \/>/)
  assert.doesNotMatch(projectCenterSource, /\.\/components\/StationMessage\.vue/)
  assert.doesNotMatch(registerSource, /inboxRegistration|AnnouncementInbox\.vue|targetModule: 'segments'/)
  assert.doesNotMatch(saasCenterSource, /SystemBulletin|system\/bulletin/)
  assert.doesNotMatch(projectCenterSource, /SystemBulletin|system\/bulletin/)
})

test('renders registered bulletin details inside the generic message-center dialog', () => {
  assert.match(registerSource, /targetPage: 'notification-detail'/)
  assert.match(registerSource, /code: SYSTEM_BULLETIN_PROVIDER/)
  assert.match(registerSource, /NotificationDetail\.vue/)
  assert.match(coreDialogSource, /page-code="notification-detail"/)
  assert.match(coreDialogSource, /code="default"/)
  assert.match(coreDialogSource, /:active-key="`\$\{data\.topicProvider\}:append`"/)
  assert.match(coreDialogSource, /:data="data"/)
  assert.match(coreDialogSource, /v-if="hasRegisteredDetail"/)
  assert.match(coreDialogSource, /v-else-if=/)
})

test('shows separated filters and list with emphasized title metadata in management', async () => {
  const filterSource = await readFile(
    resolve(moduleRoot, 'views/system/Announcement/components/AnnouncementListFilters.vue'),
    'utf8',
  )
  assert.doesNotMatch(managementSource, /PageHeader|Announcement\.title\.management/)
  assert.match(managementSource, /<FullPage v-bind="\$attrs" :flex="true" class="announcement-list-page">/)
  assert.match(managementSource, /<AnnouncementListFilters @change="applyFilters" \/>[\s\S]*<ContentPanel fill class="announcement-list-page__table-panel">/)
  assert.match(managementSource, /<template #headerLeftRender>[\s\S]*?<EmptyCreateButton \/>[\s\S]*?<\/template>/)
  assert.doesNotMatch(managementSource, /#headerRightRender/)
  assert.match(filterSource, /<ContentPanel fill class="announcement-list-filter-panel">/)
  assert.match(filterSource, /Announcement\.search\.keywordPlaceholder/)
  assert.match(filterSource, /Announcement\.search\.allStatus/)
  assert.match(filterSource, /Announcement\.action\.reset/)
  assert.match(moduleSource, /'system\/Announcement': false/)
  assert.match(managementSource, /column: 'title'/)
  assert.match(managementSource, /column: 'summary'/)
  assert.match(managementSource, /key: 'announcementTitle'/)
  assert.match(managementSource, /#announcementTitle="record"/)
  assert.match(managementSource, /record\.summary/)
  assert.match(managementSource, /dataIndex: 'state'/)
  assert.match(managementSource, /#state="record"/)
  assert.match(managementSource, /dataIndex: 'type'/)
  assert.match(managementSource, /#type="record"/)
  assert.match(managementSource, /dataIndex: 'popup'/)
  assert.match(managementSource, /#popup="record"/)
  assert.match(managementSource, /dataIndex: 'createTime'/)
  assert.match(managementSource, /#createTime="record"/)
  assert.match(managementSource, /dataIndex: 'deployTime'/)
  assert.match(managementSource, /#deployTime="record"/)
  assert.doesNotMatch(managementSource, /dataIndex: '(?:content|summary|creatorName)'/)
  assert.doesNotMatch(managementSource, /key: 'scope'/)
  assert.match(managementSource, /:line-clamp="1"/)
  assert.match(managementSource, /:tooltip="\{ placement: 'topLeft' \}"/)
  assert.match(managementSource, /announcement-title-cell__summary/)
  assert.match(managementSource, /class="announcement-title-cell__title"\s+:tooltip="\{ placement: 'topLeft' \}"/)
  assert.match(managementSource, /:deep\(\.announcement-title-cell__title\)\s*\{[\s\S]*?width: fit-content;[\s\S]*?max-width: 100%;/)
  assert.match(managementSource, /:deep\(\.announcement-title-cell__title\)\s*\{[\s\S]*?font-size: var\(--fs-20\);[\s\S]*?font-weight: 700;/)
  assert.match(managementSource, /:deep\(\.announcement-title-cell__summary\)\s*\{[\s\S]*?font-weight: 400;/)
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

test('groups website content and the single announcement menu under information', () => {
  const ownerMenus = findMenus(JSON.parse(moduleMenuSource), 'system/Announcement')
  const saasRoot = JSON.parse(saasMenuSource)
  const saasMenus = findMenus(saasRoot, 'system/Announcement')
  const operationManager = findMenus(saasRoot, 'operation/manager')[0]
  const information = findMenus(saasRoot, 'operation/information')[0]
  assert.equal(ownerMenus.length, 0)
  assert.equal(saasMenus.length, 1)
  assert.equal(information.name, '资讯与公告')
  assert.equal(information.sortIndex, 4)
  assert.equal(saasMenus[0].name, '系统公告管理')
  assert.equal(saasMenus[0].sortIndex, 2)
  assert.equal(saasMenus[0].assetType, 'systemBulletin')
  assert.equal(saasMenus[0].allVisible, undefined)
  assert.deepEqual(operationManager.children.map(menu => menu.code), [
    'operation/manager/Customer',
  ])
  assert.deepEqual(information.children.map(menu => [menu.code, menu.name, menu.sortIndex]), [
    ['operation/manager/WebsiteArticle', '官网资讯管理', 1],
    ['system/Announcement', '系统公告管理', 2],
  ])
})

test('exposes subscription management as a project runtime menu candidate', () => {
  const moduleMenus = JSON.parse(moduleMenuSource)
  const operationSystemMenu = moduleMenus.find(menu => menu.code === 'system' && menu.owner === 'iot')
  const platformSettingsMenu = operationSystemMenu?.children?.find(menu => menu.code === 'platform/settings')
  const projectMenus = findMenus(moduleMenus, 'system/NoticeRule')
  const projectMenu = platformSettingsMenu?.children?.find(menu => menu.code === 'system/NoticeRule')

  assert.equal(projectMenus.length, 1)
  assert.ok(projectMenu)
  assert.equal(projectMenu.owner, 'iot')
  assert.equal(projectMenu.url, '/system/ps/NoticeRule')
  assert.deepEqual(projectMenu.options, {})
  assert.deepEqual(projectMenu.showPage, ['notify-channel'])
  assert.equal(projectMenu.assetType, 'notifySubscriberProvider')
  assert.equal(projectMenu.accessSupport?.value, 'support')
  assert.equal(projectMenu.supportDataAccess, true)
  assert.deepEqual(projectMenu.buttons.map(button => button.id).sort(), [
    'action',
    'add',
    'delete',
    'update',
  ])
  assert.ok(projectMenu.buttons
    .find(button => button.id === 'action')
    ?.permissions.some(permission => (
      permission.permission === 'notify-channel'
      && permission.actions.includes('save')
    )))
})

test('publishes from the management row through deploy endpoint after confirmation', () => {
  assert.match(managementSource, /Announcement\.confirm\.publish/)
  assert.match(managementSource, /onConfirm: \(\) => \$emit\('publish', record\)/)
  assert.match(pageSource, /publishAnnouncementApi\(record\.id, record\.deliveryScope\)/)
  assert.doesNotMatch(pageSource, /editingRecord\.value = await getAnnouncement\(record\.id\)/)
})

test('keeps announcement actions within the backend lifecycle', () => {
  assert.match(managementSource, /v-if="record\.state === 'unpublished'"\s+has-permission="system\/Announcement:edit"/)
  assert.match(managementSource, /v-if="record\.state === 'unpublished'"\s+has-permission="system\/Announcement:publish"/)
  assert.match(managementSource, /v-if="record\.state === 'published'"\s+has-permission="system\/Announcement:view"/)
  assert.match(managementSource, /v-if="record\.state === 'published'"\s+has-permission="system\/Announcement:withdraw"/)
})

test('allows every unpublished bulletin to be deleted and hides unavailable details', () => {
  assert.match(managementSource, /v-if="record\.state === 'unpublished'"\s+has-permission="system\/Announcement:delete"/)
  assert.match(apiSource, /request\.remove\(\s*'\/system\/bulletin\/_batch'/)
  assert.match(apiSource, /\{ data: \[id\] \}/)
  assert.match(pageSource, /deleteAnnouncement\(record\.id\)/)
  assert.match(notificationDetailSource, /v-if="unavailable"[\s\S]*?Announcement\.notification\.unavailable/)
  assert.match(notificationDetailSource, /catch \{\s*if \(sequence === requestSequence\) unavailable\.value = true/)

  const zhLocale = JSON.parse(zhLocaleSource)
  const enLocale = JSON.parse(enLocaleSource)
  assert.equal(zhLocale['Announcement.confirm.delete'], '确认删除这条公告？')
  assert.equal(zhLocale['Announcement.message.deleted'], '公告已删除')
  assert.equal(enLocale['Announcement.confirm.delete'], 'Delete this announcement?')
  assert.equal(enLocale['Announcement.message.deleted'], 'Announcement deleted')
})

test('keeps web-core notification handling business-neutral', async () => {
  const headerSource = await readFile(resolve(coreRoot, 'layout/components/useHeaderNotice.ts'), 'utf8')
  assert.doesNotMatch(coreSource, /SystemBulletin|systemBulletin|system\/bulletin|AnnouncementHistory/)
  assert.doesNotMatch(coreCenterSource, /SystemBulletin|systemBulletin|system\/bulletin/)
  assert.doesNotMatch(coreRecordSource, /SystemBulletin|system\/bulletin/)
  assert.doesNotMatch(coreSubscriptionSource, /SystemBulletin|system\/bulletin/)
  assert.doesNotMatch(coreDialogSource, /SystemBulletin|systemBulletin|system\/bulletin/)
  assert.doesNotMatch(coreNoticeSource, /SystemBulletin|systemBulletin|system\/bulletin/)
  assert.match(headerSource, /appContext/)
  assert.match(coreDialogSource, /const notificationTitle = computed/)
  assert.match(coreDialogSource, /_data\.value\?\.i18nMessages\?\.title/)
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
  assert.doesNotMatch(coreSource, /icon-a-PIZHU1/)
  assert.match(coreSource, /slotProps\.state\.value === 'read'\s*\? 'MailOutlined'\s*: 'CheckCircleOutlined'/)
  assert.match(coreRealtimeSource, /appContext/)
  assert.match(coreRealtimeSource, /source: 'realtime' \| 'list'/)
  assert.match(coreRealtimeSource, /showTip\?: \(options: NoticeTipOptions\) => void/)
  assert.match(coreRealtimeSource, /export interface NoticeTipOptions/)
  assert.match(headerSource, /source: 'realtime'/)
  assert.match(headerSource, /showTip: options => showNoticeTip\(notice, options\)/)
  assert.match(headerSource, /notification\.close\(key\)/)
  assert.match(coreNoticeItemSource, /source: 'list'/)
  assert.match(coreNoticeItemSource, /const noticeIcon = computed\(\(\) => String\(props\.data\?\.noticeIcon \|\| ''\)\.trim\(\)\)/)
  assert.match(coreNoticeItemSource, /v-if="noticeIcon"[\s\S]*class="list-item__icon"[\s\S]*:style="\{ color: noticeIconColor \}"/)
  assert.match(coreNoticeItemSource, /const noticeIconColor = computed\(\(\) => String\(props\.data\?\.noticeIconColor \|\| ''\)\.trim\(\)\)/)
  assert.match(coreNoticeItemSource, /const noticeTag = computed\(\(\) => String\(props\.data\?\.noticeTag \|\| ''\)\.trim\(\)\)/)
  assert.match(coreNoticeItemSource, /<a-tag v-if="noticeTag" class="list-item__tag">\{\{ noticeTag \}\}<\/a-tag>/)
})

test('localizes generic notification list text without bulletin coupling', async () => {
  const source = await readFile(resolve(coreRoot, 'views/account/center/components/StationMessage/components/NotificationRecord/index.vue'), 'utf8')
  assert.match(source, /resolveNoticeTexts\(records\)/)
  assert.match(source, /:request="requestNotifications"/)
  assert.match(source, /resolveDetailI18nText\(detail, 'title'\)/)
  assert.match(source, /resolveDetailI18nText\(detail, 'summary'\)/)
  assert.match(source, /getNotificationSummary\(slotProps\)/)
  assert.doesNotMatch(source, /SystemBulletin|system\/bulletin/)
})

test('re-resolves notification text when the active locale changes', async () => {
  assert.match(coreNoticeInfoSource, /const \{ t: \$t, locale \} = useI18n\(\)/)
  assert.match(coreNoticeInfoSource, /watch\(locale, \(\) => \{\s*getData\(/)
  assert.match(saasMessageContentSource, /resolveNoticeTexts\(records\)/)
  assert.match(saasMessageContentSource, /:request='requestNoticeList'/)
  assert.match(saasMessageContentSource, /watch\(locale, \(\) => tableRef\.value\?\.reload\?\.\(\)\)/)
  assert.match(projectMessageListSource, /resolveNoticeTexts\(records\)/)
  assert.match(projectMessageListSource, /:request="requestNotifications"/)
  assert.match(projectMessageListSource, /watch\(globalI18n\.global\.locale, refresh\)/)
  const recordSource = await readFile(resolve(coreRoot, 'views/account/center/components/StationMessage/components/NotificationRecord/index.vue'), 'utf8')
  assert.match(recordSource, /const \{ t: \$t, locale \} = useI18n\(\)/)
  assert.match(recordSource, /watch\(locale, refresh\)/)
})

test('keeps the bell badge synchronized with the backend unread count', async () => {
  const headerSource = await readFile(resolve(coreRoot, 'layout/components/useHeaderNotice.ts'), 'utf8')
  assert.match(headerSource, /queryNoticeUnreadSummary\([\s\S]*createUnreadQueryParams\(providers, BADGE_OVERFLOW_COUNT\)[\s\S]*total\.value = toBadgeCount\(response\.result\.total\)/)
  assert.match(headerSource, /handleRealtimePayload[\s\S]*handleRegisteredRealtimeNotice[\s\S]*getList\(\)/)
  assert.match(headerSource, /watch\(visible, opened => \{[\s\S]*if \(opened\) \{[\s\S]*getList\(\)/)
  assert.match(coreNoticeSource, /<NoticeInfo[^>]*ref="noticeInfoRef"/)
  assert.match(headerSource, /noticeInfoRef\.value\?\.refresh\(\)/)
  assert.match(coreNoticeInfoSource, /defineExpose\(\{\s*refresh: onRefresh,\s*\}\)/)
  assert.doesNotMatch(headerSource, /total\.value\s*=\s*Math\.min\(total\.value\s*\+\s*1/)
})
