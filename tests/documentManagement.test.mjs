import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import { transformSync } from 'esbuild'
import * as vue from 'vue'

const require = createRequire(import.meta.url)
function load(path, dependencies = {}) {
  const code = transformSync(readFileSync(new URL(path, import.meta.url), 'utf8'), { loader: 'ts', format: 'cjs' }).code
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(id => dependencies[id] ?? require(id), module, module.exports)
  return module.exports
}
const registry = load('../../../jetlinks-web-core/src/utils/documentHelpRegistry.ts')
const content = load('../../../jetlinks-web-core/src/utils/documentHelpContent.ts')
const model = load('../views/system/DocumentManagement/model.ts', {
  '@jetlinks-web-core/utils/documentHelpRegistry': registry,
  '@jetlinks-web-core/utils/documentHelpContent': content,
})
const helpTree = load('../views/system/DocumentManagement/helpTree.ts')
const points = [
  { code: 'page/a', key: 'shared', name: '设备接入', page: '设备' },
  { code: 'page/b', key: 'shared', name: '接入告警', page: '告警' },
  { code: 'page/a', key: 'second', name: '设备状态', page: '设备' },
]

test('scan merges by code + key and filters states/routes without overwriting Markdown', () => {
  const configuration = { code: 'page/a', key: 'shared', content: '**说明**\n[文档](https://example.com)' }
  const rows = model.mergeHelpPoints(points, [configuration])
  assert.equal(rows.length, 3)
  assert.equal(rows[0].content, configuration.content)
  assert.equal(rows[1].configured, false)
  assert.notEqual(rows[0].id, rows[1].id)
  assert.equal(model.filterHelpPoints(rows, 'missing', []).length, 2)
  assert.equal(model.filterHelpPoints(rows, 'ready', []).length, 1)
  assert.equal(model.filterHelpPoints(rows, 'route:page/a', []).length, 2)
  assert.deepEqual(model.filterHelpPoints(rows, 'all', [{ column: 'name', termType: 'like', value: '设备' }]).map(row => row.key), ['shared', 'second'])
  assert.equal(model.helpContentSummary(configuration.content), '说明 文档')
})

test('location distinguishes form and list while retaining configuration identity', () => {
  const point = { code: 'device/Product', key: 'deviceType.device', name: '直连设备', page: '产品', location: '新增、编辑' }
  const [row] = model.mergeHelpPoints([point], [{ code: point.code, key: point.key, content: '已有说明', enabled: false }])
  assert.equal(row.page, '产品 / 新增、编辑')
  assert.equal(row.content, '已有说明')
  assert.equal(row.enabled, false)
  assert.equal(model.filterHelpPoints([row], 'route:device/Product', []).length, 1)
  assert.equal(model.filterHelpPoints([row], 'all', [{ column: 'page', termType: 'like', value: '编辑' }]).length, 1)
})

test('nested and/or terms and exact identifiers exclude unrelated rows', () => {
  const rows = model.mergeHelpPoints(points, [])
  assert.equal(model.filterHelpPoints(rows, 'all', [{ terms: [
    { column: 'name', termType: 'like', value: '状态' },
    { column: 'page', termType: 'eq', value: '告警', type: 'or' },
  ] }, { column: 'key', termType: 'eq', value: 'shared' }]).length, 1)
})

