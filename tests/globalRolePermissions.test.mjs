import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { compileScript, parse } from 'vue/compiler-sfc'
import { createRenderer, defineComponent, h, nextTick, ref } from 'vue'

const moduleRoot = fileURLToPath(new URL('..', import.meta.url))
const core = fileURLToPath(new URL('../../../jetlinks-web-core/src', import.meta.url))
const boundaries = {
  '@jetlinks-web/core': `
    export const http = { calls: [], handler: null };
    export const request = Object.fromEntries(['get', 'post'].map(method => [method, (url, data, config) => {
      http.calls.push({ method, url, data, config }); return http.handler(method, url);
    }]));`,
  '@jetlinks-web/utils': 'export const notices = []; export const onlyMessage = (...args) => notices.push(args);',
  'vue-i18n': 'export const useI18n = () => ({ t: key => key });',
  'vue-router': `import { reactive } from 'vue'; export const route = reactive({ params: { id: 'role-1' } }); export const useRoute = () => route;`,
  '@jetlinks-web-core/hooks': `export { useMenuAssetPermissionEditor } from '${core}/hooks/useMenuAssetPermissionEditor';
    export const useRegistryOptions = ({ baseOptions }) => ({ mergedOptions: baseOptions });`,
  '@jetlinks-web-core/components': `export { default as MenuAssetPermissionEditor } from '${core}/components/MenuAssetPermissionEditor/index.vue';`,
  '@jetlinks-web-core/utils/utils': 'export const isNoCommunity = true;',
  '@jetlinks-web-core/utils/consts': "export const USER_CENTER_MENU_CODE = 'account-center';",
}
const { outputFiles } = await build({
  stdin: { resolveDir: moduleRoot, contents: `
    export { default as PermissionTree } from './views/system/Role/Detail/components/PermissionTree.vue';
    export { http } from '@jetlinks-web/core'; export { route } from 'vue-router'; export { notices } from '@jetlinks-web/utils';
  ` },
  alias: { '@jetlinks-web-core': core, '@authentication-manager-ui': moduleRoot },
  platform: 'node', format: 'esm', bundle: true, write: false,
  define: { 'import.meta.env': JSON.stringify({ VITE_APP_ENVIRONMENT: 'saas' }) },
  plugins: [{ name: 'role-test-boundaries', setup(plugin) {
    plugin.onResolve({ filter: /^vue$/ }, () => ({ path: import.meta.resolve('vue'), external: true }))
    plugin.onResolve({ filter: /.*/ }, ({ path }) => Object.hasOwn(boundaries, path) ? { path, namespace: 'fixture' } : undefined)
    plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({ contents: boundaries[path], resolveDir: moduleRoot }))
    plugin.onLoad({ filter: /\.vue$/ }, async ({ path }) => {
      const { descriptor } = parse(await readFile(path, 'utf8'), { filename: path })
      const { content } = compileScript(descriptor, { id: path, inlineTemplate: true })
      // Supply the Vue auto-imports normally injected by the Vite project config.
      return { contents: `import { computed, ref, watch } from 'vue';\n${content}`, loader: 'ts' }
    })
  } }],
})
const { PermissionTree, http, route, notices } = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`,
)

const element = tag => ({ tag, props: {}, children: [], parent: null, closest: () => null })
const detach = node => {
  if (node.parent) node.parent.children = node.parent.children.filter(child => child !== node)
  node.parent = null
}
const renderer = createRenderer({
  createElement: element,
  insert(node, parent, anchor) {
    detach(node)
    parent.children.splice(anchor ? parent.children.indexOf(anchor) : parent.children.length, 0, node)
    node.parent = parent
  },
  remove: detach,
  setElementText: (node, text) => { node.children = []; node.text = text },
  createText: text => ({ ...element('#text'), text }),
  createComment: text => ({ ...element('#comment'), text }),
  setText: (node, text) => { node.text = text },
  parentNode: node => node.parent,
  nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1] || null,
  patchProp: (node, key, _, value) => { node.props[key] = value },
})
const flatten = (items = []) => items.flatMap(item => [item, ...flatten(item.children || [])])
const flush = async () => { await new Promise(resolve => setImmediate(resolve)); await nextTick() }
const menu = (id, owner, fields = {}) => ({ id, owner, name: id, granted: true, buttons: [{ id: 'view', granted: true }], ...fields })
const success = result => ({ success: true, result })
const userMenuPath = '/menu/user-own/tree'
const notice = key => `Role.globalPermissions.${key}`

function fixture(t) {
  route.params.id = 'role-1'
  http.calls = []
  notices.length = 0
  const legacyAsset = { assetType: 'legacy_asset', accesses: [{ supportId: 'org' }] }
  const appMenu = menu('legacy-app', 'app', {
    assetTypes: [legacyAsset.assetType], assetAccesses: [{ assetType: legacyAsset.assetType, supportId: 'org', granted: true }],
  })
  const detail = { menus: [
    menu('app-ancestor', 'app', { children: [
      menu('iot-nested', 'iot', { buttons: [{ id: 'view', granted: true }, { id: 'delete', granted: true }] }),
      appMenu,
    ] }),
    menu('iot-base', 'iot'), menu('iot-no-access', 'iot'), menu('unknown-owner', undefined),
  ], assetAccesses: [legacyAsset] }
  const api = {
    detail, legacyAsset, fixedGrantable: [],
    user: success([menu('iot-nested', 'iot'), menu('iot-base', 'iot'), menu('iot-no-access', 'iot', { granted: false }), appMenu]),
    userResponse: () => api.user,
  }
  http.handler = async (method, url) => {
    if (method === 'get' && /^\/menu\/role\/role-\d+\/_grant\/detail$/.test(url)) return success(detail)
    if (method === 'post' && url === userMenuPath) return api.userResponse()
    if (method === 'post' && url === '/menu/asset-accesses/grantable') return success(api.fixedGrantable)
    if (method === 'get' && url === '/asset/types') return success([{ id: legacyAsset.assetType, name: '既有数据权限' }])
    assert.fail(`Unexpected request ${method} ${url}`)
  }
  const tree = ref()
  const vm = renderer.createApp({ render: () => h(PermissionTree, { ref: tree }) })
  vm.config.globalProperties.$t = key => key
  for (const tag of ['a-tabs', 'a-tab-pane', 'a-spin', 'a-checkbox', 'a-alert', 'a-button', 'a-select', 'a-radio-group', 'a-radio', 'AIcon', 'CloudEmpty']) {
    vm.component(tag, defineComponent({ inheritAttrs: false, setup: (_, { attrs, slots }) => () => h(tag, attrs, slots.default?.()) }))
  }
  vm.component('a-table', defineComponent({
    props: ['dataSource', 'columns'],
    setup: (props, { slots }) => () => h('a-table', { records: props.dataSource }, [
      ...props.columns.map(column => slots.headerCell({ column })),
      ...flatten(props.dataSource).flatMap(record => props.columns.map(column => slots.bodyCell({ record, column }))),
    ]),
  }))
  const root = element('root')
  vm.mount(root)
  t.after(() => vm.unmount())
  const findAll = tag => flatten([root]).filter(node => node.tag === tag)
  return { api, tree, find: tag => findAll(tag)[0], findAll }
}

test('普通角色只渲染 iot 菜单，无分类页签；全选操作不改被隐藏的菜单、按钮和资产策略', async t => {
  const { api, tree, find } = fixture(t)
  await flush()
  assert.equal(tree.value.canSave, true)
  assert.equal(find('a-tabs'), undefined)
  const rows = flatten(find('a-table').props.records)
  assert.deepEqual(rows.map(row => row.id), ['iot-nested', 'iot-base'])
  assert.deepEqual(rows[0].buttons.map(button => button.id), ['view'])
  assert.ok(find('a-radio-group'))
  assert.deepEqual(http.calls.map(call => call.url), ['/menu/role/role-1/_grant/detail', userMenuPath, '/asset/types'])
  assert.deepEqual(http.calls[1].config, { applicationScope: false })

  find('a-checkbox').props.onChange({ target: { checked: false } })
  const snapshot = await tree.value.onSave()
  const saved = new Map(flatten(snapshot.menus).map(item => [item.id, item]))
  assert.equal(saved.get('iot-base').granted, false)
  assert.equal(saved.get('iot-nested').parentId, 'app-ancestor')
  assert.deepEqual(saved.get('iot-nested').buttons, [{ id: 'view', granted: false }, { id: 'delete', granted: true }])
  for (const id of ['app-ancestor', 'legacy-app', 'unknown-owner', 'iot-no-access']) {
    assert.equal(saved.get(id).granted, true)
    assert.equal(saved.get(id).buttons[0].granted, true)
  }
  assert.deepEqual(saved.get('legacy-app').assetAccesses, api.detail.menus[0].children[1].assetAccesses)
  assert.deepEqual(snapshot.assetAccesses, [api.legacyAsset])
  assert.equal(http.calls.at(-1).url, userMenuPath)
})

test('普通角色过滤所在应用候选，保留同名资产，且不把唯一候选选为默认范围', async t => {
  const { api, tree, find, findAll } = fixture(t)
  const onlyRestricted = api.detail.menus[0].children[0]
  onlyRestricted.assetAccesses = [{ assetType: 'device', supportId: 'business_application', name: '所在应用' }]
  const applicationMenu = api.detail.menus[1]
  applicationMenu.assetTypes = ['business_application']
  applicationMenu.assetAccesses = ['business_application', 'org'].map(supportId => ({
    assetType: 'business_application', supportId,
  }))
  await tree.value.load()
  await nextTick()

  assert.deepEqual(findAll('a-radio').map(node => node.props.value), ['org', 'org'])
  assert.deepEqual(findAll('a-radio-group').map(node => node.props.value), ['org', undefined, 'org'])
  assert.deepEqual(find('a-select').props.options, [])
  const snapshot = await tree.value.onSave()
  assert.deepEqual(snapshot.assetAccesses, [api.legacyAsset, { assetType: 'business_application', accesses: [{ supportId: 'org' }] }])
  assert.deepEqual(flatten(snapshot.menus).find(item => item.id === 'iot-nested').assetAccesses, [])
  assert.equal(onlyRestricted.assetAccesses[0].disabled, undefined)
})

test('历史所在应用独立策略在无关保存中保留，显式改选后更新菜单和角色快照', async t => {
  const { api, tree, find, findAll } = fixture(t)
  const deviceMenu = api.detail.menus[0].children[0]
  deviceMenu.assetTypes = ['device']
  deviceMenu.assetAccesses = ['business_application', 'org', 'creator'].map(supportId => ({
    assetType: 'device', supportId, granted: supportId === 'business_application',
  }))
  const oldPolicy = {
    assetType: 'device', accesses: [{ supportId: 'business_application' }, { supportId: 'creator' }],
    options: { existing: true },
  }
  api.detail.assetAccesses.push(oldPolicy)
  await tree.value.load()
  await nextTick()

  assert.ok(findAll('a-radio').every(node => node.props.value !== 'business_application'))
  assert.deepEqual(find('a-select').props.options.map(option => option.value), ['org'])
  find('a-select').props.onChange('business_application') // 非法批量值不影响历史策略。
  find('a-checkbox').props.onChange({ target: { checked: false } })
  const deviceAccesses = snapshot => flatten(snapshot.menus).find(item => item.id === 'iot-nested').assetAccesses
  const retained = await tree.value.onSave()
  assert.deepEqual(retained.assetAccesses.find(policy => policy.assetType === 'device'), oldPolicy)
  assert.deepEqual(deviceAccesses(retained), [{ assetType: 'device', supportId: 'business_application', granted: true }])

  const deviceOptions = findAll('a-radio-group').find(node => node.props.value === 'business_application')
  deviceOptions.props['onUpdate:value']('creator')
  const changed = await tree.value.onSave()
  assert.deepEqual(changed.assetAccesses.find(policy => policy.assetType === 'device'), {
    assetType: 'device', accesses: [{ supportId: 'creator' }],
  })
  assert.deepEqual(deviceAccesses(changed), [{ assetType: 'device', supportId: 'creator', granted: true }])

  api.detail.assetAccesses = changed.assetAccesses
  await tree.value.load()
  await nextTick()
  assert.ok(findAll('a-radio-group').some(node => node.props.value === 'creator'))
  assert.ok(findAll('a-radio').every(node => node.props.value !== 'business_application'))
})

test('仅菜单级的历史范围不作为新候选；合法批量设置可替换它', async t => {
  const { api, tree, find } = fixture(t)
  const deviceMenu = api.detail.menus[1]
  deviceMenu.assetType = 'device'
  deviceMenu.assetAccesses = [{ supportId: 'business_application', granted: true }, { supportId: 'org' }]
  await tree.value.load()
  await nextTick()

  const devicePolicy = snapshot => snapshot.assetAccesses.find(policy => policy.assetType === 'device')
  assert.deepEqual(devicePolicy(await tree.value.onSave())?.accesses, [{ supportId: 'business_application' }])
  find('a-select').props.onChange('org')
  assert.deepEqual(devicePolicy(await tree.value.onSave())?.accesses, [{ supportId: 'org' }])
  find('a-checkbox').props.onChange({ target: { checked: false } })
  assert.equal(devicePolicy(await tree.value.onSave()), undefined)
})

test('没有可编辑的 iot 菜单时显示空态，不清空原有授权', async t => {
  const { api, tree, find } = fixture(t)
  api.user = success([menu('legacy-app', 'app')])
  // Load again after switching the effective user fixture.
  await tree.value.load()
  await nextTick()
  assert.equal(find('a-table'), undefined)
  assert.equal(find('a-tabs'), undefined)
  assert.equal(find('CloudEmpty').props.description, 'components.MenuAssetPermissionEditor.noMenus')
  assert.deepEqual((await tree.value.onSave()).assetAccesses, [api.legacyAsset])
})

test('保存只复核有效 iot 范围，忽略 owner 无关项和顺序变化，权限变化时保留草稿并阻止保存', async t => {
  const { api, tree, find } = fixture(t)
  await flush()
  api.user.result = api.user.result.filter(item => item.owner === 'iot').reverse()
  assert.ok(await tree.value.onSave())
  api.user.result.find(item => item.id === 'iot-nested').buttons = []
  assert.equal(await tree.value.onSave(), undefined)
  await nextTick()
  assert.equal(tree.value.canSave, false)
  assert.equal(find('a-alert').props.message, notice('scopeChanged'))
  assert.ok(find('a-table').props.records[0].buttons.length)
})

test('加载和保存范围校验失败时不放开编辑，支持重新加载或重试保存', async t => {
  const { api, tree, find } = fixture(t)
  api.user = { success: false, result: [] }
  await tree.value.load()
  await nextTick()
  assert.equal(find('a-alert').props.message, notice('loadFailed'))
  assert.equal(tree.value.canSave, false)
  api.user = success([menu('iot-base', 'iot')])
  await tree.value.load()
  await nextTick()
  assert.equal(tree.value.canSave, true)
  const validScope = api.user
  api.user = success(null)
  assert.equal(await tree.value.onSave(), undefined)
  assert.equal(notices.at(-1)[0], notice('verifyFailed'))
  api.user = validScope
  assert.ok(await tree.value.onSave())
})

test('校验期间切换角色不会返回旧角色授权载荷', async t => {
  const { api, tree } = fixture(t)
  await flush()
  let resolve
  api.userResponse = () => new Promise(done => { resolve = done })
  const saving = tree.value.onSave()
  api.userResponse = () => api.user
  route.params.id = 'role-2'
  await flush()
  resolve(api.user)
  assert.equal(await saving, undefined)
  assert.equal(tree.value.canSave, true)
  assert.ok(http.calls.some(call => call.url === '/menu/role/role-2/_grant/detail'))
})


test('notification role scope renders read-only, overrides legacy merge, then blocks when grantability is withdrawn', async t => {
  const { api, tree, findAll } = fixture(t)
  const channel = api.detail.menus.find(menu => menu.id === 'iot-base')
  channel.assetTypes = ['notifyConfig']
  channel.assetAccesses = ['all', 'tenant', 'business_application'].map(supportId => ({ assetType: 'notifyConfig', supportId }))
  api.detail.assetAccesses.push({ assetType: 'notifyConfig', accesses: [{ supportId: 'all' }, { supportId: 'business_application' }] })
  api.fixedGrantable = [{ assetType: 'notifyConfig', accesses: [{ supportId: 'tenant' }, { supportId: 'all' }] }]
  await tree.value.load()
  await nextTick()
  assert.ok(findAll('div').some(node => node.props.class === 'fixed-asset-scope'))
  assert.ok(findAll('a-radio').every(node => !['all', 'tenant', 'business_application'].includes(node.props.value)))
  const snapshot = await tree.value.onSave()
  assert.deepEqual(snapshot.assetAccesses.find(item => item.assetType === 'notifyConfig').accesses, [{ supportId: 'tenant' }])
  assert.deepEqual(flatten(snapshot.menus).find(item => item.id === channel.id).assetAccesses,
    [{ assetType: 'notifyConfig', supportId: 'tenant', granted: true }])
  api.fixedGrantable = [{ assetType: 'notifyConfig', accesses: [{ supportId: 'all' }] }]
  assert.equal(await tree.value.onSave(), undefined)
  assert.deepEqual(notices.at(-1), ['components.MenuAssetPermissionEditor.fixedScopeSaveBlocked', 'warning'])
})
