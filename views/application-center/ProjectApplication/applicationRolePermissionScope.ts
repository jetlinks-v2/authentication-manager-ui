import { cloneDeep } from 'lodash-es'
import { getMenuPermissionAssetTypes } from '@jetlinks-web-core/hooks'
import type { AssetAccessPolicy, GrantableAssetType, MenuAssetPermissionSnapshot, MenuPermissionNode } from '@jetlinks-web-core/hooks'
import {
  filterApplicationMenuInterfacePermissions,
  normalizeCandidateMenus,
  normalizeGrantedMenus,
} from '../Template/Save/menu-config.shared'

export interface ApplicationRolePermissionScopeInput {
  isExternal: boolean
  currentUserMenus: MenuPermissionNode[]
  applicationMenus: MenuPermissionNode[]
  templateMenus?: MenuPermissionNode[]
  roleMenus?: MenuPermissionNode[]
  templateAssetAccesses?: AssetAccessPolicy[]
  grantableAssets: GrantableAssetType[]
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

/** 菜单限定当前应用并取用户和模板交集；祖先仅保留层级，资产权限始终采用模板配置。 */
export const resolveApplicationRolePermissionScope = (input: ApplicationRolePermissionScopeInput) => {
    const normalize = (items: MenuPermissionNode[]) => flattenMenus(normalizeGrantedMenus(
        input.isExternal ? items : filterApplicationMenuInterfacePermissions(items),
    ))
    const userMenus = new Map(normalize(input.currentUserMenus).map(menu => [menu.id, menu]))
    const roleMenus = new Map(normalize(input.roleMenus || []).map(menu => [menu.id, menu]))
    const assetAccesses = cloneDeep(input.templateAssetAccesses || [])
    const applicationIds = new Set(flattenMenus(input.applicationMenus).map(menu => menu.id))
    const candidates = normalize(input.templateMenus || []).filter(menu => userMenus.has(menu.id) && applicationIds.has(menu.id))
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

/** 资产类型跟随有效菜单，保留共享类型及模板扩展配置，不修改输入策略。 */
const policiesForMenus = (policies: AssetAccessPolicy[], menus: MenuPermissionNode[]) => {
  const assetTypes = new Set(menus.flatMap(getMenuPermissionAssetTypes))
  return cloneDeep(policies.filter(policy => assetTypes.has(policy.assetType)))
}

/** 策略取模板与可授权范围交集；失去必需策略的菜单不再授权，祖先只保留层级。 */
export const resolveApplicationRolePermissionScope = (input: ApplicationRolePermissionScopeInput) => {
  const roleMenus = new Map(flattenMenus(normalizeGrantedMenus(input.roleMenus || [])).map(menu => [menu.id, menu]))
  const allowedSupports = new Map(input.grantableAssets.map(asset => [asset.assetType,
    new Set(asset.accesses.filter(access => !access.disabled).map(access => access.supportId))]))
  const templatePolicies = input.templateAssetAccesses || []
  const intersectedPolicies = templatePolicies.flatMap(policy => {
    const accesses = policy.accesses.filter(access => allowedSupports.get(policy.assetType)?.has(access.supportId))
    // 模板原有空策略仍可携带 options；过滤为零的非空策略不能变成隐式默认权限。
    return accesses.length || !policy.accesses.length ? [{ ...cloneDeep(policy), accesses: cloneDeep(accesses) }] : []
  })
  const survivingTypes = new Set(intersectedPolicies.filter(policy => policy.accesses.length).map(policy => policy.assetType))
  const excludedTypes = new Set(templatePolicies
    .filter(policy => policy.accesses.length && !survivingTypes.has(policy.assetType)).map(policy => policy.assetType))
  const excludedMenus: Pick<MenuPermissionNode, 'id' | 'name' | 'i18nName'>[] = []
  const byId = new Map(resolveApplicationRoleMenuCandidates(input).map(menu => {
    const excluded = !!menu.granted && getMenuPermissionAssetTypes(menu).some(type => excludedTypes.has(type))
    if (excluded) excludedMenus.push({ id: menu.id, name: menu.name, i18nName: menu.i18nName })
    const granted = !!menu.granted && !excluded
    return [menu.id, { ...menu, granted, buttons: granted ? menu.buttons : [],
      assetAccesses: granted ? templateMenuAccesses(menu, intersectedPolicies) : [],
      children: [] as MenuPermissionNode[] }]
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
      granted: grantableMenuIds.has(menu.id) && role?.granted === true,
      buttons: (menu.buttons || []).map(button => ({ ...button, granted: selectedButtons.has(button.id) })),
      children: echo(menu.children || []),
    }
  })
  const grantableMenuIds = new Set([...byId.values()].filter(menu => menu.granted).map(menu => menu.id))
  const assetAccesses = policiesForMenus(intersectedPolicies, [...byId.values()].filter(menu => menu.granted))
  return { menus, grantedMenus: echo(menus), assetAccesses, grantableMenuIds,
    grantableAssets: input.grantableAssets, excludedMenus }
}

/** 仅提交最终已选菜单的交集策略，同步兼容字段，防止编辑器默认值或旧角色策略恢复越权项。 */
export const buildApplicationRolePermissionGrant = (
  snapshot: MenuAssetPermissionSnapshot,
  scope: ReturnType<typeof resolveApplicationRolePermissionScope>,
  previousMenus: MenuPermissionNode[] = [],
): MenuAssetPermissionSnapshot => {
  const selectedMenus = snapshot.menus.filter(menu => scope.grantableMenuIds.has(menu.id) && menu.granted === true)
  const assetAccesses = policiesForMenus(scope.assetAccesses, selectedMenus)
  const menus = snapshot.menus.map(menu => {
    // 公共编辑器会勾选有已选子项的祖先；导航祖先本身不在模板授权范围时，不能作为新授权提交。
    const granted = scope.grantableMenuIds.has(menu.id) && menu.granted === true
    return { ...menu, granted, buttons: granted ? menu.buttons : [],
      assetAccesses: granted ? templateMenuAccesses(menu, assetAccesses) : [] }
  })
  const included = new Set(menus.map(menu => menu.id))
  // 后端按提交节点的 owner 替换旧绑定；保留撤销标记，确保清空或移出交集后仍删除旧菜单。
  flattenMenus([...scope.menus, ...previousMenus]).forEach(menu => {
    if (included.has(menu.id)) return
    included.add(menu.id)
    menus.push({ id: menu.id, owner: menu.owner, granted: false, buttons: [], assetAccesses: [] })
  })
  return { menus, assetAccesses }
}