function fixture(menus = [], initialLanguage = 'zh') {
  const calls = [], notices = []
  const locale = vue.ref(initialLanguage)
  const api = {
    getDocumentHelpConfigurations: () => new Promise((resolve, reject) => calls.push({ kind: 'get', resolve, reject })),
    updateDocumentHelpEnabled: state => new Promise((resolve, reject) => calls.push({ kind: 'batch', state, resolve, reject })),
    saveDocumentHelpConfiguration: configuration => new Promise((resolve, reject) => calls.push({ kind: 'put', configuration, resolve, reject })),
  }
  const hook = load('../views/system/DocumentManagement/useDocumentManagement.ts', {
    vue: { ...vue, onMounted: () => {} },
    'vue-i18n': { useI18n: () => ({ t: key => key, locale }) },
    '@jetlinks-web-core/store/menu': { useMenuStore: () => ({ siderMenus: menus }) },
    '@jetlinks-web/utils': { onlyMessage: value => notices.push(value) },
    '@jetlinks-web-core/hooks/useConfiguredDocumentHelp': { notifyDocumentHelpConfigurationChanged: () => notices.push('changed') },
    '@jetlinks-web-core/utils/documentHelpRegistry': { getDocumentHelpPoints: () => points },
    '@jetlinks-web-core/utils/documentHelpContent': content,
    '../../../api/system/documentHelp': api,
    './model': model,
    './helpTree': helpTree,
  })
  return { state: hook.useDocumentManagement(), calls, notices, locale }
}

test('route heading uses the visible menu hierarchy and falls back to the registered page name', () => {
  const { state } = fixture([{
    name: 'root', path: '/root', meta: { title: '设备管理' }, children: [{
      name: 'hidden', path: '/hidden', meta: { title: '隐藏目录', hideInMenu: true }, children: [
        { name: 'page/a', path: '/device', meta: { title: '设备' } },
      ],
    }],
  }])
  state.scope.value = 'route:page/a'
  assert.equal(state.title.value, '设备管理 / 设备')
  assert.equal(state.routePath.value, '/device')
  state.scope.value = 'route:page/b'
  assert.equal(state.title.value, '告警')
  assert.equal(state.routePath.value, '')
  state.scope.value = 'all'
  assert.equal(state.title.value, 'DocumentManagement.all')
  assert.equal(state.routePath.value, '')
})

test('load failure is distinct from unconfigured; retry loads persisted content', async () => {
  const { state, calls } = fixture()
  let task = state.load(); calls[0].reject(new Error('network')); await task
  assert.equal(state.failed.value, true)
  assert.equal(state.loaded.value, false)
  assert.equal(state.rows.value.length, 0)
  task = state.load()
  calls[1].resolve({ success: true, result: [{ code: 'page/b', key: 'shared', content: 'saved' }] }); await task
  assert.equal(state.failed.value, false)
  assert.equal(state.rows.value[1].content, 'saved')
})

test('save failure keeps draft; retry updates its point only; blank content clears', async () => {
  const { state, calls } = fixture()
  const loaded = state.load(); calls[0].resolve({ success: true, result: [] }); await loaded
  state.edit(state.rows.value[0]); state.draft.value = '**编辑后的说明**'
  let saving = state.save(); state.close()
  assert.ok(state.current.value, 'cannot close during save')
  calls[1].resolve({ success: false }); await saving
  assert.equal(state.saveFailed.value, true)
  assert.equal(state.draft.value, '**编辑后的说明**')
  assert.equal(state.rows.value[0].configured, false)
  saving = state.save()
  assert.deepEqual(calls[2].configuration, { code: 'page/a', key: 'shared', content: '**编辑后的说明**',
    i18nMessages: { content: { zh: '**编辑后的说明**' } }, enabled: true })
  calls[2].resolve({ success: true }); await saving
  assert.equal(state.current.value, undefined)
  assert.equal(state.rows.value[0].configured, true)
  assert.equal(state.rows.value[1].configured, false)
  state.edit(state.rows.value[0]); state.draft.value = '  '
  saving = state.save(); calls[3].resolve({ success: true }); await saving
  assert.equal(state.rows.value[0].configured, false)
})

