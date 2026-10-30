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
  '../views/application-center/ProjectApplication/Detail/components/useApplicationRoleManagement.ts',
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

test('external application roles keep every effective menu without operator-menu intersection', () => {
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
    availableMenus: [currentMenu, menu('template-only', { owner: 'cloud' })],
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

  assert.deepEqual(result.menus.map(item => item.id), ['external-api', 'template-only'])
  assert.deepEqual(result.menus[0].permissions, currentMenu.permissions)
  assert.deepEqual(result.menus[0].buttons[0].permissions, currentMenu.buttons[0].permissions)
  assert.equal(result.grantedMenus[0].granted, true)
  assert.equal(result.grantedMenus[0].buttons[0].granted, true)
  assert.deepEqual(result.assetAccesses, [{
    assetType: 'device',
    accesses: [{ supportId: 'creator' }],
  }])
})

test('internal application roles use the effective menu scope and exclude open-api permissions', () => {
  const result = permissionScope.resolveApplicationRolePermissionScope({
    isExternal: false,
    availableMenus: [
      menu('template-menu', { owner: 'app' }),
      menu('template-only', { owner: 'app' }),
      menu('open-api-menu', { owner: 'app', showPage: ['open-api'] }),
    ],
    roleMenus: [menu('template-menu', { owner: 'app', granted: true })],
  })

  assert.deepEqual(result.menus.map(item => item.id), ['template-menu', 'template-only'])
  assert.equal(result.grantedMenus[0].granted, true)
})

test('role page reads and saves grants through the application-scoped endpoint', () => {
  assert.match(detailSource, /isExternal: application\.provider === 'third-party'/)
  assert.match(roleManagementSource, /getBusinessApplicationMenus\(props\.scope\.applicationId\)/)
  assert.doesNotMatch(roleManagementSource, /Promise\.resolve\(undefined\)/)
  assert.match(roleManagementSource, /getBusinessApplicationRoleMenuGrantDetail\(props\.scope\.applicationId, activeRoleId\.value\)/)
  assert.match(roleManagementSource, /saveBusinessApplicationRoleMenuGrant\(/)
})


test('effective scope includes a published application menu but excludes another application', () => {
  const template = menu('shared-template', {owner: 'app'})
  const published = menu('published-a', {owner: 'app', options: {businessApplicationId: 'a'}})
  const unrelated = menu('published-b', {owner: 'app', options: {businessApplicationId: 'b'}})
  const result = permissionScope.resolveApplicationRolePermissionScope({
    isExternal: false,
    availableMenus: [template, published],
    roleMenus: [{...published, granted: true}, {...unrelated, granted: true}],
  })
  assert.deepEqual(result.menus.map(item => item.id), ['shared-template', 'published-a'])
  assert.equal(result.grantedMenus.find(item => item.id === 'published-a')?.granted, true)
  assert.equal(result.grantedMenus.some(item => item.id === 'published-b'), false)
})
