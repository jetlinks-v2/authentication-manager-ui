import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire, Module } from 'node:module'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const require = createRequire(import.meta.url)
const entry = fileURLToPath(new URL('../views/system/Announcement/register.ts', import.meta.url))
const fixtures = {
  './api': `
    export const SYSTEM_BULLETIN_PROVIDER="SystemBulletin"
    export const queryAnnouncementInbox=()=>{}
    export const queryAnnouncementInboxNoPaging=()=>{}
    export const countAnnouncementInbox=()=>{}
    export const countAnnouncementUnread=()=>{}
    export const changeAnnouncementReadState=()=>{}
    export const markAllAnnouncementsRead=()=>{}
  `,
  './localReadStore': 'export const subscribeAnnouncementReadChanges=()=>{}',
  './realtimeSubscription': 'export const subscribeAnnouncementRealtime=()=>{}',
  './noticeListLoader': 'export const loadSystemBulletinNoticeList=()=>{};export const resolveSystemBulletinNoticeTexts=()=>{}',
  './realtimeNotification': 'export const handleSystemBulletinNotice=()=>{}',
  './loginPopup': 'export const handleSystemBulletinLogin=()=>{}',
  '@jetlinks-web-core/locales': 'export default {global:{t:value=>value}}',
  './components/NotificationDetail.vue': 'export default {}',
}
const bundle = await build({
  entryPoints: [entry], bundle: true, write: false, platform: 'node', format: 'cjs', external: ['vue'],
  plugins: [{
    name: 'bulletin-registration-boundaries',
    setup(builder) {
      builder.onResolve({ filter: /.*/ }, ({ path }) => Object.hasOwn(fixtures, path) ? { path, namespace: 'fixture' } : undefined)
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({ contents: fixtures[path], loader: 'js' }))
    },
  }],
})
const mod = new Module(entry)
mod.filename = entry
mod.paths = require.resolve.paths('vue')
mod._compile(bundle.outputFiles[0].text, entry)

test('公告 provider 通过通用注册元数据声明消息中心分类，并保留原列表能力', () => {
  const items = mod.exports.getRegisterComponents()
  const provider = items.find(item => item.targetPage === 'notification-provider' && item.code === 'SystemBulletin')
  assert.equal(provider.props.messageCategory, 'announcement')
  assert.equal(typeof provider.props.listHandler, 'function')
  assert.ok(items.some(item => item.targetPage === 'notification-detail' && item.code === provider.code))
})