test('module registers all six overview helpers without mounting overview', () => {
  const registered = []
  const entry = load('../visDashboard/Base/QuickGuide/documentHelpPoints.ts', {
    '@jetlinks-web-core/locales': { __esModule: true, default: { global: { t: key => key } } },
    '@jetlinks-web-core/utils/documentHelpRegistry': { registerDocumentHelpPoints: values => registered.push(...values) },
  })
  entry.registerOverviewHelpPoints()
  assert.equal(registered.length, 6)
  assert.deepEqual(registered.map(item => item.key), ['space', 'gateway', 'device', 'algorithm', 'alarm', 'application'].map(key => `quickGuide.${key}`))
  assert.ok(registered.every(item => item.code === 'project/Overview'))
  assert.ok(registered.every(item => item.page() === 'DocumentManagement.overview'))
  assert.ok(registered.every(item => item.location() === 'packages.ProjectHome.QuickGuide'))
})

test('configuration API reuses one system config Map and preserves legacy keys and other points', async () => {
  const calls = []
  let settings = { legacy: { code: 'page/a', key: 'shared', content: 'A', enabled: true }, second: { code: 'page/b', key: 'shared', content: 'B', enabled: false } }
  const api = load('../api/system/documentHelp.ts', {
    '@jetlinks-web/core': { request: { post: async (...args) => { calls.push(args); settings = structuredClone(args[1]); return { success: true } } } },
    '@jetlinks-web-core/api/document': { getDocumentHelpSettings: async () => ({ success: true, result: structuredClone(settings) }) },
    '@jetlinks-web-core/utils/documentHelpContent': content,
  })
  assert.equal((await api.getDocumentHelpConfigurations()).result.length, 2)
  await api.saveDocumentHelpConfiguration({ code: 'page/a', key: 'shared', content: '修改', enabled: true })
  assert.equal(settings.legacy.content, '修改')
  assert.equal(settings.second.content, 'B')
  assert.equal(Object.keys(settings).length, 2)
  await api.updateDocumentHelpEnabled({ enabled: false, points: [{ code: 'page/a', key: 'shared' }, { code: 'missing', key: 'none' }] })
  assert.equal(settings.legacy.enabled, false)
  assert.equal(settings.legacy.content, '修改')
  assert.equal(Object.keys(settings).length, 2)
  await api.updateDocumentHelpEnabled({ enabled: true, allConfigured: true })
  assert.ok(Object.values(settings).every(item => item.enabled))
  assert.equal(calls.length, 3, 'one write per action')
  assert.ok(calls.every(call => call[0] === '/system/config/document-help'))
  assert.deepEqual(calls[0][2], { projectContext: false, tenantDomain: false, hiddenError: true })
  await api.saveDocumentHelpConfiguration({ code: 'page/a', key: 'shared', content: ' ', enabled: false })
  assert.deepEqual(Object.keys(settings), ['second'])
})

test('platform settings declares a discoverable document management menu and scoped actions', () => {
  const menus = JSON.parse(readFileSync(new URL('../baseMenu.json', import.meta.url), 'utf8'))
  const flatten = nodes => nodes.flatMap(node => [node, ...flatten(node.children || [])])
  const platform = flatten(menus).find(menu => menu.code === 'platform/settings')
  const entry = platform.children.find(menu => menu.code === 'system/DocumentManagement')
  assert.deepEqual(entry.showPage, ['system_config'])
  assert.deepEqual(entry.permissions, [{ permission: 'system_config', actions: ['query'] }])
  assert.ok(entry.buttons.some(button => button.id === 'save' && button.permissions.some(permission => permission.permission === 'system_config' && permission.actions.includes('save'))))
})


test('disabled content remains configured and discoverable while missing content cannot be enabled', () => {
  const rows = model.mergeHelpPoints(points, [{ code: 'page/a', key: 'shared', content: '保留说明', enabled: false }])
  assert.equal(rows[0].configured, true)
  assert.equal(rows[0].enabled, false)
  assert.equal(rows[1].enabled, false)
  assert.equal(model.filterHelpPoints(rows, 'ready', []).length, 1)
})

