import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { parse, compileScript } from 'vue/compiler-sfc'

const root = fileURLToPath(new URL('..', import.meta.url))
const { outputFiles } = await build({
  stdin: { resolveDir: root, contents: `
    export * from './views/system/Role/roleScope';
    export * from './views/system/Role/RoleLeft/useRoleNavigation';
    export * from './views/system/Role/RoleRight/useRoleTable';
    export * from './views/system/Role/RoleRight/components/useRoleForm';
    export * from './views/system/Role/Detail/useRoleDetail';
    export { default as Left } from './views/system/Role/RoleLeft/index.vue';
    export { default as AddDialog } from './views/system/Role/RoleRight/components/AddDialog.vue';
    export { reactive, ref, watch, nextTick, effectScope, createRenderer, h, defineComponent } from 'vue';
    export { useProTableRequest } from '../../node_modules/@jetlinks-web/components/es/ProTable/hooks/useProTableRequest.js';
    export { http } from '@jetlinks-web/core';
    export { navigation } from '@jetlinks-web-core/store/menu';
    export { route } from 'vue-router';
  ` },
  bundle: true, write: false, format: 'esm', platform: 'node',
  plugins: [{ name: 'role-page-boundaries', setup(plugin) {
    plugin.onResolve({ filter: /^vue$/ }, () => ({ path: import.meta.resolve('vue'), external: true }))
    plugin.onLoad({ filter: /\.vue$/ }, async args => {
      const source = await readFile(args.path, 'utf8')
      const { descriptor } = parse(source, { filename: args.path })
      const compiled = compileScript(descriptor, { id: args.path, inlineTemplate: true })
      return { contents: compiled.content, loader: 'ts' }
    })
    plugin.onResolve({ filter: /^(@jetlinks-web\/core|@jetlinks-web\/utils|vue-i18n|vue-router|@jetlinks-web-core\/(hooks|store\/menu|api\/system\/menu))$/ }, args => ({ path: args.path, namespace: 'fixture' }))
    plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: {
      '@jetlinks-web/core': `export const http = { calls: [], handler: null }; export const request = Object.fromEntries(
        ['get','post','patch','remove','put'].map(method => [method, (url, data, config) => {
          http.calls.push({ method, url, data: structuredClone(data), config }); return http.handler(method, url, data, config);
        }]));`,
      '@jetlinks-web/utils': `export const onlyMessage = () => {}; export const randomString = () => 'new-group';`,
      'vue-i18n': `export const useI18n = () => ({ t: key => key });`,
      'vue-router': `import { reactive } from 'vue'; export const route = reactive({ query: {}, params: { id: '' } }); export const useRoute = () => route;`,
      '@jetlinks-web-core/hooks': `export const useTabSaveSuccessBack = () => ({ onBack: () => {} });`,
      '@jetlinks-web-core/store/menu': `export const navigation = []; export const useMenuStore = () => ({ jumpPage: (...args) => navigation.push(args) });`,
      '@jetlinks-web-core/api/system/menu': `export const getMenuGrantDetail = () => { throw new Error('Global grant must not load in this fixture'); };`,
    }[args.path] }))
  } }],
})
const { buildRoleNavigation, buildRoleQuery, roleScopeKey, useRoleNavigation, useRoleTable, useRoleForm, useRoleDetail, route,
  Left, AddDialog, reactive, ref, watch, nextTick, effectScope, createRenderer, h, defineComponent,
  useProTableRequest, http, navigation } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`)
const flush = async () => { await new Promise(resolve => setImmediate(resolve)); await nextTick() }
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const app = (id = 'a') => ({ id, name: `应用${id}`, templateId: `template-${id}` })
const appScope = (id = 'a') => ({ kind: 'application', application: app(id) })
const success = result => ({ success: true, status: 200, result })
function fixture() {
  http.calls = []; navigation.length = 0
  route.params.id = ''
  http.handler = async (method, url, data) => {
    if (url.startsWith('/business-application/_query')) return success([app('a'), app('b')])
    if (url === '/role/group/_query/no-paging') return success([{ id: 'default_group', name: '默认' }, { id: 'same', name: '自定义分组' }])
    if (url.startsWith('/business-application-template/')) return success({ id: url.split('/').at(-1), provider: 'official' })
    if (url === '/role/_query/') return success({ data: [], total: 0, pageSize: data.pageSize || 12 })
    return success({ id: data?.id || 'created-role' })
  }
}
// Mount real hooks/SFCs with Vue; only visual controls and external boundaries are replaced.
const renderer = createRenderer({
  createElement: tag => ({ tag, props: {}, children: [], parent: null }),
  insert(child, parent) { child.parent = parent; parent.children.push(child) },
  remove(child) { if (child.parent) child.parent.children = child.parent.children.filter(item => item !== child) },
  setElementText(el, text) { el.text = text }, createText: text => ({ tag: '#text', text }),
  createComment: text => ({ tag: '#comment', text }), setText(el, text) { el.text = text },
  parentNode: el => el.parent, nextSibling: () => null,
  patchProp(el, key, prev, next) { el.props[key] = next },
})
function mount(t, factory, render = () => h('div')) {
  let state
  const component = defineComponent({ setup() { state = factory(); return () => render(state) } })
  const vm = renderer.createApp(component)
  vm.config.globalProperties.$t = key => key
  const passthrough = name => defineComponent({ inheritAttrs: false, setup: (_, { attrs, slots }) => () => h(name, attrs, slots.default?.()) })
  for (const name of ['a-input','a-spin','a-alert','a-button','a-modal','a-form-item','a-select','a-textarea','j-ellipsis','j-permission-button','CloudEmpty','AIcon']) vm.component(name, passthrough(name))
  vm.component('a-form', defineComponent({ setup: (_, { slots, expose }) => { expose({ validate: async () => ({}) }); return () => h('form', slots.default?.()) } }))
  vm.component('a-tree', defineComponent({ props: ['treeData'], setup: (props, { slots }) => () => h('tree', props.treeData.flatMap(node => [node, ...(node.children || [])]).map(node => h('node', { kind: node.kind }, slots.title?.(node)))) }))
  const rootNode = { children: [] }; vm.mount(rootNode)
  t.after(() => vm.unmount())
  return { state, rootNode, stop: () => vm.unmount() }
}
const descendants = node => [node, ...(node.children || []).flatMap(descendants)]

test('tree separates equal application/group IDs, keeps app root non-selectable and applications leaves', () => {
  const nodes = buildRoleNavigation([{ id: 'same', name: '分组' }], [app('same')], '', { global: '全局', applications: '应用角色' })
  assert.equal(nodes[1].selectable, false)
  assert.equal(nodes[1].children[0].isLeaf, true)
  assert.equal(nodes[1].children[0].group, undefined)
  assert.notEqual(nodes[0].children[0].key, nodes[1].children[0].key)
  assert.deepEqual(buildRoleNavigation([], [app('a'), app('b')], '应用b', { global: '全局', applications: '应用角色' })[0].children.map(node => node.key), ['application:b'])
})

test('scope is always ANDed outside user OR conditions', () => {
  const filter = { terms: [{ column: 'name', value: 'one' }, { type: 'or', column: 'id', value: 'two' }] }
  assert.deepEqual(buildRoleQuery(appScope(), filter).terms, [
    { column: 'applicationId', termType: 'eq', value: 'a' }, { type: 'and', terms: filter.terms },
  ])
  assert.deepEqual(buildRoleQuery({ kind: 'group', groupId: 'same' }).terms, [
    { column: 'applicationId', termType: 'isnull', value: 1 }, { column: 'groupId', termType: 'eq', value: 'same' },
  ])
})

test('navigation loads sources independently and retries failed applications', async t => {
  fixture(); const handler = http.handler; let fail = true
  http.handler = (method, url, data) => url.startsWith('/business-application/_query') && fail ? Promise.reject(new Error('offline')) : handler(method, url, data)
  const props = reactive({ scope: { kind: 'global' } })
  const { state } = mount(t, () => useRoleNavigation(props, scope => props.scope = scope))
  await flush()
  assert.equal(state.applicationError.value, true)
  assert.equal(state.treeData.value[0].children.length, 2)
  fail = false; await state.loadApplications()
  assert.equal(state.applicationError.value, false)
  assert.equal(state.treeData.value[1].children.length, 2)
  const last = state.treeData.value[1].children[1]
  state.onSelect([last.key], { node: { key: last.key } })
  assert.equal(roleScopeKey(props.scope), 'application:b')
  state.addGroup()
  assert.equal(state.editingId.value, '')
  const key = state.selectedKeys.value[0]
  state.selectNode(state.treeData.value[1]); state.toggleApplicationRoot()
  assert.equal(state.selectedKeys.value[0], key)
  assert(!state.expandedKeys.value.includes('application_roles'))
})

test('rendered application nodes have no group actions and application selection hides group creation', async t => {
  fixture()
  const props = reactive({ scope: { kind: 'global' } })
  const { rootNode } = mount(t, () => props, () => h(Left, { scope: props.scope, onSelect: scope => props.scope = scope }))
  await flush()
  const nodes = descendants(rootNode).filter(node => node.tag === 'node')
  for (const node of nodes.filter(node => node.props.kind.startsWith('application'))) {
    assert.equal(descendants(node).filter(item => item.tag === 'j-permission-button').length, 0)
  }
  assert(descendants(rootNode).some(node => node.props?.class === 'left-contain__create'))
  props.scope = appScope(); await flush()
  assert(!descendants(rootNode).some(node => node.props?.class === 'left-contain__create'))
})

test('switching scope preserves search, clears dialogs and resolves third-party actions', async t => {
  fixture()
  const props = reactive({ scope: { kind: 'global' } })
  const { state } = mount(t, () => useRoleTable(props))
  state.search({ filter: { terms: [{ column: 'name', termType: 'like', value: '%角色%' }] } })
  state.addRole(); state.copy.visible = true
  props.scope = appScope(); await flush()
  assert.equal(state.dialog.value, undefined); assert.equal(state.copy.visible, false)
  assert.equal(state.queryParams.value.terms[1].terms[0].value, '%角色%')
  let actions = state.getActions({ id: 'r', name: 'role' })
  assert(!actions.some(action => action.id === 'copy'))
  assert(actions.some(action => action.id === 'grant' && !action.disabled))
  actions.find(action => action.id === 'grant').onClick()
  assert.deepEqual(navigation.at(-1), ['system/Role/Detail', { params: { id: 'r' } }])
  const handler = http.handler
  http.handler = (method, url, data) => url.includes('/business-application-template/') ? success({ id: 'template-b', provider: 'third-party' }) : handler(method, url, data)
  props.scope = appScope('b'); await flush()
  assert(!state.getActions({ id: 'r', name: 'role' }).some(action => action.id === 'grant'))
})

test('template failure disables grants but basic role management remains available', async t => {
  fixture(); const handler = http.handler; let fail = true
  http.handler = (method, url, data) => url.includes('/business-application-template/') && fail ? Promise.reject(new Error('offline')) : handler(method, url, data)
  const { state } = mount(t, () => useRoleTable(reactive({ scope: appScope() })))
  await flush(); assert.equal(state.templateError.value, true)
  const actions = state.getActions({ id: 'r', name: 'role' })
  assert.equal(actions.find(action => action.id === 'grant').disabled, true)
  assert(actions.some(action => action.id === 'edit'))
  fail = false; await state.loadTemplate(); assert.equal(state.templateError.value, false)
})

test('late template response cannot turn the current third-party app into a business app', async t => {
  fixture(); const late = deferred(); const handler = http.handler
  http.handler = (method, url, data) => url.endsWith('template-a') ? late.promise : url.endsWith('template-b') ? success({ id: 'template-b', provider: 'third-party' }) : handler(method, url, data)
  const props = reactive({ scope: appScope() }); const { state } = mount(t, () => useRoleTable(props))
  props.scope = appScope('b'); await flush(); late.resolve(success({ id: 'template-a', provider: 'official' })); await flush()
  assert.equal(state.applicationScope.value.applicationId, 'b'); assert.equal(state.applicationScope.value.isExternal, true)
})

test('application form has no group field, creates with applicationId, and keeps failures editable', async t => {
  fixture(); const saved = []
  const { state } = mount(t, () => useRoleForm({ scope: appScope(), mode: 'add' }, id => saved.push(id)))
  state.formRef.value = { validate: async () => ({}) }; state.form.value.name = '新角色'
  await state.confirm()
  const write = http.calls.find(call => call.method === 'post' && call.url === '/role')
  assert.deepEqual(write.data, { name: '新角色', description: '', applicationId: 'a', state: 'enabled' })
  assert.equal(http.calls.some(call => call.url.includes('/role/group/')), false)
  assert.deepEqual(saved, ['created-role'])
  const { rootNode } = mount(t, () => null, () => h(AddDialog, { context: { scope: appScope(), mode: 'add' } }))
  await flush()
  assert.equal(descendants(rootNode).some(node => node.props?.name === 'groupId'), false)
  http.handler = async () => ({ success: false, message: 'no permission' })
  await state.confirm(); assert.equal(state.saveError.value, true); assert.equal(state.loading.value, false)
  assert.deepEqual(saved, ['created-role'])
})

test('editing application role never changes ownership or the source row', async t => {
  fixture(); const current = { id: 'r', name: '原名称', description: '说明', applicationId: 'a', groupId: 'legacy' }
  const { state } = mount(t, () => useRoleForm({ scope: appScope(), mode: 'edit', current }, () => {}))
  state.formRef.value = { validate: async () => ({}) }; state.form.value.name = '新名称'; await state.confirm()
  assert.deepEqual(http.calls.find(call => call.method === 'patch').data, { id: 'r', name: '新名称', description: '说明' })
  assert.equal(current.name, '原名称')
})

test('global form retains group creation and global permission navigation', async t => {
  fixture()
  const { state } = mount(t, () => useRoleForm({ scope: { kind: 'group', groupId: 'same' }, mode: 'add' }, () => {}))
  await flush(); assert.equal(state.groupOptions.value.length, 2)
  state.formRef.value = { validate: async () => ({}) }; state.form.value.name = '全局'; await state.confirm()
  assert.deepEqual(http.calls.find(call => call.method === 'post' && call.url === '/role').data, { name: '全局', description: '', groupId: 'same' })
  const table = mount(t, () => useRoleTable({ scope: { kind: 'global' } })).state
  table.getActions({ id: 'global', name: '全局' }).find(action => action.id === 'grant').onClick()
  assert.deepEqual(navigation.at(-1), ['system/Role/Detail', { params: { id: 'global' } }])
})

test('deletion fixes its target and does not reload a different application', async t => {
  fixture(); const late = deferred(); http.handler = () => late.promise
  const props = reactive({ scope: { kind: 'global' } }); const { state } = mount(t, () => useRoleTable(props))
  let reloads = 0; state.tableRef.value = { reload: () => reloads++ }
  const removal = state.getActions({ id: 'r', name: 'role' }).find(action => action.id === 'delete').popConfirm.onConfirm()
  props.scope = { kind: 'group', groupId: 'x' }; late.resolve(success()); await removal
  assert.equal(http.calls[0].url, '/role/r'); assert.equal(reloads, 0)
})

test('real ProTable request lifecycle resets paging for scope params and rejects late responses', async t => {
  fixture(); const a = deferred(); const b = deferred()
  http.handler = (method, url, data) => data.terms[0].value === 'a' ? a.promise : b.promise
  const props = reactive({ scope: appScope() })
  const { state } = mount(t, () => {
    const table = useRoleTable(props)
    const page = reactive({ pageIndex: 4, pageSize: 12, total: 100 }); const loading = ref(false); const rows = ref([])
    const request = useProTableRequest({ request: table.requestRoles, type: 'PAGE', defaultParams: {} }, page, loading, rows, () => {}, () => {})
    // Match the installed ProTable params watcher: confirmed params always start at page zero.
    watch(table.queryParams, params => request.handleSearch({ ...params, pageSize: page.pageSize, pageIndex: 0 }), { immediate: true, deep: true })
    return { table, page, rows, loading }
  })
  props.scope = appScope('b'); await flush()
  b.resolve(success({ data: [{ id: 'b-role' }], total: 1 })); await flush()
  a.resolve(success({ data: [{ id: 'a-role' }], total: 1 })); await flush()
  assert.equal(state.rows.value[0].id, 'b-role'); assert.equal(state.page.pageIndex, 0)
  assert(http.calls.filter(call => call.url === '/role/_query/').every(call => call.data.pageIndex === 0))
})

test('role menu declares the application read/write and template grant dependencies', async () => {
  const menus = JSON.parse(await readFile(new URL('../baseMenu.json', import.meta.url), 'utf8'))
  const flatten = list => list.flatMap(item => [item, ...flatten(item.children || [])])
  const role = flatten(Array.isArray(menus) ? menus : [menus]).find(item => item.code === 'system/Role')
  assert(role.assetTypes.includes('business_application'))
  assert(role.permissions.some(item => item.permission === 'business-application' && item.actions.includes('query')))
  const update = role.buttons.find(button => button.id === 'update')
  assert(update.permissions.some(item => item.permission === 'business-application' && item.actions.includes('save')))
  assert(update.permissions.some(item => item.permission === 'business-application-template' && item.actions.includes('grant')))
})

test('scope changes clear exposed rows even when the next request fails', async t => {
  fixture()
  const props = reactive({ scope: appScope() })
  const { state } = mount(t, () => useRoleTable(props))
  await flush()
  const rows = [{ id: 'a-role', name: 'A', applicationId: 'a' }]
  state.tableRef.value = { reload: () => {}, dataSource: rows }
  props.scope = appScope('b')
  assert.equal(rows.length, 0)
  http.handler = async () => { throw new Error('offline') }
  await assert.rejects(state.requestRoles(state.queryParams.value), /offline/)
  assert.equal(rows.length, 0)
})

test('form validation and in-flight saves cannot submit twice or notify after unmount', async t => {
  fixture(); const saved = []; const validation = deferred(); const write = deferred()
  http.handler = () => write.promise
  const { state, stop } = mount(t, () => useRoleForm({ scope: appScope(), mode: 'add' }, id => saved.push(id)))
  state.formRef.value = { validate: () => validation.promise }
  state.form.value.name = '新角色'
  const first = state.confirm(); const second = state.confirm()
  validation.resolve({}); await flush()
  assert.equal(http.calls.filter(call => call.url === '/role').length, 1)
  stop(); write.resolve(success({ id: 'r' })); await Promise.all([first, second])
  assert.deepEqual(saved, [])
})

test('global group creation, cancellation, editing and deleted selection retain their boundaries', async t => {
  fixture(); const props = reactive({ scope: { kind: 'global' } })
  const { state } = mount(t, () => useRoleNavigation(props, scope => props.scope = scope))
  await flush(); state.addGroup()
  assert.equal(state.editingId.value, 'new-group')
  const group = state.treeData.value[0].children.find(node => node.group.id === 'new-group').group
  state.cancelEdit(); assert.equal(state.treeData.value[0].children.some(node => node.group.id === 'new-group'), false)
  state.addGroup(); state.editName.value = '新分组'; await state.saveGroup(group)
  assert.deepEqual(http.calls.find(call => call.method === 'patch').data, { id: 'new-group', name: '新分组' })
  const defaultGroup = state.treeData.value[0].children[0].group
  state.editGroup(defaultGroup); assert.equal(state.editingId.value, '')
  props.scope = { kind: 'group', groupId: 'same' }
  const handler = http.handler
  http.handler = (method, url, data) => url === '/role/group/_query/no-paging' ? success([defaultGroup]) : handler(method, url, data)
  await state.removeGroup({ id: 'same', name: '自定义分组' })
  assert.equal(props.scope.kind, 'global')
})

test('role details resolve application ownership and show only the permission tab', async t => {
  fixture(); route.params.id = 'app-role'
  http.handler = async (_method, url) => {
    if (url === '/role/app-role') return success({ id: 'app-role', name: '应用管理员', applicationId: 'a' })
    if (url === '/business-application/a') return success(app())
    if (url === '/business-application-template/template-a') return success({ id: 'template-a', provider: 'official' })
    throw new Error(url)
  }
  const { state } = mount(t, useRoleDetail); await flush()
  assert.equal(state.application.value.application.name, '应用a')
  assert.equal(state.application.value.role.name, '应用管理员')
  assert.deepEqual(state.application.value.scope, { applicationId: 'a', templateId: 'template-a', isExternal: false })
  assert.deepEqual(state.tabs.value.map(tab => tab.key), ['permission'])
})

test('role detail failures block the page until a successful retry without a global fallback', async t => {
  fixture(); route.params.id = 'r'; let fail = true
  http.handler = async (_method, url) => {
    if (url === '/role/r') return success({ id: 'r', applicationId: 'a' })
    if (url === '/business-application/a') return success(app())
    return fail ? { success: false } : success({ id: 'template-a', provider: 'third-party' })
  }
  const { state } = mount(t, useRoleDetail); await flush()
  assert.equal(state.error.value, true); assert.equal(state.detail.value, undefined)
  fail = false; await state.load()
  assert.equal(state.error.value, false); assert.equal(state.application.value.scope.isExternal, true)
  assert.deepEqual(state.tabs.value.map(tab => tab.key), ['permission'])
})

test('switching the detail route discards stale application data and restores global tabs', async t => {
  fixture(); route.params.id = 'old'; const late = deferred()
  http.handler = async (_method, url) => {
    if (url === '/role/old') return success({ id: 'old', applicationId: 'a' })
    if (url === '/business-application/a') return late.promise
    if (url === '/role/new') return success({ id: 'new', name: '全局角色' })
    throw new Error(url)
  }
  const { state } = mount(t, useRoleDetail); await flush()
  route.params.id = 'new'; await flush()
  late.resolve(success(app())); await flush()
  assert.equal(state.detail.value.kind, 'global'); assert.equal(state.detail.value.role.id, 'new')
  assert.equal(state.application.value, undefined)
  assert.deepEqual(state.tabs.value.map(tab => tab.key), ['permission', 'user'])
  assert(!http.calls.some(call => call.url.startsWith('/business-application-template/')))
})
