import type { AssetAccessPolicy, MenuPermissionNode } from '@jetlinks-web-core/hooks'
import {
  filterAssetAccessPoliciesByMenuScope,
  filterApplicationMenuInterfacePermissions,
  filterApplicationMenuTreeBySourceIds,
  filterGrantedMenuAssetAccessesByMenuScope,
  normalizeCandidateMenus,
  normalizeGrantedMenus,
} from '../Template/Save/menu-config.shared'

interface ApplicationRolePermissionScopeInput {
  isExternal: boolean
  currentUserMenus: MenuPermissionNode[]
  templateMenus?: MenuPermissionNode[]
  roleMenus?: MenuPermissionNode[]
  templateAssetAccesses?: AssetAccessPolicy[]
  roleAssetAccesses?: AssetAccessPolicy[]
}

export const buildApplicationRoleMenuQuery = (isExternal: boolean) => isExternal
  ? { paging: false }
  : { paging: false, terms: [{ column: 'owner', value: 'app' }] }

/**
 * 应用角色候选始终取模板上限与当前操作者可授范围的交集。
 * 外链模板包含跨 owner 的接口权限候选，因此只跳过应用菜单过滤，不跳过模板上限。
 */
export const resolveApplicationRolePermissionScope = (
  input: ApplicationRolePermissionScopeInput,
) => {
  const currentUserMenus = input.isExternal
    ? input.currentUserMenus
    : filterApplicationMenuInterfacePermissions(input.currentUserMenus)
  const templateMenus = input.isExternal
    ? input.templateMenus || []
    : filterApplicationMenuInterfacePermissions(input.templateMenus || [])
  const candidateMenus = filterApplicationMenuTreeBySourceIds(templateMenus, currentUserMenus)
  const menus = normalizeCandidateMenus(candidateMenus)
  const roleMenus = input.isExternal
    ? input.roleMenus || []
    : filterApplicationMenuInterfacePermissions(input.roleMenus || [])
  const grantedMenus = normalizeGrantedMenus(
    filterGrantedMenuAssetAccessesByMenuScope(roleMenus, menus),
    menus,
  )
  const roleAssetAccesses = filterAssetAccessPoliciesByMenuScope(
    input.roleAssetAccesses || [],
    menus,
  )
  const templateAssetAccesses = filterAssetAccessPoliciesByMenuScope(
    input.templateAssetAccesses || [],
    menus,
  )

  return {
    menus,
    grantedMenus,
    assetAccesses: templateAssetAccesses.length ? templateAssetAccesses : roleAssetAccesses,
  }
}