test('batch changes use one request, preserve selection on failure, and refresh helpers after success', async () => {
  const { state, calls, notices } = fixture()
  const configurations = [
    { code: 'page/a', key: 'shared', content: 'A', enabled: true },
    { code: 'page/b', key: 'shared', content: 'B', enabled: true },
  ]
  const loaded = state.load(); calls[0].resolve({ success: true, result: configurations }); await loaded
  state.selectedKeys.value = [state.rows.value[0].id, state.rows.value[2].id]
  let task = state.batchToggle(false)
  assert.deepEqual(calls[1].state, { enabled: false, allConfigured: false, points: [{ code: 'page/a', key: 'shared' }] })
  calls[1].reject(new Error('network')); await task
  assert.equal(state.selectedKeys.value.length, 2)
  assert.equal(state.rows.value[0].enabled, true)
  task = state.batchToggle(false)
  calls[2].resolve({ success: true, result: [{ ...configurations[0], enabled: false }, configurations[1]] }); await task
  assert.equal(state.selectedKeys.value.length, 0)
  assert.equal(state.rows.value[0].content, 'A')
  assert.equal(state.rows.value[0].enabled, false)
  assert.ok(notices.includes('changed'))
  task = state.batchToggle(true, true)
  assert.deepEqual(calls[3].state, { enabled: true, allConfigured: true, points: undefined })
  calls[3].resolve({ success: true, result: configurations }); await task
  assert.equal(state.rows.value[0].enabled, true)
})


const hierarchyMenus = [{
  name: 'resources', path: '/resources', meta: { title: '资源中心' }, children: [
    { name: 'devices', path: '/resources/devices', meta: { title: '设备管理' }, children: [
      { name: 'page/a', path: '/resources/devices/list', meta: { title: '设备' } },
    ] },
    { name: 'alarms', path: '/resources/alarms', meta: { title: '告警管理' }, children: [
      { name: 'page/b', path: '/resources/alarms/list', meta: { title: '设备' } },
    ] },
    { name: 'empty', path: '/resources/empty', meta: { title: '无埋点页面' } },
  ],
}]
const walkTree = nodes => nodes.flatMap(node => [node, ...walkTree(node.children || [])])
const leafIds = nodes => walkTree(nodes).filter(node => !node.children?.length).flatMap(node => node.rowIds)
const makeHelpTree = (entries = points, menus = hierarchyMenus) => helpTree.buildHelpTree(model.mergeHelpPoints(entries, []), menus, value => value, '其它页面')

test('help tree follows directory / directory / page / point with unique descendant counts', () => {
  const tree = makeHelpTree()
  assert.equal(tree.length, 1)
  assert.equal(tree[0].title, '资源中心')
  assert.equal(tree[0].count, 3)
  assert.equal(new Set(tree[0].rowIds).size, 3)
  assert.deepEqual(tree[0].children.map(node => node.title), ['设备管理', '告警管理'])
  const page = tree[0].children[0].children[0]
  assert.equal(page.title, '设备')
  assert.equal(page.count, 2)
  assert.equal(page.path, '/resources/devices/list')
  assert.equal(page.breadcrumb, '资源中心 / 设备管理 / 设备')
  assert.deepEqual(page.children.map(node => node.title), ['设备接入', '设备状态'])
  assert.deepEqual(page.children.map(node => node.key), points.filter(point => point.code === 'page/a').map(point => `point:${registry.documentHelpPointId(point.code, point.key)}`))
  assert.ok(page.children.every(node => node.count === 1 && node.rowIds.length === 1))
})

test('same page label and point key under different menu paths remain distinct', () => {
  const tree = makeHelpTree()
  const pages = walkTree(tree).filter(node => node.title === '设备')
  assert.equal(pages.length, 2)
  assert.notEqual(pages[0].key, pages[1].key)
  assert.equal(pages[0].count, 2)
  assert.equal(pages[1].count, 1)
  assert.equal(new Set(leafIds(tree)).size, 3)
  assert.equal(leafIds(tree).length, 3)
})

