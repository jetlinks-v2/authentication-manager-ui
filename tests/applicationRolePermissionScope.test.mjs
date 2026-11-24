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
      export { readRoleMenuBindings } from './views/application-center/ProjectApplication/menuOnlyRoleGrant';
      export { useRolePermission } from './views/system/Role/Detail/Permission/useRolePermission';
      export { useMenuAssetPermissionEditor } from '@jetlinks-web-core/hooks';
      export { reactive, ref, effectScope, nextTick } from 'vue';
      export { http } from '@jetlinks-web/core';
      export { notifications } from '@jetlinks-web/utils';
    `,
    resolveDir: fileURLToPath(new URL('..', import.meta.url)),
  },
  bundle: true,
  write: false,
  format: 'esm',
  define: { 'import.meta.env': JSON.stringify({ VITE_APP_ENVIRONMENT: 'saas' }) },
  plugins: [{
    name: 'application-role-boundaries',
    setup(plugin) {
      plugin.onResolve({ filter: /^vue$/ }, () => ({ path: import.meta.resolve('vue'), external: true }))
      plugin.onResolve({ filter: /^@jetlinks-web-core\/hooks$/ }, () => ({
        path: fileURLToPath(new URL('../../../jetlinks-web-core/src/hooks/useMenuAssetPermissionEditor.ts', import.meta.url)),
      }))
      plugin.onResolve({ filter: /^(@jetlinks-web\/core|@jetlinks-web\/utils|vue-i18n|vue-router|@jetlinks-web-core\/utils\/utils|@authentication-manager-ui\/api\/system\/menu)$/ }, args => ({
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
        'vue-router': `export const useRoute = () => ({ params: { id: 'a' } }); export const useRouter = () => ({});`,
        'vue-i18n': `export const useI18n = () => ({ t: (key, params) => key + (params?.name || '') });`,
        '@jetlinks-web-core/utils/utils': `export const isNoCommunity = true;`,
        '@authentication-manager-ui/api/system/menu': `export const getAssetsType = async () => ({ result: [{ id: 'device', name: '设备' }] });`,
      }[args.path] }))
    },
  }],
})
const { getApplicationRoleMenuCandidates, intersectRoleAssetPolicies, resolveApplicationRolePermissionScope, buildApplicationRolePermissionGrant, useMenuAssetPermissionEditor,
  useApplicationRoleManagement, useRolePermission, readRoleMenuBindings, reactive, ref, effectScope, nextTick, http, notifications } = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`,
)

const copy = value => structuredClone(value)
const menu = (id, extra = {}) => ({ id, name: id, owner: 'app', granted: true, buttons: [], ...extra })
const button = (id, granted = true) => ({ id, name: id, granted })
const policy = (supportId, extra = {}) => ({ assetType: 'device', accesses: [{ supportId }], ...extra })
const deviceMenu = (extra = {}) => menu('device', {
  assetTypes: ['device'], buttons: [button('view'), button('save')],
  assetAccesses: [{ assetType: 'device', supportId: 'ignore', granted: true }], ...extra,
})
const flush = async () => { await new Promise(resolve => setImmediate(resolve)); await nextTick() }
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const flatten = menus => menus.flatMap(item => [item, ...flatten(item.children || [])])

function resolve(input = {}) {
  const sources = {
    isExternal: false, currentUserMenus: [deviceMenu()], templateMenus: [deviceMenu()],
    applicationMenus: input.templateMenus || [deviceMenu()],
    roleMenus: [deviceMenu()], effectiveAssetAccesses: [policy('tenant')], ...input,
  }
  return resolveApplicationRolePermissionScope({ ...sources, candidates: getApplicationRoleMenuCandidates(sources) })
}
function editorFor(scope) {
  const editor = useMenuAssetPermissionEditor({ defaultSupportIds: ['creator'] })
  editor.reset(scope)
  return editor
}

