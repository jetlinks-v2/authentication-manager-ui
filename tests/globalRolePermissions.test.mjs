import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { compileScript, parse } from 'vue/compiler-sfc'
import { createRenderer, defineComponent, h, nextTick } from 'vue'

const moduleRoot = fileURLToPath(new URL('..', import.meta.url))
const core = fileURLToPath(new URL('../../../jetlinks-web-core/src', import.meta.url))
const boundaries = {
  '@jetlinks-web/core': `
    export const http = { calls: [], handler: null };
    export const request = Object.fromEntries(['get', 'post', 'put'].map(method => [method, (url, data, config) => {
      http.calls.push({ method, url, data, config }); return http.handler(method, url);
    }]));`,
  '@jetlinks-web/utils': 'export const notices = []; export const onlyMessage = (...args) => notices.push(args);',
  'vue-i18n': 'export const useI18n = () => ({ t: key => key });',
  'vue-router': `import { reactive } from 'vue'; export const route = reactive({ params: { id: 'role-1' } }); export const useRoute = () => route; export const useRouter = () => ({});`,
  '@authentication-manager-ui/components/ApplicationRolePermissions/useApplicationRolePermissions': `import { ref } from 'vue';
    export const useApplicationRolePermissions = () => ({ savingPermissions: ref(false) });`,
  '@jetlinks-web-core/hooks': `export { useMenuAssetPermissionEditor } from '${core}/hooks/useMenuAssetPermissionEditor';
    export const useRegistryOptions = ({ baseOptions }) => ({ mergedOptions: baseOptions });`,
  '@jetlinks-web-core/components': `export { default as MenuAssetPermissionEditor } from '${core}/components/MenuAssetPermissionEditor/index.vue';`,
  '@jetlinks-web-core/utils/utils': 'export const isNoCommunity = true;',
  '@jetlinks-web-core/utils/consts': "export const USER_CENTER_MENU_CODE = 'account-center';",
}
const { outputFiles } = await build({
  stdin: { resolveDir: moduleRoot, contents: `
    export { default as PermissionTree } from './views/system/Role/Detail/components/PermissionTree.vue';
    export { useRolePermission } from './views/system/Role/Detail/Permission/useRolePermission';
    export { http } from '@jetlinks-web/core'; export { route } from 'vue-router'; export { notices } from '@jetlinks-web/utils';
  ` },
  alias: { '@jetlinks-web-core': core, '@authentication-manager-ui': moduleRoot },
  platform: 'node', format: 'esm', bundle: true, write: false,
  define: { 'import.meta.env': JSON.stringify({ VITE_APP_ENVIRONMENT: '' }) },
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
const { PermissionTree, useRolePermission, http, route, notices } = await import(
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
    detail, legacyAsset, saveResponse: success(null),
    user: success([menu('iot-nested', 'iot'), menu('iot-base', 'iot'), menu('iot-no-access', 'iot', { granted: false }), menu('legacy-app', 'app')]),
    userResponse: () => api.user,
  }
  http.handler = async (method, url) => {
    if (method === 'get' && /^\/menu\/role\/role-\d+\/_grant\/detail$/.test(url)) return success(detail)
    if (method === 'post' && url === userMenuPath) return api.userResponse()
    if (method === 'put' && url === '/menu/role/role-1/_grant') return api.saveResponse
    if (method === 'get' && url === '/asset/types') return success([{ id: legacyAsset.assetType, name: '既有数据权限' }])
    assert.fail(`Unexpected request ${method} ${url}`)
  }
  let page
  const vm = renderer.createApp({ setup() {
    page = useRolePermission({})
    return () => h(PermissionTree, { ref: page.permissionTreeRef })
  } })
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
  const find = tag => findAll(tag)[0]
  const switchTab = async key => { find('a-tabs').props['onUpdate:activeKey'](key); await nextTick() }
  const rows = () => flatten(find('a-table')?.props.records)
  return { api, tree: page.permissionTreeRef, save: page.clickSave, find, findAll, switchTab, rows }
}

test('基础菜单默认选中，表头只操作本组可编辑项，不改其他菜单、按钮和资产策略', async t => {
  const { api, tree, find, findAll } = fixture(t)
  await flush()
  assert.equal(tree.value.canSave, true)
  assert.deepEqual(findAll('a-tab-pane').map(node => node.props.tab), [notice('baseMenus'), 'MenuSetting.owner.app'])
  assert.equal(find('a-tabs').props.activeKey, 'iot')
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

for (const [owner, id, label] of [['app', 'legacy-app', 'MenuSetting.owner.app'], ['iot', 'iot-base', notice('baseMenus')]]) {
  test(`仅 ${owner} 有可编辑项时只显示并选中该页签`, async t => {
    const { api, tree, find, findAll, rows } = fixture(t)
    api.user = success([menu(id, owner)])
    await tree.value.load()
    await nextTick()
    assert.deepEqual(findAll('a-tab-pane').map(node => node.props.tab), [label])
    assert.equal(find('a-tabs').props.activeKey, owner)
    assert.ok(rows().some(node => node.id === id))
    assert.ok(rows().every(node => node.owner === owner))
  })
}

test('两组均无可编辑项时显示空态，保存不清空原有授权', async t => {
  const { api, tree, find } = fixture(t)
  api.user = success([menu('unknown-owner', 'cloud')])
  await tree.value.load()
  await nextTick()
  assert.ok(!find('a-table') && !find('a-tabs'))
  assert.equal(find('CloudEmpty').props.description, 'components.MenuAssetPermissionEditor.noMenus')
  const snapshot = await tree.value.onSave()
  assert.ok(flatten(snapshot.menus).every(node => node.granted))
  assert.deepEqual(snapshot.assetAccesses, [api.legacyAsset])
})

test('应用菜单编辑和基础菜单全选共用一次保存，保留跨 owner 层级并正确回显', async t => {
  const { api, tree, save, find, findAll, switchTab, rows } = fixture(t)
  const [appParent, base] = api.detail.menus
  const app = appParent.children.pop()
  api.detail.menus.push(app)
  appParent.granted = false
  appParent.buttons = [] // 仅有跨 owner 子节点，不能根据该子节点勾选父菜单。
  api.user.result.push(menu(appParent.id, 'app'))
  app.buttons.push({ id: 'edit', granted: false }, { id: 'delete', granted: false })
  api.user.result.find(node => node.id === app.id).buttons.push({ id: 'edit', granted: true })
  base.assetAccesses = [{ assetType: 'device', supportId: 'creator', granted: true }]
  await tree.value.load()
  await nextTick()
  const requests = http.calls.length
  const assetValues = () => findAll('a-radio-group').map(node => node.props.value)
  assert.deepEqual(assetValues(), ['org', 'creator'])
  await switchTab('app')
  assert.deepEqual(rows().map(node => node.id), [appParent.id, app.id])
  assert.equal(rows()[0].granted, false)
  assert.deepEqual(rows()[1].buttons.map(button => button.id), ['view', 'edit'])
  const edit = findAll('a-checkbox').find(node => flatten([node]).some(child => child.text === 'edit'))
  edit.props.onChange({ target: { checked: true } })
  await switchTab('iot')
  assert.deepEqual(assetValues(), ['org', 'creator'])
  find('a-checkbox').props.onChange({ target: { checked: false } })
  await switchTab('app')
  assert.deepEqual(assetValues(), ['org'])
  assert.equal(rows()[0].granted, false)
  assert.ok(rows()[1].buttons.every(button => button.granted))
  assert.equal(http.calls.length, requests)
  await save()
  const writes = http.calls.filter(call => call.method === 'put')
  assert.equal(writes.length, 1)
  const snapshot = writes[0].data
  const nodes = new Map(flatten(snapshot.menus).map(node => [node.id, node]))
  assert.equal(nodes.get(appParent.id).granted, false)
  assert.equal(nodes.get(appParent.id).children[0].id, 'iot-nested')
  assert.equal(nodes.get('iot-nested').parentId, appParent.id)
  assert.deepEqual(nodes.get(app.id).buttons.map(button => button.granted), [true, true, false])
  assert.equal(nodes.get(base.id).granted, false)
  assert.equal(nodes.get('unknown-owner').granted, true)
  assert.deepEqual(snapshot.assetAccesses, [api.legacyAsset])
  Object.assign(api.detail, snapshot)
  await tree.value.load()
  await nextTick()
  await switchTab('iot')
  assert.equal(rows().find(node => node.id === base.id).granted, false)
  await switchTab('app')
  assert.ok(rows().find(node => node.id === app.id).buttons.every(button => button.granted))
})

test('应用页签提升跨 owner 后代到最近同组祖先；本组撤销不动中间的基础菜单', async t => {
  const { api, tree, find, switchTab } = fixture(t)
  const nested = api.detail.menus[0].children[0]
  nested.children = [menu('app-grandchild', 'app')]
  api.user.result.push(menu('app-grandchild', 'app'))
  await tree.value.load()
  await nextTick()
  await switchTab('app')
  const [parent] = find('a-table').props.records
  assert.equal(parent.id, 'app-ancestor')
  assert.deepEqual(parent.children.map(node => node.id), ['app-grandchild', 'legacy-app'])
  find('a-checkbox').props.onChange({ target: { checked: false } })
  const [saved] = (await tree.value.onSave()).menus
  assert.equal(saved.granted, true, '仅展示层级的祖先不在授权范围内')
  assert.equal(saved.children[0].granted, true)
  assert.ok(saved.children[0].buttons.every(button => button.granted))
  const [grandchild] = saved.children[0].children
  assert.equal(grandchild.granted, false)
  assert.equal(grandchild.parentId, nested.id)
  assert.equal(saved.children[1].granted, false)
})

for (const [owner, id] of [['iot', 'iot-nested'], ['app', 'legacy-app']]) {
  test(`保存忽略顺序及无关 owner，但 ${owner} 可编辑按钮变化时保留草稿并阻止提交`, async t => {
    const { api, tree, save, find, rows } = fixture(t)
    await flush()
    api.user.result.reverse().push(menu('irrelevant', 'cloud'))
    assert.ok(await tree.value.onSave())
    find('a-checkbox').props.onChange({ target: { checked: false } })
    api.user.result.find(item => item.id === id).buttons = []
    await save()
    await nextTick()
    assert.equal(tree.value.canSave, false)
    assert.equal(find('a-alert').props.message, notice('scopeChanged'))
    assert.equal(rows().find(node => node.id === 'iot-base').granted, false)
    assert.ok(!http.calls.some(call => call.method === 'put'))
  })
}

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


test('私有化全局角色保存时升级为全部数据，不依赖可授权目录；不改其他资产', async t => {
  const { api, tree, save, findAll } = fixture(t)
  const channel = api.detail.menus.find(menu => menu.id === 'iot-base')
  const fixedTypes = ['notifyConfig', 'notifySubscriberProvider']
  const devicePolicy = { assetType: 'device', accesses: [{ supportId: 'org' }] }
  channel.assetTypes = [...fixedTypes, 'device']
  channel.assetAccesses = fixedTypes.map(assetType => ({ assetType, supportId: 'creator', granted: true }))
  channel.assetAccesses.push({ assetType: 'device', supportId: 'org', granted: true })
  api.detail.assetAccesses.push(...fixedTypes.map(assetType => ({
    assetType, accesses: [{ supportId: 'creator' }, { supportId: 'business_application' }],
  })), devicePolicy)
  await tree.value.load()
  await nextTick()
  const groups = findAll('a-radio-group').filter(node => node.props.value === 'ignore')
  assert.equal(groups.length, 2, '通知配置及通知订阅配置均选中全部数据')
  for (const group of groups) {
    const options = flatten(group.children).filter(node => node.tag === 'a-radio')
    assert.deepEqual(options.map(node => node.props.value), ['ignore'])
    assert.ok(flatten(options).some(node => node.text === 'components.MenuAssetPermissionEditor.fixedAll'))
  }
  assert.ok(!findAll('div').some(node => node.props.class === 'fixed-asset-scope'))
  assert.equal(findAll('a-alert').length, 0)
  assert.ok(!http.calls.some(call => call.method === 'put'))
  api.saveResponse = { success: false, message: '授权被拒绝' }
  await save()
  assert.equal(http.calls.at(-1).method, 'put')
  assert.ok(!notices.some(([key]) => key === 'Permission.index.071527-2'))
  api.saveResponse = success(null)
  await save()
  assert.equal(notices.at(-1)[0], 'Permission.index.071527-2')
  const snapshot = http.calls.at(-1).data
  assert.deepEqual(snapshot.assetAccesses, [api.legacyAsset, ...fixedTypes.map(assetType => ({
    assetType, accesses: [{ supportId: 'ignore' }],
  })), devicePolicy])
  assert.deepEqual(flatten(snapshot.menus).find(item => item.id === channel.id).assetAccesses,
    [...fixedTypes.map(assetType => ({ assetType, supportId: 'ignore', granted: true })),
      { assetType: 'device', supportId: 'org', granted: true }])
  assert.ok(!http.calls.some(call => call.url === '/menu/asset-accesses/grantable'))
})