test('overview groups quick-start help below its registered location without changing point identities', () => {
  const entries = [
    { code: 'project/Overview', key: 'quickGuide.space', name: '配置空间', page: '概览', location: '快速上手' },
    { code: 'project/Overview', key: 'quickGuide.gateway', name: '接入网关', page: '概览', location: '快速上手' },
    { code: 'project/Overview', key: 'summary', name: '概览说明', page: '概览' },
  ]
  const tree = makeHelpTree(entries, [{ name: 'project/Overview', path: '/overview', meta: { title: '概览' } }])
  const overview = tree[0]
  assert.equal(overview.count, 3)
  const quickStart = overview.children[0]
  assert.equal(quickStart.title, '快速上手')
  assert.equal(quickStart.count, 2)
  assert.equal(quickStart.path, '/overview')
  assert.deepEqual(quickStart.children.map(node => node.title), ['配置空间', '接入网关'])
  const space = quickStart.children[0]
  assert.equal(space.breadcrumb, '概览 / 快速上手 / 配置空间')
  assert.equal(space.key, `point:${registry.documentHelpPointId('project/Overview', 'quickGuide.space')}`)
  assert.deepEqual(quickStart.rowIds, quickStart.children.flatMap(node => node.rowIds))
  assert.equal(overview.children[1].title, '概览说明')
  const found = helpTree.filterHelpTree(tree, 'quickGuide.space')
  assert.equal(found[0].children[0].title, '快速上手')
  assert.deepEqual(leafIds(found), [space.rowIds[0]])
  assert.deepEqual(leafIds(helpTree.filterHelpTree(tree, '快速上手')), quickStart.rowIds)
})

test('unmatched routes remain available under a fallback page group', () => {
  const tree = makeHelpTree([...points, { code: 'unmatched', key: 'save', name: '保存', page: '未挂菜单的页面' }])
  const fallback = tree.find(node => node.title === '其它页面')
  assert.ok(fallback)
  assert.equal(fallback.count, 1)
  assert.equal(fallback.children[0].title, '未挂菜单的页面')
  assert.equal(fallback.children[0].children[0].title, '保存')
  assert.equal(leafIds(tree).length, 4)
})

test('tree search matches point names and identifiers while retaining ancestors', () => {
  const tree = makeHelpTree()
  const matched = helpTree.filterHelpTree(tree, '  SECOND  ')
  assert.equal(matched.length, 1)
  assert.equal(matched[0].title, '资源中心')
  assert.equal(matched[0].children[0].title, '设备管理')
  assert.deepEqual(leafIds(matched), [registry.documentHelpPointId('page/a', 'second')])
  assert.deepEqual(leafIds(helpTree.filterHelpTree(tree, '接入告警')), [registry.documentHelpPointId('page/b', 'shared')])
  assert.deepEqual(leafIds(helpTree.filterHelpTree(tree, 'page/b')), [registry.documentHelpPointId('page/b', 'shared')])
  assert.equal(helpTree.filterHelpTree(tree, '不存在').length, 0)
  assert.equal(leafIds(tree).length, 3, 'search does not mutate the complete tree')
})

test('a matching directory retains its entire subtree and hidden wrappers are omitted', () => {
  const tree = makeHelpTree()
  assert.deepEqual(leafIds(helpTree.filterHelpTree(tree, '设备管理')), [
    registry.documentHelpPointId('page/a', 'shared'), registry.documentHelpPointId('page/a', 'second'),
  ])
  assert.equal(leafIds(helpTree.filterHelpTree(tree, '')).length, 3)
  const hiddenMenus = [{ name: 'hidden', path: '/hidden', meta: { title: '隐藏目录', hideInMenu: true }, children: hierarchyMenus }]
  const hiddenTree = makeHelpTree(points, hiddenMenus)
  assert.equal(hiddenTree[0].title, '资源中心')
  assert.ok(!walkTree(hiddenTree).some(node => node.title === '隐藏目录'))
})