function fixture(t, { external = false, entry = 'system' } = {}) {
  http.calls = []
  notifications.length = 0
  const api = {
    template: { menus: [deviceMenu()], assetAccesses: [policy('ignore')] },
    catalog: [{ assetType: 'device', accesses: [{ supportId: 'business_application' },
      { supportId: 'tenant', name: '当前租户' }, { supportId: 'ignore', name: '全部数据' }] }],
    applicationMenus: null, applicationFailure: false,
    userMenus: [deviceMenu()],
    roles: { a: { menus: [deviceMenu({ buttons: [button('view')] })], assetAccesses: [policy('ignore')] },
      b: { menus: [deviceMenu({ buttons: [button('save')] })], assetAccesses: [policy('ignore')] } },
    writes: [], beforeTemplate: null, templateFailure: null, beforeSave: null, saveFailure: null,
  }
  http.handler = async (method, url, data) => {
    if (method === 'get' && url === '/business-application-template/template/menus') {
      if (api.beforeTemplate) await api.beforeTemplate()
      if (api.templateFailure === 'throw') throw new Error('offline')
      if (api.templateFailure) return { success: false, message: api.templateFailure }
      return { success: true, result: copy(api.template) }
    }
    if (method === 'post' && url === '/menu/user-own/tree') return { success: true, result: copy(api.userMenus) }
    if (method === 'post' && url === '/menu/asset-accesses/grantable') return { success: true, result: copy(api.catalog) }
    if (method === 'get' && url === '/business-application/app/menus') return api.applicationFailure
      ? { success: false } : { success: true, result: { menus: copy(api.applicationMenus || api.template.menus),
        assetAccesses: copy(api.template.assetAccesses) } }
    const relation = url.match(/^\/business-application\/app\/roles\/(a|b)\/menus\/_query$/)
    if (method === 'post' && relation) {
      if (api.bindingPage) return api.bindingPage(data.pageIndex, relation[1])
      const dataRows = flatten(api.roles[relation[1]].menus).filter(m => m.granted === true)
        .map(m => ({ menuId: m.id, buttons: (m.buttons || []).map(b => ({ id: b.id, granted: b.granted === true })) }))
      return { success: true, result: { total: dataRows.length, data: dataRows } }
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
      ]), assetAccesses: copy(data.assetAccesses ?? api.roles[role[1]].assetAccesses) }
      return { success: true }
    }
    throw new Error(`Unexpected HTTP ${method} ${url}`)
  }
  const scope = effectScope()
  t.after(() => scope.stop())
  const props = reactive({ roles: [{ id: 'a', name: '角色A' }, { id: 'b', name: '角色B' }], users: [],
    scope: { applicationId: 'app', templateId: 'template', isExternal: external } })
  const state = scope.run(() => {
    if (entry === 'detail') return useApplicationRoleManagement(props, () => {})
    // Existing data-permission tests exercise the actual system role page entry and its default mode.
    const activeRoleId = ref('a')
    const system = useRolePermission({ get application() {
      return { scope: props.scope, role: props.roles.find(role => role.id === activeRoleId.value) }
    } })
    return { ...system.permissions, activeRoleId }
  })
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

test('current application menus exclude other candidates even when user and template both allow them', () => {
  const result = resolve({ templateMenus: [deviceMenu(), menu('other-app')],
    currentUserMenus: [deviceMenu(), menu('other-app')], applicationMenus: [deviceMenu()] })
  assert.deepEqual(flatten(result.menus).map(item => item.id), ['device'])
  assert.deepEqual(resolve({ applicationMenus: [] }).menus, [])
})

test('data display uses effective values and never editor defaults or unsaved role changes', async t => {
  const { api, state } = fixture(t); await flush()
  assert.equal(state.inheritedAssetOptions.value.device[0].value, 'ignore')
  assert.equal(state.inheritedAssetOptions.value.device[0].label, '全部数据')
  state.editor.setAssetAccess('device', 'creator')
  assert.equal(state.inheritedAssetOptions.value.device[0].value, 'ignore')
  api.template.assetAccesses = [policy('business_application')]
  await state.loadPermissions()
  assert.equal(state.inheritedAssetOptions.value.device[0].label, 'Role.application.applicationData')
  await state.savePermissions()
  assertPolicy(api.writes[0].data, 'business_application')
  api.template.assetAccesses = []
  await state.loadPermissions()
  assert.equal(state.inheritedAssetOptions.value.device, undefined)
})

