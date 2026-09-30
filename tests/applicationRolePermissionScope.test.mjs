import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const runtimeRoot = path.resolve(here, '../../..')
const require = createRequire(import.meta.url)
const esbuild = require(path.join(runtimeRoot, 'node_modules/esbuild'))
const compiled = await esbuild.build({
  entryPoints: [fileURLToPath(new URL(
    '../views/application-center/ProjectApplication/applicationRolePermissionScope.ts',
    import.meta.url,
  ))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
})
const permissionScope = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`
)

const roleManagementSource = readFileSync(new URL(
  '../views/application-center/ProjectApplication/Detail/components/RoleManagement.vue',
  import.meta.url,
), 'utf8')
const detailSource = readFileSync(new URL(
  '../views/application-center/ProjectApplication/Detail/index.vue',
  import.meta.url,
), 'utf8')

const menu = (id, extra = {}) => ({
  id,
  code: `menu/${id}`,
  name: id,
  buttons: [],
  ...extra,
})

test('external applications query all menus available to the current operator', () => {
  assert.deepEqual(permissionScope.buildApplicationRoleMenuQuery(true), { paging: false })
  assert.deepEqual(permissionScope.buildApplicationRoleMenuQuery(false), {
    paging: false,
    terms: [{ column: 'owner', value: 'app' }],
  })
})

test('external application roles use the template and operator menu intersection without open-api filtering', () => {
  const currentMenu = menu('external-api', {
    owner: 'iot',
    permissions: [{ permission: 'open-api', actions: ['query'] }],
    buttons: [{
      id: 'invoke',
      permissions: [{ permission: 'training-service', actions: ['execute'] }],
    }],
    assetAccesses: [{ assetType: 'device', supportId: 'creator' }],
  })
  const result = permissionScope.resolveApplicationRolePermissionScope({
    isExternal: true,
    currentUserMenus: [currentMenu, menu('operator-only', { owner: 'cloud' })],
    templateMenus: [currentMenu, menu('template-only', { owner: 'cloud' })],
    roleMenus: [{ ...currentMenu, granted: true, buttons: [{ ...currentMenu.buttons[0], granted: true }] }],
    templateAssetAccesses: [{
      assetType: 'device',
      accesses: [{ supportId: 'creator' }],
    }],
    roleAssetAccesses: [{
      assetType: 'device',
      accesses: [{ supportId: 'creator' }, { supportId: 'all' }],
    }],
  })

  assert.deepEqual(result.menus.map(item => item.id), ['external-api'])
  assert.deepEqual(result.menus[0].permissions, currentMenu.permissions)
  assert.deepEqual(result.menus[0].buttons[0].permissions, currentMenu.buttons[0].permissions)
  assert.equal(result.grantedMenus[0].granted, true)
  assert.equal(result.grantedMenus[0].buttons[0].granted, true)
  assert.deepEqual(result.assetAccesses, [{
    assetType: 'device',
    accesses: [{ supportId: 'creator' }],
  }])
})

test('internal application roles remain limited to the template and app menu intersection', () => {
  const currentMenus = [
    menu('template-menu', { owner: 'app' }),
    menu('operator-only', { owner: 'app' }),
    menu('open-api-menu', { owner: 'app', showPage: ['open-api'] }),
  ]
  const result = permissionScope.resolveApplicationRolePermissionScope({
    isExternal: false,
    currentUserMenus: currentMenus,
    templateMenus: [
      menu('template-menu', { owner: 'app' }),
      menu('template-only', { owner: 'app' }),
      menu('open-api-menu', { owner: 'app', showPage: ['open-api'] }),
    ],
    roleMenus: [menu('template-menu', { owner: 'app', granted: true })],
  })

  assert.deepEqual(result.menus.map(item => item.id), ['template-menu'])
  assert.equal(result.grantedMenus[0].granted, true)
})

test('role page always loads the template and keeps the external all-owner menu query', () => {
  assert.match(detailSource, /:is-external="application\.provider === 'third-party'"/)
  assert.match(roleManagementSource, /getApplicationTemplateMenus\(props\.templateId\)/)
  assert.doesNotMatch(roleManagementSource, /Promise\.resolve\(undefined\)/)
  assert.match(roleManagementSource, /getCurrentUserMenuTree\(buildApplicationRoleMenuQuery\(props\.isExternal\)\)/)
  assert.match(roleManagementSource, /saveRolePermission\(activeRoleId\.value, editor\.getSnapshot\(\)\)/)
})