test('translation-only points stay configured regardless of the current preview language', () => {
  const i18nMessages = { content: { en: '**English**', ja: '日本語' } }
  const [row] = model.mergeHelpPoints(points, [{ ...points[0], content: '', i18nMessages, enabled: false }])
  assert.equal(row.configured, true)
  assert.equal(row.enabled, false)
  assert.deepEqual(row.i18nMessages, i18nMessages)
  assert.equal(model.filterHelpPoints([row], 'ready', []).length, 1)
  assert.equal(model.filterHelpPoints([row], 'missing', []).length, 0)
})

test('three language drafts survive switching and failed saves without changing persisted rows', async () => {
  const { state, calls, notices } = fixture()
  const original = { code: 'page/a', key: 'shared', content: '旧正文',
    i18nMessages: { content: { zh: '中文', en: 'English', ja: '日本語' }, title: { en: 'Keep' } }, enabled: true }
  const loaded = state.load(); calls[0].resolve({ success: true, result: [original] }); await loaded
  state.edit(state.rows.value[0])
  assert.deepEqual(state.languages.value.map(item => item.value), ['zh', 'en', 'ja'])
  assert.equal(state.draft.value, '中文')
  state.draft.value = '新的中文'
  state.activeLanguage.value = 'en'; state.draft.value = '**New English**'
  state.activeLanguage.value = 'ja'; state.draft.value = '新しい日本語'
  state.activeLanguage.value = 'zh'; assert.equal(state.draft.value, '新的中文')
  state.activeLanguage.value = 'en'; assert.equal(state.draft.value, '**New English**')
  const saving = state.save()
  assert.deepEqual(calls[1].configuration, { code: 'page/a', key: 'shared', content: '新的中文', enabled: true,
    i18nMessages: { content: { zh: '新的中文', en: '**New English**', ja: '新しい日本語' }, title: { en: 'Keep' } } })
  calls[1].reject(new Error('network')); await saving
  assert.equal(state.saveFailed.value, true)
  assert.equal(state.draftContent('ja'), '新しい日本語')
  assert.deepEqual(state.rows.value[0].i18nMessages, original.i18nMessages)
  assert.equal(state.rows.value[0].content, '旧正文')
  assert.ok(!notices.includes('changed'))
  const retry = state.save(); calls[2].resolve({ success: true }); await retry
  assert.equal(state.current.value, undefined)
  assert.equal(state.rows.value[0].i18nMessages.content.ja, '新しい日本語')
  assert.ok(notices.includes('changed'))
})

test('legacy body follows the editing locale without being copied into every translation', async () => {
  const { state, calls, locale } = fixture([], 'ja_JP')
  const loaded = state.load(); calls[0].resolve({ success: true, result: [{ ...points[0], content: 'Legacy body', enabled: true }] }); await loaded
  state.edit(state.rows.value[0])
  assert.equal(state.activeLanguage.value, 'ja')
  assert.equal(state.draft.value, 'Legacy body')
  assert.equal(state.draftContent('zh'), '')
  assert.equal(state.draftContent('en'), '')
  state.activeLanguage.value = 'en'; state.draft.value = 'Translated body'
  const saving = state.save()
  assert.equal(calls[1].configuration.content, 'Legacy body')
  assert.deepEqual(calls[1].configuration.i18nMessages.content, { en: 'Translated body' })
  calls[1].resolve({ success: true }); await saving
  assert.equal(state.previewContent(state.rows.value[0]), 'Legacy body')
  locale.value = 'en-US'; assert.equal(state.previewContent(state.rows.value[0]), 'Translated body')
  locale.value = 'zh-CN'; assert.equal(state.previewContent(state.rows.value[0]), 'Legacy body')
})