test('application scope is refreshed before saving and application query failure blocks grants', async t => {
  const { api, state } = fixture(t); await flush()
  api.applicationFailure = true
  await state.savePermissions()
  assert.equal(api.writes.length, 0)
  await state.loadPermissions()
  assert.equal(state.initialized.value, false); assert.equal(state.permissionError.value, true)
  api.applicationFailure = false; api.applicationMenus = []
  await state.loadPermissions()
  assert.equal(state.initialized.value, true); assert.deepEqual(state.editor.flatMenus.value, [])
})

test('effective policies exclude unrelated asset types and preserve configuration for the selected type', () => {
  const templatePolicies = [policy('tenant', { options: { scopeStrategy: 'SELECT' } }),
    { assetType: 'space', accesses: [{ supportId: 'tenant', configuration: { id: 'project' } }] }]
  const result = resolve({
    currentUserMenus: [deviceMenu({ assetAccesses: [{ assetType: 'device', supportId: 'creator' }] })],
    effectiveAssetAccesses: templatePolicies,
  })
  const editor = editorFor(result)
  assert.equal(editor.visibleAssets.value[0].selectedSupportId, 'tenant')
  const payload = buildApplicationRolePermissionGrant(editor.getSnapshot(), result)
  assert.deepEqual(payload.assetAccesses, [templatePolicies[0]])
  assert.deepEqual(payload.menus[0].assetAccesses, [{ assetType: 'device', supportId: 'tenant', granted: true }])
  payload.assetAccesses[0].accesses[0].supportId = 'ignore'
  assert.equal(templatePolicies[0].accesses[0].supportId, 'tenant')
})

