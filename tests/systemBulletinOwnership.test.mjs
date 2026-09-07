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

const [apiSource, registerSource, inboxSource, moduleSource, moduleMenuSource, saasMenuSource, managementSource, pageSource, saasCenterSource, projectCenterSource, projectMessageSource, coreSource, coreCenterSource, coreRecordSource, coreSubscriptionSource, coreDialogSource, coreNoticeSource] = await Promise.all([
  readFile(resolve(moduleRoot, 'views/system/Announcement/api.ts'), 'utf8'),
  readFile(resolve(moduleRoot, 'views/system/Announcement/register.ts'), 'utf8'),
  readFile(resolve(moduleRoot, 'views/system/Announcement/components/AnnouncementInbox.vue'), 'utf8'),
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
})
