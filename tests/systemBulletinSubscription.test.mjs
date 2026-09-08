import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { test } from 'node:test'

const workspaceRoot = resolve(import.meta.dirname, '../../../..')
const read = path => readFile(resolve(workspaceRoot, path), 'utf8')

const [providerApi, subscriptionApi, saasAccount, projectAccount, ownerComponent] = await Promise.all([
  read('ui/modules/authentication-manager-ui/views/system/Announcement/api.ts'),
  read('ui/jetlinks-web-core/src/api/account/notificationSubscription.ts'),
  read('ui/modules/saas-manager-ui/views/personalCenter/components/AccountContent.vue'),
  read('ui/modules/project-side-ui/views/PersonCenter/components/AccountInfo.vue'),
  read('ui/modules/authentication-manager-ui/views/system/Announcement/components/SystemBulletinSubscription.vue'),
])

test('uses the existing provider constant and generic subscription endpoints', () => {
  assert.match(ownerComponent, /SYSTEM_BULLETIN_PROVIDER/)
  assert.match(providerApi, /SYSTEM_BULLETIN_PROVIDER = 'SystemBulletin'/)
  assert.match(providerApi, /SYSTEM_BULLETIN_CHANNEL = 'inside-mail'/)
  assert.match(ownerComponent, /item\.provider === SYSTEM_BULLETIN_PROVIDER/)
  assert.doesNotMatch(ownerComponent, /item\.type\?\.id === SYSTEM_BULLETIN_PROVIDER/)
  assert.match(subscriptionApi, /notifications\/subscriptions\/_query/)
  assert.match(subscriptionApi, /notifications\/subscribe/)
  assert.match(subscriptionApi, /notifications\/subscription\//)
})

test('limits queries and create payloads to the bulletin provider', () => {
  assert.match(ownerComponent, /column: 'topicProvider'.*termType: 'eq'.*SYSTEM_BULLETIN_PROVIDER/s)
  assert.match(ownerComponent, /item\.topicProvider === SYSTEM_BULLETIN_PROVIDER/)
  assert.match(ownerComponent, /topicProvider: SYSTEM_BULLETIN_PROVIDER/)
  assert.match(ownerComponent, /channel\.channelProvider === SYSTEM_BULLETIN_CHANNEL/)
})

test('exposes one system-bulletin entry from both personal-center account areas', () => {
  assert.equal((saasAccount.match(/<SystemBulletinSubscription/g) || []).length, 1)
  assert.equal((projectAccount.match(/<SystemBulletinSubscription/g) || []).length, 1)
})

test('creates or restores on enable and preserves the entity on disable', () => {
  assert.match(ownerComponent, /subscription\.value\?\.id/)
  assert.match(ownerComponent, /const nextEnabled = checked === true/)
  assert.match(ownerComponent, /changeSubscriptionState_api\(subscription\.value\.id, nextEnabled \? 'enabled' : 'disabled'\)/)
  assert.match(ownerComponent, /else if \(nextEnabled && provider\.value\)/)
  assert.match(ownerComponent, /await save_api\(/)
  assert.doesNotMatch(ownerComponent, /deleteSubscription|request\.remove/)
})

test('keeps the shared core free of announcement constants', () => {
  assert.doesNotMatch(subscriptionApi, /SystemBulletin|inside-mail/)
})
