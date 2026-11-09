import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { transformSync } from 'esbuild'
import * as vue from 'vue'
import { loadLogModule } from './logTestLoader.mjs'

const findMenus = (menus, code) => menus.flatMap(item => [
  ...(item.code === code ? [item] : []),
  ...findMenus(item.children || [], code),
])
const localManagement = { isSaasAnnouncementManagement: () => false }
const moduleMenu = loadLogModule('baseMenu.ts', {
  './views/system/Announcement/managementContext': localManagement,
}).default()
const initializerSource = readFileSync(new URL('../../../jetlinks-web-core/src/views/init-home/Menu/index.vue', import.meta.url), 'utf8')
const filterSource = initializerSource.slice(
  initializerSource.indexOf('const filterMenuByPermission ='),
  initializerSource.indexOf('/**\n * 计算菜单数量'),
)
const { code: filterCode } = transformSync(`${filterSource}\nexport { filterMenuByPermission }`, { loader: 'ts', format: 'cjs' })
const filterModule = { exports: {} }
new Function('module', 'exports', filterCode)(filterModule, filterModule.exports)
const { filterMenuByPermission } = filterModule.exports

test('runtime initialization retains the announcement under system settings when the backend provides bulletin', () => {
  const filtered = filterMenuByPermission(['bulletin'], structuredClone(moduleMenu), true)
  const entries = findMenus(filtered, 'system/Announcement')
  assert.equal(entries.length, 1)
  const entry = entries[0]
  const system = filtered.find(item => item.code === 'system')
  assert.ok(system.children.includes(entry))
  assert.equal(entry.owner, 'iot')
  assert.equal(entry.assetType, 'systemBulletin')
  assert.equal(entry.supportDataAccess, true)
  assert.deepEqual(entry.permissions, [{ permission: 'bulletin', actions: ['query', 'save', 'delete'] }])
  assert.deepEqual(entry.buttons.map(button => button.id), ['add', 'view', 'edit', 'publish', 'withdraw', 'delete'])
  assert.equal(entry.options.appName, 'authentication-manager')
  assert.equal(entry.url, '/system/ps/Announcement')
})

test('runtime initialization omits announcement when the backend bulletin capability is absent', () => {
  const filtered = filterMenuByPermission(['menu', 'role'], structuredClone(moduleMenu), true)
  assert.deepEqual(findMenus(filtered, 'system/Announcement'), [])
})

const contexts = [
  { name: 'SaaS', privateDeployment: false, project: false, cloud: false, saas: true },
  { name: 'private', privateDeployment: true, project: false, cloud: false, saas: false },
  { name: 'project', privateDeployment: false, project: true, cloud: false, saas: false },
  { name: 'cloud proxy', privateDeployment: false, project: false, cloud: true, saas: false },
]

function fixture(context) {
  const calls = []
  const management = loadLogModule('views/system/Announcement/managementContext.ts', {
    '@jetlinks-web-core/utils/deployment': { isPrivateDeployment: () => context.privateDeployment },
    '@jetlinks-web-core/utils/project-runtime': { isProjectRuntime: () => context.project },
    '@jetlinks-web-core/utils/request-context': { isFromCloud: () => context.cloud },
  })
  const api = loadLogModule('views/system/Announcement/api.ts', {
    './bulletinCapability': { isAnnouncementSupported: async () => true },
    './managementContext': management,
    './receivedDataSource': {},
    './announcementI18n': { buildAnnouncementI18nFields: draft => draft },
    '@jetlinks-web/core': { request: {
      post: async (...args) => { calls.push(args); return { success: true, result: args[0].includes('/saas/runtime')
        ? { data: [{ id: 'region-a', name: 'Region A' }] } : 'bulletin-1' } },
      put: async (...args) => { calls.push(args); return { success: true } },
    } },
  })
  return { calls, api, management }
}