test('saving and toggling a point with only a foreign translation preserves its content', async () => {
  const { state, calls } = fixture()
  const loaded = state.load(); calls[0].resolve({ success: true, result: [] }); await loaded
  state.edit(state.rows.value[0])
  state.activeLanguage.value = 'ja'; state.draft.value = '日本語だけ'
  let task = state.save()
  assert.equal(calls[1].configuration.content, '')
  assert.equal(calls[1].configuration.enabled, true)
  calls[1].resolve({ success: true }); await task
  const row = state.rows.value[0]
  assert.equal(row.configured, true)
  assert.equal(state.previewContent(row), '')
  task = state.toggleEnabled(row)
  assert.deepEqual(calls[2].configuration.i18nMessages.content, { ja: '日本語だけ' })
  assert.equal(calls[2].configuration.enabled, false)
  calls[2].resolve({ success: true }); await task
  assert.equal(state.rows.value[0].enabled, false)
  assert.equal(state.rows.value[0].i18nMessages.content.ja, '日本語だけ')
})

test('clearing every language clears the legacy fallback as well', async () => {
  const { state, calls } = fixture()
  const original = { ...points[0], content: 'Default body', enabled: true,
    i18nMessages: { content: { zh: '', en: 'English', ja: '日本語' } } }
  const loaded = state.load(); calls[0].resolve({ success: true, result: [original] }); await loaded
  state.edit(state.rows.value[0])
  assert.equal(state.draft.value, 'Default body', 'an empty translation still exposes the editable legacy fallback')
  for (const language of ['zh', 'en', 'ja']) {
    state.activeLanguage.value = language; state.draft.value = ''
  }
  const saving = state.save()
  assert.equal(calls[1].configuration.content, '')
  assert.equal(calls[1].configuration.enabled, false)
  calls[1].resolve({ success: true }); await saving
  assert.equal(state.rows.value[0].configured, false)
})

test('config Map roundtrip and batch changes preserve all translations and unrelated fields', async () => {
  const calls = []
  let settings = {
    legacy: { code: 'page/a', key: 'shared', content: '', enabled: true,
      i18nMessages: { content: { ja: '日本語' }, title: { en: 'Title' } } },
    other: { code: 'page/b', key: 'shared', content: 'Other', enabled: false,
      i18nMessages: { content: { zh: '其他', en: 'Other' } } },
  }
  const other = structuredClone(settings.other)
  const api = load('../api/system/documentHelp.ts', {
    '@jetlinks-web/core': { request: { post: async (...args) => {
      calls.push(args); settings = JSON.parse(JSON.stringify(args[1])); return { success: true }
    } } },
    '@jetlinks-web-core/api/document': { getDocumentHelpSettings: async () => ({ success: true, result: structuredClone(settings) }) },
    '@jetlinks-web-core/utils/documentHelpContent': content,
  })
  assert.equal((await api.getDocumentHelpConfigurations()).result.length, 2)
  const changed = { ...settings.legacy, i18nMessages: { ...settings.legacy.i18nMessages, content: { en: 'English', ja: '更新' } } }
  await api.saveDocumentHelpConfiguration(changed)
  assert.deepEqual(settings.legacy, changed)
  assert.deepEqual(settings.other, other)
  assert.deepEqual((await api.getDocumentHelpConfigurations()).result[0], changed)
  await api.updateDocumentHelpEnabled({ enabled: false, points: [{ code: 'page/a', key: 'shared' }] })
  assert.deepEqual(settings.legacy.i18nMessages, changed.i18nMessages)
  assert.equal(settings.legacy.enabled, false)
  assert.deepEqual(settings.other, other)
  await api.updateDocumentHelpEnabled({ enabled: true, allConfigured: true })
  assert.ok(Object.values(settings).every(item => item.enabled))
  assert.deepEqual(settings.legacy.i18nMessages, changed.i18nMessages)
  assert.equal(calls.length, 3)
  await api.saveDocumentHelpConfiguration({ code: 'page/a', key: 'shared', content: '', i18nMessages: { content: { zh: '', en: ' ', ja: '' } }, enabled: false })
  assert.deepEqual(Object.keys(settings), ['other'])
})
