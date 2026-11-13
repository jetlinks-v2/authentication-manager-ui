import { cloneDeep } from 'lodash-es'
import { getMenuPermissionAssetTypes } from '@jetlinks-web-core/hooks'
import type { AssetAccessPolicy, MenuAssetPermissionSnapshot, MenuPermissionNode } from '@jetlinks-web-core/hooks'
import {
  filterApplicationMenuInterfacePermissions,
  normalizeCandidateMenus,
  normalizeGrantedMenus,
} from '../Template/Save/menu-config.shared'

interface ApplicationRolePermissionScopeInput {
  isExternal: boolean
  currentUserMenus: MenuPermissionNode[]
  templateMenus?: MenuPermissionNode[]
  roleMenus?: MenuPermissionNode[]
  templateAssetAccesses?: AssetAccessPolicy[]
}

/** 内置应用只查询应用菜单；保留外部应用的跨 owner 查询约定。 */
export const buildApplicationRoleMenuQuery = (isExternal: boolean) => isExternal
  ? { paging: false }
  : { paging: false, terms: [{ column: 'owner', value: 'app' }] }

/** 兼容模板的扁平 parentId 与用户菜单的嵌套 children，不修改接口响应。 */
const flattenMenus = (menus: MenuPermissionNode[], parentId?: string): MenuPermissionNode[] =>
  menus.flatMap(menu => [
    { ...menu, parentId: menu.parentId || parentId, children: null },
    ...flattenMenus(menu.children || [], menu.id),
  ])

/** 只从模板独立策略生成菜单级兼容字段，旧角色策略和用户菜单资产字段不参与继承。 */
const templateMenuAccesses = (menu: MenuPermissionNode, policies: AssetAccessPolicy[]) => {
  const assetTypes = new Set(getMenuPermissionAssetTypes(menu))
  return policies.filter(policy => assetTypes.has(policy.assetType))
    .flatMap(policy => policy.accesses.map(access => ({
      ...cloneDeep(access), assetType: policy.assetType, granted: true,
    })))
}

/** 菜单与按钮取用户和模板交集；祖先仅用于保留层级，资产权限始终采用模板配置。 */
export const resolveApplicationRolePermissionScope = (input: ApplicationRolePermissionScopeInput) => {
  const normalize = (items: MenuPermissionNode[]) => flattenMenus(normalizeGrantedMenus(
    input.isExternal ? items : filterApplicationMenuInterfacePermissions(items),
  ))
  const userMenus = new Map(normalize(input.currentUserMenus).map(menu => [menu.id, menu]))
  const roleMenus = new Map(normalize(input.roleMenus || []).map(menu => [menu.id, menu]))
  const assetAccesses = cloneDeep(input.templateAssetAccesses || [])
  const candidates = normalize(input.templateMenus || []).filter(menu => userMenus.has(menu.id))
  const byId = new Map(candidates.map(menu => {
    const userMenu = userMenus.get(menu.id)!
    const userButtons = new Set((userMenu.buttons || []).filter(button => button.granted).map(button => button.id))
    const granted = !!menu.granted && !!userMenu.granted
    return [menu.id, {
      ...menu,
      granted,
      buttons: granted ? (menu.buttons || []).filter(button => button.granted && userButtons.has(button.id)) : [],
      assetAccesses: templateMenuAccesses(menu, assetAccesses),
      children: [] as MenuPermissionNode[],
    }]
  }))
  const roots: MenuPermissionNode[] = []
  byId.forEach(menu => {
    const parent = menu.parentId && menu.parentId !== menu.id ? byId.get(menu.parentId) : undefined
    if (parent) parent.children.push(menu)
    else roots.push(menu)
  })
  // 无授权的祖先只有保留子菜单时才进入候选，避免把纯目录变成可授权叶节点。
  const prune = (items: MenuPermissionNode[]): MenuPermissionNode[] => items.flatMap(menu => {
    const children = prune(menu.children || [])
    return menu.granted || children.length ? [{ ...menu, children }] : []
  })
  const menus = normalizeCandidateMenus(prune(roots))
  const echo = (items: MenuPermissionNode[]): MenuPermissionNode[] => items.map(menu => {
    const role = roleMenus.get(menu.id)
    const selectedButtons = new Set((role?.buttons || []).filter(button => button.granted).map(button => button.id))
    return {
      ...menu,
      granted: role?.granted === true,
      buttons: (menu.buttons || []).map(button => ({ ...button, granted: selectedButtons.has(button.id) })),
      children: echo(menu.children || []),
    }
  })
  const grantableMenuIds = new Set([...byId.values()].filter(menu => menu.granted).map(menu => menu.id))
  return { menus, grantedMenus: echo(menus), assetAccesses, grantableMenuIds }
}

/** 完整复制最新模板策略（包括空集合和扩展配置），并同步菜单字段，防止编辑器默认值恢复旧权限。 */
export const buildApplicationRolePermissionGrant = (
  snapshot: MenuAssetPermissionSnapshot,
  scope: ReturnType<typeof resolveApplicationRolePermissionScope>,
  previousMenus: MenuPermissionNode[] = [],
): MenuAssetPermissionSnapshot => {
  const menus = snapshot.menus.map(menu => {
    // 公共编辑器会勾选有已选子项的祖先；导航祖先本身不在模板授权范围时，不能作为新授权提交。
    const granted = scope.grantableMenuIds.has(menu.id) && menu.granted === true
    return { ...menu, granted, buttons: granted ? menu.buttons : [],
      assetAccesses: granted ? templateMenuAccesses(menu, scope.assetAccesses) : [] }
  })
  const included = new Set(menus.map(menu => menu.id))
  // 后端按提交节点的 owner 替换旧绑定；保留撤销标记，确保清空或移出交集后仍删除旧菜单。
  flattenMenus([...scope.menus, ...previousMenus]).forEach(menu => {
    if (included.has(menu.id)) return
    included.add(menu.id)
    menus.push({ id: menu.id, owner: menu.owner, granted: false, buttons: [], assetAccesses: [] })
  })
  return { menus, assetAccesses: cloneDeep(scope.assetAccesses) }
}
