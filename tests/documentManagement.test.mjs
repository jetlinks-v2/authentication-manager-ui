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
const model = load('../views/system/DocumentManagement/model.ts', { '@jetlinks-web-core/utils/documentHelpRegistry': registry })
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

function fixture() {
  const calls = [], notices = []
  const api = {
    getDocumentHelpConfigurations: () => new Promise((resolve, reject) => calls.push({ kind: 'get', resolve, reject })),
    updateDocumentHelpEnabled: state => new Promise((resolve, reject) => calls.push({ kind: 'batch', state, resolve, reject })),
    saveDocumentHelpConfiguration: configuration => new Promise((resolve, reject) => calls.push({ kind: 'put', configuration, resolve, reject })),
  }
  const hook = load('../views/system/DocumentManagement/useDocumentManagement.ts', {
    vue: { ...vue, onMounted: () => {} },
    'vue-i18n': { useI18n: () => ({ t: key => key, locale: vue.ref('zh') }) },
    '@jetlinks-web/utils': { onlyMessage: value => notices.push(value) },
    '@jetlinks-web-core/hooks/useConfiguredDocumentHelp': { notifyDocumentHelpConfigurationChanged: () => notices.push('changed') },
    '@jetlinks-web-core/utils/documentHelpRegistry': { getDocumentHelpPoints: () => points },
    '../../../api/system/documentHelp': api,
    './model': model,
  })
  return { state: hook.useDocumentManagement(), calls, notices }
}

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
  assert.deepEqual(calls[2].configuration, { code: 'page/a', key: 'shared', content: '**编辑后的说明**', enabled: true })
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
})

test('configuration API reuses one system config Map and preserves legacy keys and other points', async () => {
  const calls = []
  let settings = { legacy: { code: 'page/a', key: 'shared', content: 'A', enabled: true }, second: { code: 'page/b', key: 'shared', content: 'B', enabled: false } }
  const api = load('../api/system/documentHelp.ts', {
    '@jetlinks-web/core': { request: { post: async (...args) => { calls.push(args); settings = structuredClone(args[1]); return { success: true } } } },
    '@jetlinks-web-core/api/document': { getDocumentHelpSettings: async () => ({ success: true, result: structuredClone(settings) }) },
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
