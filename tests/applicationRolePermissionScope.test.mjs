import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

// Keep the role hook, API wrappers and shared editor real; replace only HTTP, notifications and app context.
const { outputFiles } = await build({
  stdin: {
    contents: `
      export * from './views/application-center/ProjectApplication/applicationRolePermissionScope';
      export { useApplicationRoleManagement } from './views/application-center/ProjectApplication/Detail/components/useApplicationRoleManagement';
      export { useMenuAssetPermissionEditor } from '@jetlinks-web-core/hooks';
      export { reactive, effectScope, nextTick } from 'vue';
      export { http } from '@jetlinks-web/core';
      export { notifications } from '@jetlinks-web/utils';
    `,
    resolveDir: fileURLToPath(new URL('..', import.meta.url)),
  },
  bundle: true,
  write: false,
  format: 'esm',
  plugins: [{
    name: 'application-role-boundaries',
    setup(plugin) {
      plugin.onResolve({ filter: /^vue$/ }, () => ({ path: import.meta.resolve('vue'), external: true }))
      plugin.onResolve({ filter: /^@jetlinks-web-core\/hooks$/ }, () => ({
        path: fileURLToPath(new URL('../../../jetlinks-web-core/src/hooks/useMenuAssetPermissionEditor.ts', import.meta.url)),
      }))
      plugin.onResolve({ filter: /^(@jetlinks-web\/core|@jetlinks-web\/utils|vue-i18n|@jetlinks-web-core\/utils\/utils|@authentication-manager-ui\/api\/system\/menu)$/ }, args => ({
        path: args.path, namespace: 'fixture',
      }))
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: {
        '@jetlinks-web/core': `
          export const http = { calls: [], handler: null };
          const call = (method, url, data, config) => {
            http.calls.push({ method, url, data: structuredClone(data), config });
            return http.handler(method, url, data, config);
          };
          export const request = Object.fromEntries(['get', 'post', 'put', 'patch', 'remove'].map(method =>
            [method, (...args) => call(method, ...args)]));
        `,
        '@jetlinks-web/utils': `export const notifications = []; export const onlyMessage = (...args) => notifications.push(args);`,
        'vue-i18n': `export const useI18n = () => ({ t: (key, params) => key + (params?.name || '') });`,
        '@jetlinks-web-core/utils/utils': `export const isNoCommunity = true;`,
        '@authentication-manager-ui/api/system/menu': `export const getAssetsType = async () => ({ result: [{ id: 'device', name: '设备' }] });`,
      }[args.path] }))
    },
  }],
})
const { resolveApplicationRolePermissionScope, buildApplicationRolePermissionGrant, useMenuAssetPermissionEditor,
  useApplicationRoleManagement, reactive, effectScope, nextTick, http, notifications } = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`,
)

const copy = value => structuredClone(value)
const menu = (id, extra = {}) => ({ id, name: id, owner: 'app', granted: true, buttons: [], ...extra })
const button = (id, granted = true) => ({ id, name: id, granted })
const policy = (supportId, extra = {}) => ({ assetType: 'device', accesses: [{ supportId }], ...extra })
const grantable = (assetType = 'device', supportIds = ['all', 'tenant', 'creator']) => ({
  assetType, accesses: supportIds.map(supportId => ({ supportId })),
})
const deviceMenu = (extra = {}) => menu('device', {
  assetTypes: ['device'], buttons: [button('view'), button('save')],
  assetAccesses: [{ assetType: 'device', supportId: 'all', granted: true }], ...extra,
})
const flush = async () => { await new Promise(resolve => setImmediate(resolve)); await nextTick() }
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const flatten = menus => menus.flatMap(item => [item, ...flatten(item.children || [])])

function resolve(input = {}) {
  return resolveApplicationRolePermissionScope({
    isExternal: false, currentUserMenus: [deviceMenu()], templateMenus: [deviceMenu()],
    roleMenus: [deviceMenu()], templateAssetAccesses: [policy('tenant')], grantableAssets: [grantable()], ...input,
  })
}
function editorFor(scope) {
  const editor = useMenuAssetPermissionEditor({ defaultSupportIds: ['creator'] })
  editor.reset(scope)
  return editor
}

function fixture(t, { external = false, configure = () => {} } = {}) {
  http.calls = []
  notifications.length = 0
  const api = {
    template: { menus: [deviceMenu()], assetAccesses: [policy('all')] },
    userMenus: [deviceMenu()],
    roles: { a: { menus: [deviceMenu({ buttons: [button('view')] })], assetAccesses: [policy('all')] },
      b: { menus: [deviceMenu({ buttons: [button('save')] })], assetAccesses: [policy('all')] } },
    writes: [], beforeTemplate: null, templateFailure: null, beforeSave: null, saveFailure: null,
    grantableAssets: [grantable()], beforeGrantable: null, grantableFailure: null,
  }
  configure(api)
  http.handler = async (method, url, data) => {
    if (method === 'get' && url === '/business-application-template/template/menus') {
      if (api.beforeTemplate) await api.beforeTemplate()
      if (api.templateFailure === 'throw') throw new Error('offline')
      if (api.templateFailure) return { success: false, message: api.templateFailure }
      return { success: true, result: copy(api.template) }
    }
    if (method === 'post' && url === '/menu/user-own/tree') return { success: true, result: copy(api.userMenus) }
    if (method === 'post' && url === '/menu/asset-accesses/grantable') {
      if (api.beforeGrantable) await api.beforeGrantable()
      if (api.grantableFailure === 'throw') throw new Error('offline')
      if (api.grantableFailure) return { success: false, message: api.grantableFailure }
      return { success: true, result: copy(api.grantableAssets) }
    }
    const role = url.match(/^\/business-application\/app\/roles\/(a|b)\/menus\/_grant(\/detail)?$/)
    if (method === 'get' && role?.[2]) return { success: true, result: copy(api.roles[role[1]]) }
    if (method === 'put' && role && !role[2]) {
      api.writes.push({ roleId: role[1], data: copy(data) })
      if (api.beforeSave) await api.beforeSave()
      if (api.saveFailure === 'throw') throw new Error('save offline')
      if (api.saveFailure) return { success: false, message: api.saveFailure }
      // Match MenuGrantService's replacement boundary: owners come from every submitted node,
      // while only granted nodes become bindings. Empty menus alone do not delete an owner's bindings.
      const owners = new Set(data.menus.map(menu => menu.owner).filter(Boolean))
      api.roles[role[1]] = { menus: copy([
        ...api.roles[role[1]].menus.filter(menu => menu.owner && !owners.has(menu.owner)),
        ...data.menus.filter(menu => menu.granted),
      ]), assetAccesses: copy(data.assetAccesses) }
      return { success: true }
    }
    throw new Error(`Unexpected HTTP ${method} ${url}`)
  }
  const scope = effectScope()
  t.after(() => scope.stop())
  const props = reactive({ roles: [{ id: 'a', name: '角色A' }, { id: 'b', name: '角色B' }], users: [],
    scope: { applicationId: 'app', templateId: 'template', isExternal: external } })
  const state = scope.run(() => useApplicationRoleManagement(props, () => {}))
  return { api, props, state, stop: () => scope.stop() }
}

function assertPolicy(payload, supportId) {
  assert.deepEqual(payload.assetAccesses.map(item => item.accesses.map(access => access.supportId)), [[supportId]])
  assert.deepEqual(payload.menus.find(item => item.id === 'device').assetAccesses,
    [{ assetType: 'device', supportId, granted: true }])
}

test('intersects menu IDs and buttons while retaining template metadata and mixed tree hierarchy', () => {
  const input = {
    templateMenus: [menu('root', { granted: false, buttons: [button('admin')] }),
      deviceMenu({ parentId: 'root', name: '模板设备', buttons: [button('view'), button('save'), button('delete', false)] }),
      menu('template-only'), menu('empty-ancestor', { granted: false })],
    currentUserMenus: [menu('root', { granted: false, children: [deviceMenu({ name: '用户设备', buttons: [button('view'), button('delete')] })] }),
      menu('published-only'), menu('empty-ancestor', { granted: false })],
    roleMenus: [deviceMenu(), menu('published-only')],
  }
  const before = copy(input)
  const result = resolve(input)
  assert.deepEqual(flatten(result.menus).map(item => item.id), ['root', 'device'])
  assert.equal(result.menus[0].buttons.length, 0)
  assert.equal(result.menus[0].children[0].name, '模板设备')
  assert.deepEqual(result.menus[0].children[0].buttons.map(item => item.id), ['view'])
  assert.deepEqual(input, before)
})

test('template policies retain extension configuration but exclude assets unrelated to selected menus', () => {
  const templatePolicies = [policy('tenant', { options: { scopeStrategy: 'SELECT' },
    accesses: [{ supportId: 'tenant', configuration: { id: 'project' } }] }),
    { assetType: 'space', accesses: [{ supportId: 'tenant', configuration: { id: 'project' } }] }]
  const result = resolve({
    currentUserMenus: [deviceMenu({ assetAccesses: [{ assetType: 'device', supportId: 'creator' }] })],
    templateAssetAccesses: templatePolicies,
  })
  const editor = editorFor(result)
  assert.equal(editor.visibleAssets.value[0].selectedSupportId, 'tenant')
  const payload = buildApplicationRolePermissionGrant(editor.getSnapshot(), result)
  assert.deepEqual(payload.assetAccesses, [templatePolicies[0]])
  assert.deepEqual(payload.menus[0].assetAccesses,
    [{ assetType: 'device', supportId: 'tenant', configuration: { id: 'project' }, granted: true }])
  payload.assetAccesses[0].accesses[0].supportId = 'all'
  payload.assetAccesses[0].accesses[0].configuration.id = 'changed'
  assert.equal(templatePolicies[0].accesses[0].supportId, 'tenant')
  assert.equal(templatePolicies[0].accesses[0].configuration.id, 'project')
})

test('empty template policies clear both independent and menu policies instead of reviving role all or defaults', () => {
  const result = resolve({ templateAssetAccesses: [], grantableAssets: [] })
  const payload = buildApplicationRolePermissionGrant(editorFor(result).getSnapshot(), result)
  assert.deepEqual(payload.assetAccesses, [])
  assert.deepEqual(payload.menus[0].assetAccesses, [])
  assert.equal(payload.menus[0].granted, true)
  assert.deepEqual(result.excludedMenus, [])
})

test('authoritative grantable supports override full menu candidates and allow a broader user to grant tenant', () => {
  const input = {
    currentUserMenus: [deviceMenu({ assetAccesses: [
      { assetType: 'device', supportId: 'ignore', granted: true },
      { assetType: 'device', supportId: 'tenant', granted: false },
      { assetType: 'device', supportId: 'creator', granted: false },
    ] })],
    templateAssetAccesses: [policy('ignore', { accesses: [
      { supportId: 'ignore' }, { supportId: 'tenant' }, { supportId: 'creator' },
    ], options: { scopeStrategy: 'SELECT' } })],
    grantableAssets: [{ assetType: 'device', accesses: [
      { supportId: 'tenant' }, { supportId: 'creator', disabled: true },
    ] }],
  }
  const before = copy(input)
  const scope = resolve(input)
  const payload = buildApplicationRolePermissionGrant(editorFor(scope).getSnapshot(), scope)
  assertPolicy(payload, 'tenant')
  assert.deepEqual(payload.assetAccesses[0].options, { scopeStrategy: 'SELECT' })
  assert.deepEqual(input, before)
})

test('any missing required asset excludes a multi-asset menu while its permitted child keeps its hierarchy', () => {
  const menus = [menu('root', { assetTypes: ['space'] }),
    deviceMenu({ parentId: 'root' }), menu('mixed', { assetTypes: ['device', 'space'] }), menu('help')]
  const scope = resolve({ templateMenus: menus, currentUserMenus: menus, roleMenus: menus,
    templateAssetAccesses: [policy('tenant'), { assetType: 'space', accesses: [{ supportId: 'tenant' }] }],
    grantableAssets: [grantable('device', ['tenant'])],
  })
  assert.deepEqual(scope.excludedMenus.map(menu => menu.id), ['root', 'mixed'])
  assert.equal(scope.menus[0].children[0].id, 'device')
  const payload = buildApplicationRolePermissionGrant(editorFor(scope).getSnapshot(), scope, menus)
  assert.deepEqual(payload.menus.filter(menu => menu.granted).map(menu => menu.id), ['device', 'help'])
  assert.deepEqual(payload.assetAccesses, [policy('tenant')])
  for (const id of ['root', 'mixed']) {
    const revoked = payload.menus.find(menu => menu.id === id)
    assert.equal(revoked.granted, false)
    assert.deepEqual(revoked.buttons, [])
    assert.deepEqual(revoked.assetAccesses, [])
  }
})

test('legacy menu asset definitions survive compatibility-field rebuilding and explicit empty policies', () => {
  const legacy = deviceMenu({ assetTypes: undefined })
  const scope = resolve({ templateMenus: [legacy], templateAssetAccesses: [policy('tenant')] })
  assertPolicy(buildApplicationRolePermissionGrant(editorFor(scope).getSnapshot(), scope), 'tenant')
  const empty = resolve({ templateMenus: [legacy], templateAssetAccesses: [
    { assetType: 'device', accesses: [], options: { scopeStrategy: 'SELECT' } },
  ], grantableAssets: [] })
  const payload = buildApplicationRolePermissionGrant(editorFor(empty).getSnapshot(), empty)
  assert.deepEqual(payload.assetAccesses, [{ assetType: 'device', accesses: [], options: { scopeStrategy: 'SELECT' } }])
  assert.deepEqual(payload.menus[0].assetAccesses, [])
  assert.equal(payload.menus[0].granted, true)
})

test('internal roles exclude open-api and external candidates still respect the intersection', () => {
  const apiMenu = menu('api', { owner: 'iot', showPage: ['open-api'], buttons: [button('invoke')] })
  const input = { currentUserMenus: [deviceMenu(), apiMenu], templateMenus: [deviceMenu(), apiMenu, menu('template-only')] }
  assert.deepEqual(resolve(input).menus.map(item => item.id), ['device'])
  assert.deepEqual(resolve({ ...input, isExternal: true }).menus.map(item => item.id), ['device', 'api'])
})

test('role A is saved with tenant after the template changes from all while the page stays open', async t => {
  const { api, state } = fixture(t)
  await flush()
  assert.equal(state.initialized.value, true)
  assert.equal(state.editor.visibleAssets.value[0].selectedSupportId, 'all')
  state.editor.toggleButton(state.editor.menuTree.value[0], state.editor.menuTree.value[0].buttons[1], true)
  api.template.assetAccesses = [policy('tenant', { options: { scopeStrategy: 'SELECT' } })]
  await state.savePermissions()
  assert.equal(api.writes.length, 1)
  assertPolicy(api.writes[0].data, 'tenant')
  assert.deepEqual(api.writes[0].data.assetAccesses, api.template.assetAccesses)
  assert.deepEqual(api.writes[0].data.menus[0].buttons.map(item => item.id), ['view', 'save'])
  assertPolicy(api.roles.a, 'tenant')
  assert.equal(state.editor.visibleAssets.value[0].selectedSupportId, 'tenant')
  assert.equal(notifications.length, 1)
  assert.equal(http.calls.filter(call => call.url.endsWith('/template/menus')).length, 3)
  assert.equal(http.calls.some(call => call.url === '/business-application/app/menus'), false)
  assert.deepEqual(http.calls.find(call => call.url === '/menu/user-own/tree').data,
    { paging: false, terms: [{ column: 'owner', value: 'app' }] })
  assert.deepEqual(http.calls.find(call => call.method === 'put').config, { applicationScope: false })
})

test('reopening an old role uses the latest template and saving a cleared template removes old policies', async t => {
  const { api, state } = fixture(t)
  api.template.assetAccesses = [policy('tenant')]
  await flush()
  await state.loadPermissions()
  assert.equal(state.editor.visibleAssets.value[0].selectedSupportId, 'tenant')
  assert.equal(api.roles.a.assetAccesses[0].accesses[0].supportId, 'all')
  api.template.assetAccesses = []
  await state.savePermissions()
  assert.deepEqual(api.roles.a.assetAccesses, [])
  assert.deepEqual(api.roles.a.menus[0].assetAccesses, [])
})

test('saving rechecks removed menus and buttons without selecting newly available menus', async t => {
  const { api, state } = fixture(t)
  api.template.menus.push(menu('removed'), menu('user-revoked'))
  api.userMenus.push(menu('removed'), menu('user-revoked'), menu('new'))
  await flush()
  await state.loadPermissions()
  state.editor.setMenusChecked(state.editor.menuTree.value, true)
  api.template.menus = [deviceMenu({ buttons: [button('view')] }), menu('new'), menu('user-revoked')]
  api.userMenus = [deviceMenu(), menu('new')]
  await state.savePermissions()
  assert.deepEqual(api.writes[0].data.menus.filter(item => item.granted).map(item => item.id), ['device'])
  assert.deepEqual(api.writes[0].data.menus[0].buttons.map(item => item.id), ['view'])
  assert.equal(state.editor.menuTree.value.find(item => item.id === 'new').granted, false)
})

test('failed refreshes never submit stale policies and preserve the draft for retry', async t => {
  const { api, state } = fixture(t)
  await flush()
  state.editor.setMenusChecked(state.editor.menuTree.value, true)
  const draft = state.editor.getSnapshot()
  for (const failure of ['throw', 'denied']) {
    api.templateFailure = failure
    await state.savePermissions()
    assert.equal(api.writes.length, 0)
    assert.deepEqual(state.editor.getSnapshot(), draft)
    assert.equal(state.savingPermissions.value, false)
    assert.equal(notifications.length, 0)
  }
  api.templateFailure = null
  api.template.assetAccesses = [policy('tenant')]
  await state.savePermissions()
  assertPolicy(api.roles.a, 'tenant')
})

test('save rejection reports no success and keeps legal menu edits for retry', async t => {
  const { api, state } = fixture(t)
  await flush()
  state.editor.setMenusChecked(state.editor.menuTree.value, true)
  api.template.assetAccesses = [policy('tenant')]
  for (const failure of ['throw', 'denied']) {
    api.saveFailure = failure
    await state.savePermissions()
    assert.equal(notifications.length, 0)
    assert.deepEqual(state.editor.getSnapshot().menus[0].buttons.map(item => item.id), ['view', 'save'])
  }
  api.saveFailure = null
  await state.savePermissions()
  assertPolicy(api.roles.a, 'tenant')
})

test('switching role during the template refresh cancels the stale save', async t => {
  const { api, state } = fixture(t)
  await flush()
  const gate = deferred()
  api.beforeTemplate = () => gate.promise
  const saving = state.savePermissions()
  state.activeRoleId.value = 'b'
  await nextTick()
  gate.resolve()
  await saving
  await flush()
  assert.equal(api.writes.length, 0)
  assert.deepEqual(state.editor.getSnapshot().menus[0].buttons.map(item => item.id), ['save'])
})

test('a pending write stays on its captured role and cannot overwrite the next role view', async t => {
  const { api, state } = fixture(t)
  await flush()
  const gate = deferred()
  api.beforeSave = () => gate.promise
  const saving = state.savePermissions()
  await flush()
  assert.equal(api.writes[0].roleId, 'a')
  state.activeRoleId.value = 'b'
  await flush()
  gate.resolve()
  await saving
  assert.deepEqual(state.editor.getSnapshot().menus[0].buttons.map(item => item.id), ['save'])
  assert.equal(notifications.length, 0)
})

test('duplicate clicks are ignored and disposing during refresh prevents a write', async t => {
  const { api, state, stop } = fixture(t)
  await flush()
  const gate = deferred()
  api.beforeTemplate = () => gate.promise
  const saving = state.savePermissions()
  await state.savePermissions()
  assert.equal(http.calls.filter(call => call.url.endsWith('/template/menus')).length, 2)
  stop()
  gate.resolve()
  await saving
  assert.equal(api.writes.length, 0)
})

test('external application role display continues to skip menu permission reads and writes', async t => {
  const { state } = fixture(t, { external: true })
  await flush()
  await state.savePermissions()
  assert.deepEqual(http.calls, [])
  assert.equal(state.initialized.value, false)
})


test('navigation ancestors stay ungranted in the payload even when the editor selects a child', () => {
  const result = resolve({
    templateMenus: [menu('root', { granted: false }), deviceMenu({ parentId: 'root' })],
    currentUserMenus: [menu('root', { granted: false, children: [deviceMenu()] })],
  })
  const editor = editorFor(result)
  assert.equal(editor.menuTree.value[0].granted, true)
  const payload = buildApplicationRolePermissionGrant(editor.getSnapshot(), result)
  assert.equal(payload.menus.find(menu => menu.id === 'root').granted, false)
  assert.equal(payload.menus.find(menu => menu.id === 'device').granted, true)
})

test('revoking every menu or losing the entire intersection still removes prior owner bindings', async t => {
  const { api, state } = fixture(t)
  await flush()
  state.editor.setMenusChecked(state.editor.menuTree.value, false)
  await state.savePermissions()
  assert.deepEqual(api.roles.a.menus, [])
  assert.equal(api.writes[0].data.menus[0].owner, 'app')
  assert.equal(api.writes[0].data.menus[0].granted, false)
  state.editor.setMenusChecked(state.editor.menuTree.value, true)
  await state.savePermissions()
  assert.equal(api.roles.a.menus.length, 1)
  api.userMenus = []
  await state.savePermissions()
  assert.deepEqual(api.roles.a.menus, [])
})

test('a/b/c menu intersection excludes d assets and retains shared policies until the last selected menu is cleared', async t => {
  const { api, state } = fixture(t, { configure(api) {
    const menus = ['a', 'b', 'c'].map(id => menu(id, { assetTypes: ['device'] }))
    const d = menu('d', { assetTypes: ['d-only'] })
    api.template = { menus: [...menus, d], assetAccesses: [policy('tenant'),
      { assetType: 'd-only', accesses: [{ supportId: 'all' }] }] }
    api.userMenus = menus
    api.roles.a = copy(api.template)
    api.grantableAssets = [grantable(), grantable('d-only')]
  } })
  await flush()
  assert.deepEqual(http.calls.find(call => call.url === '/menu/asset-accesses/grantable').data.map(menu => menu.id), ['a', 'b', 'c'])
  await state.savePermissions()
  assert.deepEqual(api.roles.a.menus.map(menu => menu.id), ['a', 'b', 'c'])
  assert.deepEqual(api.roles.a.assetAccesses, [policy('tenant')])
  assert.equal(api.writes[0].data.menus.find(menu => menu.id === 'd').granted, false)
  assert.deepEqual(api.writes[0].data.menus.find(menu => menu.id === 'd').assetAccesses, [])
  assert.equal(api.writes[0].data.menus.flatMap(menu => menu.assetAccesses).some(access => access.assetType === 'd-only'), false)
  state.editor.setMenusChecked(state.editor.menuTree.value.slice(0, 2), false)
  await state.savePermissions()
  assert.deepEqual(api.roles.a.menus.map(menu => menu.id), ['c'])
  assert.deepEqual(api.roles.a.assetAccesses, [policy('tenant')])
  state.editor.setMenusChecked(state.editor.menuTree.value, false)
  await state.savePermissions()
  assert.deepEqual(api.roles.a, { menus: [], assetAccesses: [] })
})

test('empty grantable response excludes selections, exposes their names and revokes bindings hidden at initial load', async t => {
  const { api, state } = fixture(t, { configure(api) {
    api.grantableAssets = []
    api.template.menus[0].name = '设备管理'
  } })
  await flush()
  assert.equal(state.initialized.value, true)
  assert.equal(state.permissionError.value, false)
  assert.equal(state.excludedMenuNames.value, '设备管理')
  assert.deepEqual(state.editor.getSnapshot(), { menus: [], assetAccesses: [] })
  await state.savePermissions()
  assert.equal(api.writes.length, 1)
  assert.deepEqual(api.writes[0].data, {
    menus: [{ id: 'device', owner: 'app', granted: false, buttons: [], assetAccesses: [] }], assetAccesses: [],
  })
  assert.deepEqual(api.roles.a, { menus: [], assetAccesses: [] })
  assert.equal(state.excludedMenuNames.value, '设备管理')
})

test('an empty menu intersection skips grantable requests and still clears original owner bindings', async t => {
  const { api, state } = fixture(t, { configure(api) { api.userMenus = [] } })
  await flush()
  assert.equal(state.initialized.value, true)
  await state.savePermissions()
  assert.equal(http.calls.some(call => call.url === '/menu/asset-accesses/grantable'), false)
  assert.deepEqual(api.roles.a, { menus: [], assetAccesses: [] })
  assert.equal(api.writes[0].data.menus[0].owner, 'app')
})

test('saving refreshes grantability, automatically excludes affected pages and keeps permitted pages selected', async t => {
  const { api, state } = fixture(t, { configure(api) {
    const help = menu('help')
    api.template.menus.push(help)
    api.userMenus.push(help)
    api.roles.a.menus.push(help)
  } })
  await flush()
  api.grantableAssets = []
  await state.savePermissions()
  assert.equal(api.writes.length, 1)
  assert.deepEqual(api.roles.a.menus.map(menu => menu.id), ['help'])
  assert.deepEqual(api.roles.a.assetAccesses, [])
  assert.equal(state.excludedMenuNames.value, 'device')
})

test('grantable query failures disable initial save and preserve an existing draft on refresh failure', async t => {
  const { api, state } = fixture(t, { configure(api) { api.grantableFailure = 'denied' } })
  await flush()
  assert.equal(state.initialized.value, false)
  assert.equal(state.permissionError.value, true)
  await state.savePermissions()
  assert.deepEqual(api.writes, [])
  api.grantableFailure = null
  await state.loadPermissions()
  state.editor.setMenusChecked(state.editor.menuTree.value, true)
  const draft = state.editor.getSnapshot()
  for (const failure of ['throw', 'denied']) {
    api.grantableFailure = failure
    await state.savePermissions()
    assert.deepEqual(api.writes, [])
    assert.deepEqual(state.editor.getSnapshot(), draft)
    assert.equal(state.savingPermissions.value, false)
    assert.deepEqual(notifications, [])
  }
  api.grantableFailure = null
  api.template.assetAccesses = [policy('tenant')]
  api.grantableAssets = [grantable('device', ['tenant'])]
  await state.savePermissions()
  assertPolicy(api.roles.a, 'tenant')
})

test('late grantable response for the previous role does not replace the current role view', async t => {
  const gate = deferred()
  let requests = 0
  const { state } = fixture(t, { configure(api) {
    api.beforeGrantable = () => requests++ === 0 ? gate.promise : Promise.resolve()
  } })
  await flush()
  state.activeRoleId.value = 'b'
  await flush()
  assert.equal(state.initialized.value, true)
  assert.deepEqual(state.editor.getSnapshot().menus[0].buttons.map(button => button.id), ['save'])
  gate.resolve()
  await flush()
  assert.deepEqual(state.editor.getSnapshot().menus[0].buttons.map(button => button.id), ['save'])
})

for (const change of ['role', 'application', 'dispose']) {
  test(`${change} change during grantable refresh prevents a stale write and duplicate submission`, async t => {
    const { api, props, state, stop } = fixture(t)
    await flush()
    const gate = deferred()
    let requests = 0
    api.beforeGrantable = () => requests++ === 0 ? gate.promise : Promise.resolve()
    const saving = state.savePermissions()
    await flush()
    await state.savePermissions()
    assert.equal(requests, 1)
    if (change === 'role') state.activeRoleId.value = 'b'
    if (change === 'application') props.scope.applicationId = ''
    if (change === 'dispose') stop()
    await flush()
    gate.resolve()
    await saving
    assert.deepEqual(api.writes, [])
    assert.deepEqual(notifications, [])
    if (change === 'role') assert.deepEqual(state.editor.getSnapshot().menus[0].buttons.map(button => button.id), ['save'])
  })
}