test('empty template policies clear both independent and menu policies instead of reviving role all or defaults', () => {
  const result = resolve({ effectiveAssetAccesses: [] })
  const payload = buildApplicationRolePermissionGrant(editorFor(result).getSnapshot(), result)
  assert.deepEqual(payload.assetAccesses, [])
  assert.ok(payload.menus.every(menu => !menu.granted && !menu.assetAccesses.length))
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
  assert.equal(state.editor.visibleAssets.value[0].selectedSupportId, 'ignore')
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
  assert.equal(http.calls.filter(call => call.url.endsWith('/asset-accesses/grantable')).length, 3)
  const applicationCalls = http.calls.filter(call => call.url === '/business-application/app/menus')
  assert.equal(applicationCalls.length, 3)
  assert.ok(applicationCalls.every(call => call.config.applicationScope === false))
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
  assert.equal(api.roles.a.assetAccesses[0].accesses[0].supportId, 'ignore')
  api.template.assetAccesses = []
  await state.savePermissions()
  assert.deepEqual(api.roles.a.assetAccesses, [])
  assert.deepEqual(api.roles.a.menus, [])
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
  const { state } = fixture(t, { external: true, entry: 'detail' })
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


test('notification application role never replays the rest of a legacy template policy', async t => {
  const { api, state } = fixture(t)
  const assetType = 'notifyTemplate'
  const channel = menu('notify', { assetTypes: [assetType], buttons: [button('view')] })
  const tenant = { supportId: 'tenant' }
  const all = { supportId: 'all' }
  api.template = { menus: [channel], assetAccesses: [{ assetType, accesses: [all, tenant] }] }
  api.userMenus = [channel]
  api.roles.a = { menus: [channel], assetAccesses: [{ assetType, accesses: [all] }] }
  api.catalog = [{ assetType, accesses: [all, tenant] }]
  await state.loadPermissions()
  assert.equal(state.editor.visibleAssets.value[0].selectedSupportId, 'tenant')
  assert.deepEqual(state.editor.visibleAssets.value[0].previousScopeLabels, ['all'])
  await state.savePermissions()
  assert.deepEqual(api.writes[0].data.assetAccesses, [{ assetType, accesses: [tenant] }])
  assert.deepEqual(api.writes[0].data.menus[0].assetAccesses, [{ assetType, supportId: 'tenant', granted: true }])
  api.template.assetAccesses[0].accesses = [all]
  await state.savePermissions()
  assert.equal(api.writes.length, 1)
  assert.deepEqual(notifications.at(-1), ['components.MenuAssetPermissionEditor.fixedScopeSaveBlocked', 'warning'])
})

// The real grantable catalog includes narrower choices; do not grant every returned option.
test('role display and both policy fields use the organization cap and refresh it before save', async t => {
  const { api, state } = fixture(t)
  api.template.assetAccesses = [policy('ignore')]
  api.catalog = [{ assetType: 'device', accesses: [{ supportId: 'creator' }, { supportId: 'org' }] }]
  await state.loadPermissions()
  assert.equal(state.inheritedAssetOptions.value.device[0].value, 'org')
  await state.savePermissions()
  assertPolicy(api.roles.a, 'org')
  api.catalog = [policy('creator')]
  await state.savePermissions()
  assertPolicy(api.roles.a, 'creator')
})

test('no common scope for one required type excludes that menu, not unrelated menus; old owner is revoked', async t => {
  const { api, state } = fixture(t)
  api.template.menus = [deviceMenu({ assetTypes: ['device', 'space'] }), menu('help', { owner: 'docs' })]
  api.userMenus = copy(api.template.menus)
  api.template.assetAccesses.push({ assetType: 'space', accesses: [{ supportId: 'ignore' }] })
  api.catalog = [policy('org')]
  await state.loadPermissions()
  assert.deepEqual(state.editor.flatMenus.value.map(item => item.id), ['help'])
  assert.deepEqual(state.blockedMenuNames.value, ['device'])
  state.editor.setMenusChecked(state.editor.menuTree.value, true)
  await state.savePermissions()
  assert.deepEqual(api.roles.a.menus.map(item => item.id), ['help'])
  assert.deepEqual(api.roles.a.assetAccesses, [])
})

test('malformed effective scope blocks the write and keeps the draft for retry', async t => {
  const { api, state } = fixture(t); await flush()
  const draft = state.editor.getSnapshot()
  api.catalog = null
  await state.savePermissions()
  assert.equal(api.writes.length, 0)
  assert.equal(state.refreshError.value, true)
  assert.deepEqual(state.editor.getSnapshot(), draft)
  api.catalog = [policy('org')]
  await state.savePermissions()
  assertPolicy(api.roles.a, 'org')
  assert.equal(state.refreshError.value, false)
})

// Template bounds are not inferred from the grantable list or from translated option labels.
test('narrow template with unrestricted operator retains only org; incomparable or configured supports cannot widen', () => {
  const menu = deviceMenu({ assetAccesses: [
    { assetType: 'device', supportId: 'org', priority: 100 },
    { assetType: 'device', supportId: 'peer', priority: 100 },
    { assetType: 'device', supportId: 'wider', priority: 200 },
  ] })
  const catalog = ids => [{ assetType: 'device', accesses: ids.map(supportId => ({ supportId })) }]
  const intersect = (template, ids) => intersectRoleAssetPolicies([menu], [template], catalog(ids))
  assert.deepEqual(intersect(policy('org'), ['creator', 'org', 'ignore']), [policy('org')])
  assert.deepEqual(intersect(policy('wider'), ['creator', 'org']), [policy('org')])
  assert.deepEqual(intersect(policy('peer'), ['creator', 'org']), [])
  assert.deepEqual(intersect(policy('ignore', { options: { custom: 'opaque' } }), ['org']), [])
})

const grantableCalls = () => http.calls.filter(call => call.url === '/menu/asset-accesses/grantable')

test('application detail uses only the menu/button intersection on load, switch, save and reload', async t => {
  const { api, state } = fixture(t, { entry: 'detail' }); await flush()
  const wall = menu('wall', { name: '监控墙', assetTypes: ['device', 'space'],
    buttons: [button('view'), button('save'), button('delete', false)] })
  api.catalog = []
  api.template = { menus: [wall, menu('template-only'), menu('outside-app')], assetAccesses: [] }
  api.userMenus = [{ ...wall, buttons: [button('view'), button('delete')] }, menu('outside-app'), menu('user-only')]
  api.applicationMenus = [wall, menu('template-only'), menu('user-only')]
  api.roles.b = { menus: [], assetAccesses: [] }
  state.activeRoleId.value = 'b'; await flush()
  const [row] = state.editor.flatMenus.value
  assert.deepEqual(state.editor.flatMenus.value.map(m => m.id), ['wall'])
  assert.deepEqual(state.blockedMenuNames.value, [])
  assert.equal(row.granted, false)
  assert.deepEqual(row.buttons.map(b => b.id), ['view'])
  state.editor.setMenusChecked([row], true)
  await state.savePermissions()
  assert.equal(api.writes.length, 1)
  const [{ data, roleId }] = api.writes
  assert.equal(roleId, 'b'); assert.equal(Object.hasOwn(data, 'assetAccesses'), false)
  assert.deepEqual(data.menus.filter(m => m.granted).map(m => [m.id, m.buttons.map(b => b.id), m.assetAccesses]),
    [['wall', ['view'], undefined]])
  assert.equal(state.editor.flatMenus.value[0].granted, true)
  assert.equal(grantableCalls().length, 0)
})

test('unchanged detail or edit then undo does not verify, write, or report success', async t => {
  const { state, api } = fixture(t, { entry: 'detail' }); await flush()
  const row = state.editor.flatMenus.value[0]
  const calls = http.calls.length
  await state.savePermissions()
  state.editor.toggleButton(row, row.buttons[1], true)
  state.editor.toggleButton(row, row.buttons[1], false)
  await state.savePermissions()
  assert.equal(http.calls.length, calls); assert.deepEqual(api.writes, []); assert.deepEqual(notifications, [])
})

test('detail never replays retained menu scopes or silently drops hidden bindings, even if projection looks empty', async t => {
  const { state, api } = fixture(t, { entry: 'detail' }); await flush()
  api.template.menus.push(menu('help')); api.userMenus.push(menu('help'))
  api.roles.a.menus[0].assetAccesses = []; await state.loadPermissions()
  state.editor.setMenusChecked([state.editor.flatMenus.value[1]], true)
  const draft = state.editor.getSnapshot()
  await state.savePermissions()
  assert.equal(state.menuSaveWarning.value, 'menuBindingProtected')
  assert.deepEqual(state.editor.getSnapshot(), draft); assert.deepEqual(api.writes, [])
  api.roles.a.menus.push(menu('hidden-from-template')); await state.loadPermissions()
  state.editor.setMenusChecked(state.editor.flatMenus.value, false)
  await state.savePermissions(); assert.equal(state.menuSaveWarning.value, 'menuBindingProtected')
  assert.deepEqual(api.writes, []); assert.deepEqual(notifications, []); assert.equal(grantableCalls().length, 0)
})

test('detail can explicitly replace all old bindings and then clear them without touching independent policies', async t => {
  const { api, state } = fixture(t, { entry: 'detail' }); await flush()
  const notify = menu('notify', { assetTypes: ['notifyTemplate'] })
  api.template.menus.push(notify); api.userMenus.push(notify); api.catalog = []
  await state.loadPermissions()
  const row = id => state.editor.flatMenus.value.find(m => m.id === id)
  state.editor.setMenusChecked([row('device')], false)
  state.editor.setMenusChecked([row('notify')], true)
  await state.savePermissions()
  assert.deepEqual(api.writes[0].data.menus.map(m => [m.id, m.granted]), [['notify', true], ['device', false]])
  assert.ok(api.writes[0].data.menus.every(m => !Object.hasOwn(m, 'assetAccesses')))
  assert.deepEqual(Object.keys(api.writes[0].data), ['menus']); assert.deepEqual(api.roles.a.assetAccesses, [policy('ignore')])
  state.editor.setMenusChecked([row('notify')], false); await state.savePermissions()
  assert.deepEqual(api.roles.a.menus, []); assert.deepEqual(api.roles.a.assetAccesses, [policy('ignore')]); assert.equal(grantableCalls().length, 0)
})

test('detail detects changed scope or bindings without resetting the edited selection or posting', async t => {
  const { api, state } = fixture(t, { entry: 'detail' }); await flush()
  state.editor.setMenusChecked(state.editor.flatMenus.value, false)
  const draft = state.editor.getSnapshot()
  api.userMenus[0].buttons.pop(); await state.savePermissions()
  assert.equal(state.menuSaveWarning.value, 'menuGrantChanged'); assert.deepEqual(state.editor.getSnapshot(), draft)
  api.userMenus = [deviceMenu()]; api.roles.a.menus[0].buttons = [button('save')]; await state.savePermissions()
  assert.equal(state.menuSaveWarning.value, 'menuGrantChanged'); assert.deepEqual(state.editor.getSnapshot(), draft)
  assert.deepEqual(api.writes, []); assert.deepEqual(notifications, [])
})

test('incomplete binding reads block writes without hiding candidates or losing the draft', async t => {
  const { api, state } = fixture(t, { entry: 'detail' }); await flush()
  state.editor.setMenusChecked(state.editor.flatMenus.value, false)
  api.bindingPage = () => ({ result: { data: [], total: 1 } })
  const draft = state.editor.getSnapshot(); await state.savePermissions()
  assert.equal(state.menuSaveWarning.value, 'menuVerificationFailed'); assert.deepEqual(state.editor.getSnapshot(), draft)
  await state.loadPermissions(); assert.equal(state.initialized.value, true); assert.equal(state.editor.flatMenus.value.length, 1)
  assert.equal(state.menuSaveWarning.value, 'menuBindingsUnavailable')
  api.bindingPage = null; state.editor.setMenusChecked(state.editor.flatMenus.value, false); await state.savePermissions()
  assert.equal(state.menuSaveWarning.value, 'menuBindingsUnavailable'); assert.deepEqual(api.writes, [])
})

test('detail checks all binding pages and rejects duplicate rows, drifting totals and missing counts', async t => {
  const { api } = fixture(t, { entry: 'detail' }); await flush()
  const row = menuId => ({ menuId, buttons: [] })
  const page = (total, ...data) => ({ success: true, result: { total, data } })
  api.bindingPage = idx => idx ? page(2, row('b')) : page(2, row('a'))
  assert.deepEqual((await readRoleMenuBindings('app', 'a')).map(r => r.menuId), ['a', 'b'])
  for (const last of [page(2, row('a')), page(3, row('b')), page(undefined, row('b')), page(2), page(2, { menuId: 'b' })]) {
    api.bindingPage = idx => idx ? last : page(2, row('a'))
    await assert.rejects(readRoleMenuBindings('app', 'a'))
  }
})

test('detail handles rejected writes and role switches during verification without success or wrong-role writes', async t => {
  const { state, api } = fixture(t, { entry: 'detail' }); await flush()
  state.editor.setMenusChecked(state.editor.flatMenus.value, false); const draft = state.editor.getSnapshot()
  api.saveFailure = 'denied'; await state.savePermissions(); assert.equal(state.menuSaveWarning.value, 'menuWriteFailed')
  assert.deepEqual(state.editor.getSnapshot(), draft); assert.deepEqual(notifications, [])
  const gate = deferred(); api.beforeTemplate = () => gate.promise
  const saving = state.savePermissions(); state.activeRoleId.value = 'b'; await nextTick(); gate.resolve()
  await saving; await flush(); assert.equal(api.writes.length, 1); assert.equal(grantableCalls().length, 0)
  assert.equal(state.menuSaveWarning.value, '')
})

test('detail shows a stored menu with no granted buttons as checked and lets the user explicitly revoke it', async t => {
  const { api, state } = fixture(t, { entry: 'detail' }); await flush()
  api.roles.a.menus[0].buttons = []; await state.loadPermissions()
  const [row] = state.editor.ownerGroups.value[0].menus
  assert.equal(row._granted, true); assert.ok(row.buttons.every(b => !b.granted))
  state.editor.toggleMenu(row, false); await state.savePermissions()
  assert.deepEqual(api.writes[0].data.menus, [{ id: 'device', owner: 'app', granted: false, buttons: [] }])
  assert.equal(grantableCalls().length, 0)
})

test('a successful PUT with unmatched binding readback does not report success or discard the draft', async t => {
  const { api, state } = fixture(t, { entry: 'detail' }); await flush()
  state.editor.setMenusChecked(state.editor.flatMenus.value, false)
  const draft = state.editor.getSnapshot()
  api.beforeSave = () => { api.bindingPage = () => ({ success: true, result: { total: 1, data: [{ menuId: 'device', buttons: [] }] } }) }
  await state.savePermissions()
  assert.equal(api.writes.length, 1); assert.equal(state.menuSaveWarning.value, 'menuWriteFailed')
  assert.deepEqual(notifications, []); assert.deepEqual(state.editor.getSnapshot(), draft)
})
