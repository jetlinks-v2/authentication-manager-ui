import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { validateRules } from 'ant-design-vue/lib/form/utils/validateUtil.js'
import { build } from 'esbuild'
import { parse, compileScript } from 'vue/compiler-sfc'

const root = fileURLToPath(new URL('..', import.meta.url))
const core = fileURLToPath(new URL('../../../jetlinks-web-core/src', import.meta.url))
const { outputFiles } = await build({
  stdin: { resolveDir: root, contents: `
    export * from './views/system/User/useApplicationRoleSelection';
    export { default as Selector } from './views/system/User/components/ApplicationRoleSelector.vue';
    export { default as EditDialog } from './views/system/User/components/EditUserDialog.vue';
    export { default as UserPage } from './views/system/User/index.vue';
    export { effectScope, nextTick, reactive, ref, createRenderer, h, defineComponent } from 'vue';
    export { http } from '@jetlinks-web/core';
    export { sessionFixture } from '@jetlinks-web-core/store/user';
  ` },
  bundle: true, write: false, format: 'esm', platform: 'node',
  alias: { '@authentication-manager-ui': root, '@jetlinks-web-core': core },
  plugins: [{ name: 'user-role-io', setup(plugin) {
    plugin.onResolve({ filter: /^vue$/ }, () => ({ path: import.meta.resolve('vue'), external: true }))
    plugin.onLoad({ filter: /\.vue$/ }, async args => {
      const { descriptor } = parse(await readFile(args.path, 'utf8'), { filename: args.path })
      const compiled = compileScript(descriptor, { id: args.path, inlineTemplate: true })
      const autoImports = ['ref', 'reactive', 'computed', 'watch', 'onMounted', 'nextTick']
        .filter(name => !compiled.bindings[name])
      return { loader: 'ts', contents: `import { ${autoImports.join(',')} } from 'vue';\n${compiled.content}` }
    })
    const fixtures = {
      '@jetlinks-web-core/components/DocumentHelp': `import { h } from 'vue'; export default {
        props: ['code', 'helpKey'], setup: props => () => h('span', { 'data-help-code': props.code, 'data-help-key': props.helpKey })
      };`,
      '@jetlinks-web/core': `export const http = { calls: [], handler: null }; export const request = Object.fromEntries(
        ['get','post','put','patch','remove'].map(method => [method, (url, data, config) => {
          http.calls.push({ method, url, data: data === undefined ? undefined : JSON.parse(JSON.stringify(data)), config });
          return http.handler(method, url, data, config);
        }])); export const ndJson = request;`,
      '@jetlinks-web/utils': `export const onlyMessage = () => {}; export const downloadFileByUrl = () => {};`,
      '@jetlinks-web-core/utils/comm': `export { onlyMessage } from '@jetlinks-web/utils';`,
      '@jetlinks-web-core/utils': `export const filterSelectNode = (value, node, key) => node[key].includes(value);`,
      '@jetlinks-web-core/utils/validate': `export const passwordRegEx = () => true;`,
      '@jetlinks-web-core/hooks': `export const useTabSaveSuccess = () => ({ onOpen() {} });`,
      '@jetlinks-web-core/store': `export const useMenuStore = () => ({});`,
      '@jetlinks-web-core/store/user': `export const sessionFixture = { userInfo: {}, steps: [] };
        export const useUserStore = () => sessionFixture;`,
      '@jetlinks-web-core/package': `import { sessionFixture } from '@jetlinks-web-core/store/user';
        export const clearVerifyCache = () => sessionFixture.steps.push('clear-verify');`,
      '@jetlinks-web-core/router': `import { sessionFixture } from '@jetlinks-web-core/store/user';
        export const jumpLogin = options => sessionFixture.steps.push(['navigate', options]);`,
      '@jetlinks-web-core/router/login-transition': `import { sessionFixture } from '@jetlinks-web-core/store/user';
        export const beginLogoutRequest = () => {
          sessionFixture.steps.push('begin');
          return success => sessionFixture.steps.push(['complete', success]);
        };`,
      'ant-design-vue': `export const TreeSelect = { SHOW_ALL: 'SHOW_ALL' };`,
      'vue-i18n': `export const useI18n = () => ({ t: key => key });`,
    }
    plugin.onResolve({ filter: /.*/ }, args => args.path in fixtures ? { path: args.path, namespace: 'fixture' } : undefined)
    plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: fixtures[args.path], loader: 'ts', resolveDir: root }))
  } }],
})
const { useApplicationRoleSelection, Selector, EditDialog, UserPage, effectScope, nextTick,
  reactive, ref, createRenderer, h, defineComponent, http, sessionFixture } = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`,
)
const success = result => ({ status: 200, success: true, result })
const flush = async () => { await new Promise(resolve => setImmediate(resolve)); await nextTick() }
const role = (id, applicationId) => ({ id, name: '管理员', ...(applicationId ? { applicationId } : {}) })
const roles = [role('global'), role('a-role', 'a'), role('b-role', 'b'), role('missing-role', 'missing')]
const group = { groupId: 'default_group', groupName: '默认', roles: roles.slice(0, 2) }
const applications = [{ id: 'a', name: '应用A' }, { id: 'b', name: '应用B' }]
const user = { id: 'user-1', name: '测试用户', username: 'tester', orgList: [{ id: 'org', name: '组织' }],
  positions: [{ id: 'position' }], roleList: [{ id: 'a-role', name: '管理员' }, { id: 'hidden', name: '保留角色' }] }
function fixture({ catalog = roles, groups = [group], apps = applications } = {}) {
  sessionFixture.userInfo = {}
  sessionFixture.steps = []
  http.calls = []
  http.handler = async (method, url) => {
    if (url === '/role/_query/no-paging') return success(structuredClone(catalog))
    if (url === '/role/group/detail/_query/tree') return success(structuredClone(groups))
    if (url.startsWith('/business-application/_query')) return success(structuredClone(apps))
    if (url === '/user/detail/user-1') return success(structuredClone(user))
    if (url === '/user/detail/types') return success([])
    if (method === 'put' || url === '/user/detail/_create') return success('user-1')
    throw new Error(`Unexpected request: ${method} ${url}`)
  }
}
function hook(t) {
  const scope = effectScope()
  t.after(() => scope.stop())
  return { state: scope.run(useApplicationRoleSelection), stop: () => scope.stop() }
}
const flatten = nodes => nodes.flatMap(node => [node, ...flatten(node.children || [])])

// Mount the real page/dialog/selector; replace visual controls and HTTP only.
const renderer = createRenderer({
  createElement: tag => ({ tag, props: {}, children: [], parent: null }),
  insert(child, parent, anchor) {
    if (child.parent) child.parent.children = child.parent.children.filter(node => node !== child)
    child.parent = parent
    const index = anchor ? parent.children.indexOf(anchor) : -1
    index < 0 ? parent.children.push(child) : parent.children.splice(index, 0, child)
  },
  remove(child) { if (child.parent) child.parent.children = child.parent.children.filter(node => node !== child) },
  setElementText(node, text) { node.text = text; node.children = [] },
  createText: text => ({ tag: '#text', text }), createComment: text => ({ tag: '#comment', text }),
  setText(node, text) { node.text = text }, parentNode: node => node.parent,
  nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1] || null,
  patchProp(node, key, previous, next) { node.props[key] = next },
})
const descendants = node => [node, ...(node.children || []).flatMap(descendants)]
const content = node => [node.tag === '#comment' ? '' : node.text || '', ...(node.children || []).map(content)].join('')
function mount(t, component, props = {}, validate = async () => {}) {
  const rootNode = { children: [] }
  const app = renderer.createApp(component, props)
  const passthrough = tag => defineComponent({ inheritAttrs: false, setup: (_, { attrs, slots }) => () => h(tag, attrs, slots.default?.()) })
  for (const name of ['a-modal', 'a-row', 'a-col', 'a-form-item', 'a-input', 'a-input-password', 'a-spin', 'a-tooltip', 'a-flex',
    'j-ellipsis', 'j-permission-button', 'form-item-org', 'AIcon', 'j-page-container', 'FullPage', 'a-dropdown', 'a-button',
    'RegistryComponent', 'ConditionFilter', 'a-menu', 'a-menu-item', 'j-badge-status', 'TableActions', 'TableActionsItem',
    'CloudEmpty', 'BatchImport']) app.component(name, passthrough(name))
  app.component('a-form', defineComponent({ setup: (_, { attrs, slots, expose }) => {
    expose({ validate, clearValidate() {} })
    return () => h('form', attrs, slots.default?.())
  } }))
  app.component('a-tree-select', defineComponent({
    props: ['value', 'treeData', 'disabled', 'filterTreeNode', 'treeDefaultExpandedKeys', 'treeExpandAction'],
    emits: ['update:value', 'change'],
    setup: (props, { slots, emit }) => {
      const change = ids => { emit('update:value', ids); emit('change', ids) }
      return () => h('role-select', { ...props, change }, [
        ...(props.value || []).map(id => h('role-tag', { id }, slots.tagRender?.({
          value: id, label: flatten(props.treeData).find(role => role.id === id)?.name || id,
          onClose: () => change(props.value.filter(value => value !== id)),
        }))),
        ...flatten(props.treeData).map(role => h('role-option', { id: role.id }, slots.title?.(role))),
      ])
    },
  }))
  app.component('j-pro-table', defineComponent({ setup: (_, { attrs, slots, expose }) => {
    expose({ reload() {} })
    return () => h('table', attrs, [slots.headerRightRender?.(), h('role-cell', slots.roleList?.({ roleList: user.roleList }))])
  } }))
  app.config.globalProperties.$t = key => key
  app.mount(rootNode)
  t.after(() => app.unmount())
  return {
    rootNode,
    find: (tag, predicate = () => true) => descendants(rootNode).find(node => node.tag === tag && predicate(node)),
  }
}

test('catalog, groups, labels and search options share application names and retain original IDs', async t => {
  fixture()
  const { state } = hook(t)
  await state.load()
  assert.deepEqual(state.roles.value.map(role => role.name), ['管理员', '应用A-管理员', '应用B-管理员', '管理员'])
  assert.equal(state.roleGroups.value[0].roles[1].name, '应用A-管理员')
  assert.equal(state.formatRoleName({ id: 'a-role', name: '管理员' }), '应用A-管理员')
  assert.equal(state.formatRoleName({ id: 'hidden', name: '保留角色' }), '保留角色')
  assert.deepEqual(await state.getRoleOptions(), roles.map((role, index) => ({ label: state.roles.value[index].name, value: role.id })))
  assert.equal(roles[1].name, '管理员')
})

test('missing or failed application metadata falls back without disabling role selection', async t => {
  fixture()
  const { state } = hook(t)
  await state.load()
  const handler = http.handler
  for (const response of [() => Promise.reject(new Error('forbidden')), () => success([]),
    () => success([{ id: 'a', name: '' }]), () => ({ success: false })]) {
    http.handler = (method, url) => url.startsWith('/business-application/_query') ? response() : handler(method, url)
    await state.load()
    assert.equal(state.unavailable.value, false)
    assert.equal(state.roles.value[1].name, '管理员')
    assert.deepEqual(state.roles.value.map(role => role.id), roles.map(role => role.id))
    const ui = mount(t, Selector, {
      roles: state.roles.value, roleGroups: state.roleGroups.value, applications: state.applications.value,
    })
    const { treeData } = ui.find('role-select').props
    const appRoot = treeData.find(node => node.id === 'application_roles')
    assert.deepEqual(appRoot.children.map(node => [node.id, node.name, node.disabled]), [
      ['a-role', '管理员', undefined], ['b-role', '管理员', undefined], ['missing-role', '管理员', undefined],
    ])
  }
})

test('role or group errors protect edits and support a later successful load', async t => {
  fixture()
  const { state } = hook(t)
  const handler = http.handler
  for (const endpoint of ['/role/_query/no-paging', '/role/group/detail/_query/tree']) {
    http.handler = (method, url) => url === endpoint ? Promise.resolve({ success: false }) : handler(method, url)
    await assert.rejects(state.load())
    assert.equal(state.unavailable.value, true)
    assert.equal(state.loading.value, false)
    http.handler = handler
    await state.load()
    assert.equal(state.unavailable.value, false)
  }
})

test('overlapping list/filter requests are shared and disposed responses do not update state', async t => {
  fixture()
  let finish
  const handler = http.handler
  http.handler = (method, url) => url === '/role/_query/no-paging'
    ? new Promise(resolve => { finish = resolve }) : handler(method, url)
  const { state, stop } = hook(t)
  const first = state.loadRoleOptions()
  const second = state.loadRoleOptions()
  assert.equal(first, second)
  assert.equal(http.calls.filter(call => call.url === '/role/_query/no-paging').length, 1)
  stop()
  finish(success(roles))
  await first
  assert.deepEqual(state.roles.value, [])
})

test('dialog orders global groups and applications like role navigation, with unique selectable leaves', async t => {
  fixture({
    catalog: [...roles, role('global_role'), { ...role('custom-role'), groupId: 'custom' },
      { ...role('hidden-group-role'), groupId: 'not-visible' }],
    groups: [{ groupId: 'custom', groupName: '自定义', roles: [role('group-only')] },
      { ...group, roles: [roles[0], role('a-role'), role('missing-role', 'missing')] }],
    apps: [...applications].reverse(),
  })
  const ui = mount(t, EditDialog, { type: 'edit', data: { id: user.id }, visible: true })
  await flush()
  const { treeData, treeDefaultExpandedKeys, treeExpandAction, filterTreeNode } = ui.find('role-select').props
  const [globalRoot, appRoot, hidden] = treeData
  assert.deepEqual(treeData.map(node => node.name), ['RoleLeft.index.507330-5', 'ProjectApplication.role.title', '保留角色'])
  assert.deepEqual(globalRoot.children.map(node => node.id), ['group:default_group', 'group:custom', 'global_role', 'hidden-group-role'])
  assert.deepEqual(globalRoot.children[0].children.map(node => node.id), ['global'])
  assert.deepEqual(globalRoot.children[1].children.map(node => node.id), ['custom-role', 'group-only'])
  assert.deepEqual(appRoot.children.map(node => node.id), ['application:b', 'application:a', 'missing-role'])
  const [bRole, aRole] = appRoot.children.flatMap(node => node.children || [])
  assert.deepEqual([bRole.name, aRole.name], ['应用B-管理员', '应用A-管理员'])
  assert.ok(filterTreeNode('应用A', aRole))
  assert.ok(!filterTreeNode('应用A', bRole))
  assert.equal(appRoot.children[2].name, '管理员')
  const nodes = flatten(treeData)
  assert.equal(new Set(nodes.map(node => node.id)).size, nodes.length)
  assert.ok(nodes.filter(node => node.children).every(node => node.selectable === false && !node.disabled))
  assert.ok(nodes.filter(node => !node.children && node !== hidden).every(node => node.selectable !== false && !node.disabled))
  assert.equal(hidden.disabled, true)
  assert.equal(hidden.selectable, false)
  assert.deepEqual(treeDefaultExpandedKeys, [globalRoot.id, appRoot.id, 'application:a'])
  assert.equal(treeExpandAction, 'click')
  assert.equal(http.calls.filter(call => call.url === '/role/_query/no-paging').length, 1)
})

test('application roles can be selected and removed; unseen bindings stay protected', async t => {
  fixture()
  const { state } = hook(t)
  await state.load()
  const selected = ref(['a-role', 'hidden'])
  const ui = mount(t, defineComponent({ setup: () => () => h(Selector, {
    value: selected.value, roles: state.roles.value, roleGroups: state.roleGroups.value,
    applications: state.applications.value,
    extraData: [{ id: 'hidden', name: '保留角色' }], 'onUpdate:value': value => { selected.value = value },
  }) }))
  const nodes = flatten(ui.find('role-select').props.treeData)
  assert.ok(!nodes.find(node => node.id === 'a-role').disabled)
  assert.ok(!nodes.find(node => node.id === 'b-role').disabled)
  assert.equal(nodes.find(node => node.id === 'hidden').disabled, true)
  assert.equal(content(ui.find('role-tag', node => node.props.id === 'a-role')), '应用A-管理员')
  assert.equal(descendants(ui.find('role-tag', node => node.props.id === 'hidden')).some(node => node.props?.onClick), false)
  ui.find('role-select').props.change(['a-role', 'hidden', 'b-role'])
  await nextTick()
  const remove = descendants(ui.find('role-tag', node => node.props.id === 'a-role')).find(node => node.props?.onClick)
  remove.props.onClick({ stopPropagation() {} })
  await nextTick()
  assert.deepEqual(selected.value, ['hidden', 'b-role'])
  assert.equal(content(ui.find('role-tag', node => node.props.id === 'b-role')), '应用B-管理员')
  assert.equal(descendants(ui.rootNode).some(node => String(node.props?.class).includes('tag-blue')), false)
})

function mountUsernameDialog(t, type) {
  const closed = []
  const ui = mount(t, EditDialog, {
    type, data: { id: user.id }, visible: true, 'onUpdate:visible': value => closed.push(value),
  }, () => validate())
  const field = () => ui.find('a-form-item', node => node.props.name === 'username')
  const input = () => descendants(field()).find(node => node.tag === 'a-input').props
  // Run the mounted field's rules in Ant's validator, including validateFirst on submit.
  const validate = trigger => {
    const { rules, validateFirst } = field().props
    const active = trigger ? rules.filter(rule => !rule.trigger || [rule.trigger].flat().includes(trigger)) : rules
    return validateRules(['username'], input().value, active, {}, validateFirst)
  }
  return { input, validate, submit: () => ui.find('a-modal').props.onOk(), closed }
}

test('adding a username keeps typed or pasted @ visible and blocks remote validation and save until corrected', async t => {
  fixture()
  const handler = http.handler
  http.handler = async (method, url) => url === '/user/username/_validate' ? success({ passed: true }) : handler(method, url)
  const { input, validate, submit, closed } = mountUsernameDialog(t, 'add')
  await flush()
  for (const value of ['a@', 'pasted@example.org']) {
    input()['onUpdate:value'](value)
    await nextTick()
    assert.equal(input().value, value)
    await submit() // No blur before save.
    for (const trigger of ['change', 'blur']) {
      await assert.rejects(validate(trigger), errors => errors[0].errors[0] === 'components.EditUserDialog.usernameNoAtSign')
    }
    assert.deepEqual(closed, [])
    assert.ok(!http.calls.some(call => ['/user/username/_validate', '/user/detail/_create'].includes(call.url)))
  }
  input()['onUpdate:value']('fullwidth＠name')
  await nextTick()
  await validate('change') // The new local rule only reserves the ASCII character.
  input()['onUpdate:value']('corrected')
  await nextTick()
  await validate('change')
  await submit()
  assert.equal(http.calls.find(call => call.url === '/user/username/_validate').data, 'corrected')
  assert.equal(http.calls.find(call => call.url === '/user/detail/_create').data.user.username, 'corrected')
  assert.deepEqual(closed, [false])
})

test('editing a legacy username containing @ still saves the unchanged username', async t => {
  fixture()
  const handler = http.handler
  http.handler = async (method, url) => url === '/user/detail/user-1' ? success({ ...user, username: 'old@example.org' }) : handler(method, url)
  const { input, submit } = mountUsernameDialog(t, 'edit')
  await flush()
  assert.equal(input().disabled, true)
  await submit()
  assert.equal(http.calls.find(call => call.method === 'put').data.user.username, 'old@example.org')
  assert.ok(!http.calls.some(call => call.url === '/user/username/_validate'))
})

test('editing sends changed role IDs while preserving hidden roles, organization and position bindings', async t => {
  fixture()
  const ui = mount(t, EditDialog, { type: 'edit', data: { id: 'user-1' }, visible: true })
  await flush()
  ui.find('role-select').props.change(['hidden', 'b-role'])
  await nextTick()
  ui.find('a-modal').props.onOk()
  await flush()
  const saved = http.calls.find(call => call.method === 'put')
  assert.equal(saved.url, '/user/detail/user-1/_update')
  assert.deepEqual(saved.data.roleIdList, ['hidden', 'b-role'])
  assert.deepEqual(saved.data.orgIdList, ['org'])
  assert.deepEqual(saved.data.positions, ['position'])
  assert.equal('businessApplicationIdList' in saved.data, false)
  assert.equal(JSON.stringify(saved.data).includes('应用B-管理员'), false)
})

test('new users can receive roles from multiple applications through the existing create request', async t => {
  fixture()
  const ui = mount(t, EditDialog, { type: 'add', data: {}, visible: true })
  await flush()
  ui.find('role-select').props.change(['a-role', 'b-role'])
  await nextTick()
  ui.find('a-modal').props.onOk()
  await flush()
  const saved = http.calls.find(call => call.url === '/user/detail/_create').data
  assert.deepEqual(saved.roleIdList, ['a-role', 'b-role'])
  assert.equal('businessApplicationIdList' in saved, false)
})

test('admin and project owners remain read-only including the custom selected-tag close button', async t => {
  for (const identity of [{ username: 'admin' }, { typeId: 'projectOwner' }, { type: { value: 'projectOwner' } }]) {
    fixture()
    const handler = http.handler
    http.handler = (method, url) => url === '/user/detail/user-1' ? Promise.resolve(success({ ...user, ...identity })) : handler(method, url)
    const ui = mount(t, EditDialog, { type: 'edit', data: { id: 'user-1' }, visible: true })
    await flush()
    assert.equal(ui.find('role-select').props.disabled, true)
    assert.equal(descendants(ui.find('role-tag', node => node.props.id === 'a-role')).some(node => node.props?.onClick), false)
  }
})

test('user table role cells and filter options show the same names and filtering still submits role IDs', async t => {
  fixture()
  const ui = mount(t, UserPage)
  await flush()
  assert.equal(content(ui.find('role-cell')), '应用A-管理员,保留角色')
  const column = ui.find('ConditionFilter').props.columns.find(column => column.dataIndex === 'roleList')
  assert.deepEqual((await column.search.options()).find(option => option.value === 'b-role'), { label: '应用B-管理员', value: 'b-role' })
  ui.find('ConditionFilter').props.onChange({ filter: { terms: [{ column: 'roleList', termType: 'eq', value: 'b-role' }] } })
  await nextTick()
  assert.deepEqual(ui.find('table').props.params.terms, [{ column: 'id$in-dimension$role', value: 'b-role' }])
})

test('saving from the user page refreshes the role directory for roles created while editing', async t => {
  fixture()
  const ui = mount(t, UserPage)
  await flush()
  const handler = http.handler
  http.handler = (method, url) => url === '/role/_query/no-paging'
    ? Promise.resolve(success([...roles, role('new-app-role', 'a')])) : handler(method, url)
  ui.find('j-permission-button', node => node.props.hasPermission === 'system/User:add').props.onClick()
  await flush()
  ui.find('role-select').props.change(['new-app-role'])
  await nextTick()
  const beforeSave = http.calls.filter(call => call.url === '/role/_query/no-paging').length
  ui.find('a-modal').props.onOk()
  await flush()
  assert.equal(http.calls.filter(call => call.url === '/role/_query/no-paging').length, beforeSave + 1)
  assert.deepEqual(http.calls.find(call => call.url === '/user/detail/_create').data.roleIdList, ['new-app-role'])
})

function mountResetDialog(t, targetId = user.id, validate) {
  fixture()
  sessionFixture.userInfo.id = user.id
  const events = []
  const ui = mount(t, EditDialog, {
    type: 'reset', visible: true, data: { id: targetId },
    onConfirm: () => events.push('confirm'),
    'onUpdate:visible': value => events.push(['visible', value]),
  }, validate)
  return { events, modal: () => ui.find('a-modal').props }
}

test('resetting the current user coordinates before the request, ignores duplicate submit and skips refresh', async t => {
  const { events, modal } = mountResetDialog(t)
  const handler = http.handler
  let finish
  const resetResponse = new Promise(resolve => { finish = resolve })
  http.handler = async (method, url) => {
    if (!url.endsWith('/password/_reset')) return handler(method, url)
    sessionFixture.steps.push('request')
    return resetResponse
  }
  const submit = modal().onOk()
  await flush()
  await modal().onOk()
  assert.deepEqual(sessionFixture.steps, ['begin', 'request'])
  assert.equal(http.calls.filter(call => call.url.endsWith('/password/_reset')).length, 1)
  finish(success(null))
  await submit
  assert.deepEqual(events, [['visible', false]])
  assert.deepEqual(sessionFixture.steps, [
    'begin', 'request', 'clear-verify',
    ['navigate', { reason: 'logout', destination: 'source-page' }],
    ['complete', true],
  ])
})

test('resetting another user keeps the current session and emits confirm to refresh', async t => {
  const { events, modal } = mountResetDialog(t, 'other-user')
  const handler = http.handler
  http.handler = (method, url) => url === '/user/other-user/password/_reset' ? success(null) : handler(method, url)
  await modal().onOk()
  assert.deepEqual(events, ['confirm', ['visible', false]])
  assert.deepEqual(sessionFixture.steps, [])
})

test('empty user IDs do not count as a self reset', async t => {
  const { events, modal } = mountResetDialog(t, '')
  sessionFixture.userInfo.id = ''
  await modal().onOk()
  assert.deepEqual(events, [])
  assert.deepEqual(sessionFixture.steps, [])
  assert.equal(http.calls.some(call => call.url.endsWith('/password/_reset')), false)
})

for (const [name, response] of [
  ['unsuccessful response', () => ({ status: 200, success: false })],
  ['verification cancelled', () => Promise.reject(new Error('verify_canceled'))],
]) {
  test(`self reset with ${name} releases the coordinator without closing or navigating`, async t => {
    const { events, modal } = mountResetDialog(t)
    const handler = http.handler
    http.handler = (method, url) => url.endsWith('/password/_reset') ? response() : handler(method, url)
    await modal().onOk()
    await nextTick()
    assert.equal(modal().confirmLoading, false)
    assert.deepEqual(events, [])
    assert.deepEqual(sessionFixture.steps, ['begin', ['complete', false]])
  })
}

test('form validation failure does not register navigation or submit a reset', async t => {
  const { events, modal } = mountResetDialog(t, user.id, async () => { throw new Error('invalid') })
  await modal().onOk()
  assert.deepEqual(events, [])
  assert.deepEqual(sessionFixture.steps, [])
  assert.equal(http.calls.some(call => call.url.endsWith('/password/_reset')), false)
})
