import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { test } from 'node:test'

const workspaceRoot = resolve(import.meta.dirname, '../../../..')
const read = path => readFile(resolve(workspaceRoot, path), 'utf8')

const [providerApi, subscriptionApi, saasCenter, projectCenter, saasAccount, subscribeItem, inbox, registration, coreZh, coreEn, saasZh, saasEn] = await Promise.all([
  read('ui/modules/authentication-manager-ui/views/system/Announcement/api.ts'),
  read('ui/jetlinks-web-core/src/api/account/notificationSubscription.ts'),
  read('ui/modules/saas-manager-ui/views/personalCenter/index.vue'),
  read('ui/modules/project-side-ui/views/PersonCenter/index.vue'),
  read('ui/modules/saas-manager-ui/views/personalCenter/components/AccountContent.vue'),
  read('ui/jetlinks-web-core/src/views/account/center/components/Subscribe/components/Item.vue'),
  read('ui/modules/authentication-manager-ui/views/system/Announcement/components/AnnouncementInbox.vue'),
  read('ui/modules/authentication-manager-ui/views/system/Announcement/register.ts'),
  read('ui/jetlinks-web-core/src/locales/lang/zh.json'),
  read('ui/jetlinks-web-core/src/locales/lang/en.json'),
  read('ui/modules/saas-manager-ui/locales/lang/zh.json'),
  read('ui/modules/saas-manager-ui/locales/lang/en.json'),
])

test('uses the existing provider constant and generic subscription endpoints', () => {
  assert.match(providerApi, /SYSTEM_BULLETIN_PROVIDER = 'SystemBulletin'/)
  assert.match(providerApi, /SYSTEM_BULLETIN_CHANNEL = 'inside-mail'/)
  assert.match(subscriptionApi, /notifications\/subscriptions\/_query/)
  assert.match(subscriptionApi, /notifications\/subscribe/)
  assert.match(subscriptionApi, /notifications\/subscription\//)
})

test('reuses the same core subscription page in both personal-center hosts', () => {
  const subscribeImport = /import Subscribe from '@jetlinks-web-core\/views\/account\/center\/components\/Subscribe\/index\.vue'/
  assert.match(saasCenter, subscribeImport)
  assert.match(projectCenter, subscribeImport)
  assert.match(saasCenter, /label: t\('center\.data\.756829-0'\),\s*value: 'subscribe'/)
  assert.match(projectCenter, /label: i18n\.global\.t\('center\.data\.756829-0'\), value: 'subscribe'/)
  assert.match(saasCenter, /<Subscribe v-else-if="activeKey === 'subscribe'" \/>/)
  assert.match(projectCenter, /<Subscribe v-else-if="activeKey === 'subscribe'" \/>/)
})

test('uses one message-center and subscription vocabulary in both locales', () => {
  assert.equal(JSON.parse(coreZh)['center.data.756829-0'], '消息订阅')
  assert.equal(JSON.parse(coreEn)['center.data.756829-0'], 'Message Subscriptions')
  assert.equal(JSON.parse(saasZh)['SaasRoute.messageCenter'], '消息中心')
  assert.equal(JSON.parse(saasEn)['SaasRoute.messageCenter'], 'Message center')
})

test('restores disabled subscriptions through the generic subscription page', () => {
  assert.match(subscribeItem, /typeof state === 'string' \? state : state\?\.value/)
  assert.match(subscribeItem, /subscriptionState\.value === 'disabled'[\s\S]*return \[\]/)
  assert.match(subscribeItem, /const channels = new Set\([\s\S]*props\.subscribe \? props\.subscribe\.notifyChannels \|\| \[\] : notifyChannels\.value/)
  assert.match(subscribeItem, /channels\.add\(obj\?\.id\)/)
  assert.match(subscribeItem, /\.\.\.props\.subscribe,[\s\S]*state: 'enabled',[\s\S]*notifyChannels: \[\.\.\.channels\]/)
})

test('shows provider defaults until the user saves an explicit preference', () => {
  assert.match(subscribeItem, /if \(props\.subscribe\) \{[\s\S]*return props\.subscribe\.notifyChannels \|\| \[\]/)
  assert.match(subscribeItem, /props\.data\?\.defaultSubscribed[\s\S]*props\.data\?\.defaultNotifyChannels \|\| \[\]/)
  assert.match(subscribeItem, /const _set = new Set\([\s\S]*props\.subscribe \? props\.subscribe\.notifyChannels \|\| \[\] : notifyChannels\.value/)
})

test('removes announcement-specific personal-center subscription UI', () => {
  assert.doesNotMatch(saasAccount, /SystemBulletinSubscription|login-item--bulletin/)
  assert.doesNotMatch(inbox, /SystemBulletinSubscription|showSubscription|has-subscription|is-compact/)
  assert.doesNotMatch(registration, /inboxRegistration|AnnouncementInbox\.vue|targetModule: 'segments'/)
})

test('keeps the shared subscription API and component free of announcement constants', () => {
  assert.doesNotMatch(subscriptionApi, /SystemBulletin|inside-mail/)
  assert.doesNotMatch(subscribeItem, /SystemBulletin/)
})