for (const context of contexts) {
  test(context.name + ' uses the correct save, publish and revoke contract without widening local scope', async () => {
    const f = fixture(context)
    assert.equal(f.management.isSaasAnnouncementManagement(), context.saas)
    const deliveryScope = { saas: true, regionIds: ['region-a'] }
    const others = { deliveryScope, custom: 'keep' }
    const id = await f.api.saveAnnouncement({ title: '公告', content: '正文', type: 'release', popup: true,
      deliveryScope, others })
    await f.api.publishAnnouncement(id, deliveryScope)
    await f.api.withdrawAnnouncement(id, deliveryScope)
    assert.deepEqual(f.calls[0][1].others, context.saas
      ? { deliveryScope, custom: 'keep', popup: true } : { custom: 'keep', popup: true })
    assert.equal(others.deliveryScope, deliveryScope)
    assert.deepEqual(f.calls.slice(1), context.saas ? [
      ['/saas/bulletin/_deploy', { all: true, runtimes: [{ id: 'region-a', projects: [] }] }, { params: { id } }],
      ['/saas/bulletin/_revocation', { all: true, runtimes: [{ id: 'region-a', projects: [] }] }, { params: { id } }],
    ] : [
      ['/system/bulletin/_deploy', { dimension: [], deployType: 'now' }, { params: { id } }],
      ['/system/bulletin/_revocation', {}, { params: { id } }],
    ])
    const regions = await f.api.queryAnnouncementRegions()
    assert.equal(regions.length, context.saas ? 1 : 0)
    assert.equal(f.calls.filter(([url]) => url.includes('/saas/runtime')).length, context.saas ? 1 : 0)
    if (!context.saas) assert.ok(f.calls.every(([url]) => !url.startsWith('/saas/')))
  })

  test(context.name + ' editor only loads, validates and submits delivery scope in SaaS management', async () => {
    const f = fixture(context)
    const file = new URL('../views/system/Announcement/components/AnnouncementEditorDialog.vue', import.meta.url)
    const source = readFileSync(file, 'utf8')
    const script = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
    const { code } = transformSync(script + '\nexport { form, canSubmit, submit, saasManagement }', { loader: 'ts', format: 'cjs' })
    const props = vue.reactive({ open: false })
    const events = []
    const helpers = loadLogModule('views/system/Announcement/announcementI18n.ts', {
      '@jetlinks-web-core/locales': { default: { global: { locale: { value: 'zh' } } } },
    })
    const dependencies = {
      vue, 'vue-i18n': { useI18n: () => ({ t: key => key, locale: vue.ref('zh') }) },
      '../announcementI18n': helpers, '../bulletinTypeIcon': { BULLETIN_TYPE_VALUES: ['release'] },
      '../managementContext': f.management,
      '../hooks/useAnnouncementRegions': loadLogModule('views/system/Announcement/hooks/useAnnouncementRegions.ts', { '../api': f.api }),
    }
    const scope = vue.effectScope()
    const module = { exports: {} }
    try {
      scope.run(() => new Function('require', 'module', 'exports', 'defineProps', 'defineEmits', code)(
        name => dependencies[name] || {}, module, module.exports, () => props, () => (...args) => events.push(args),
      ))
      props.open = true
      await vue.nextTick()
      const editor = module.exports
      assert.equal(editor.saasManagement.value, context.saas)
      assert.match(source, /v-if="saasManagement"/)
      editor.form.title = '公告'
      editor.form.type = 'release'
      editor.form.i18nMessages = { content: { zh: '正文' } }
      editor.form.saas = false
      assert.equal(editor.canSubmit.value, !context.saas)
      editor.form.saas = true
      assert.equal(editor.canSubmit.value, true)
      editor.submit(true)
      assert.equal(events[0][0], 'save')
      assert.equal(events[0][1].publish, true)
      assert.equal('deliveryScope' in events[0][1], context.saas)
      assert.equal(f.calls.filter(([url]) => url.includes('/saas/runtime')).length, context.saas ? 1 : 0)
    } finally { scope.stop() }
  })
}

test('SaaS initialization does not duplicate the existing operator announcement menu', () => {
  const menus = loadLogModule('baseMenu.ts', {
    './views/system/Announcement/managementContext': { isSaasAnnouncementManagement: () => true },
  }).default()
  assert.deepEqual(findMenus(menus, 'system/Announcement'), [])
})

test('SaaS rejects a missing delivery scope before save or publish', async () => {
  const f = fixture(contexts[0])
  await assert.rejects(f.api.saveAnnouncement({ title: '标题', content: '正文' }), /scope is required/)
  assert.throws(() => f.api.publishAnnouncement('id'), /scope is required/)
  assert.deepEqual(f.calls, [])
})
