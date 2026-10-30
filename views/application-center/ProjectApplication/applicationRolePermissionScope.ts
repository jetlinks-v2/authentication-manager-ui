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
  availableMenus?: MenuPermissionNode[]
  roleMenus?: MenuPermissionNode[]
  templateAssetAccesses?: AssetAccessPolicy[]
  roleAssetAccesses?: AssetAccessPolicy[]
}

/**
 * 应用角色的候选始终取应用有效菜单。
 *
 * 应用范围授权入口已在服务端校验管理员操作权限和菜单、资产策略上限，前端不再用当前管理员
 * 的运行时菜单裁剪候选，避免新应用首次授权时得到空菜单。
 */
export const resolveApplicationRolePermissionScope = (
  input: ApplicationRolePermissionScopeInput,
) => {
  const availableMenus = input.isExternal
    ? input.availableMenus || []
    : filterApplicationMenuInterfacePermissions(input.availableMenus || [])
  const menus = normalizeCandidateMenus(availableMenus)
  const roleMenus = input.isExternal
    ? input.roleMenus || []
    : filterApplicationMenuInterfacePermissions(input.roleMenus || [])
  const grantedMenus = normalizeGrantedMenus(
    filterGrantedMenuAssetAccessesByMenuScope(filterApplicationMenuTreeBySourceIds(roleMenus, menus), menus),
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
