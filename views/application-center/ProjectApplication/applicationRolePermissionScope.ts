import { cloneDeep } from 'lodash-es'
import { getMenuPermissionAssetTypes } from '@jetlinks-web-core/hooks'
import type { AssetAccessPolicy, GrantableAssetType, MenuAssetPermissionSnapshot, MenuPermissionNode } from '@jetlinks-web-core/hooks'
import {
  filterApplicationMenuInterfacePermissions,
  normalizeCandidateMenus,
  normalizeGrantedMenus,
} from '../Template/Save/menu-config.shared'

interface MenuSources {
  isExternal: boolean
  currentUserMenus: MenuPermissionNode[]
  applicationMenus: MenuPermissionNode[]
  templateMenus?: MenuPermissionNode[]
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

/** 仅保留已绑定节点的撤销标识；授权详情中的其他候选不能作为要替换的 owner。 */
export const previousRoleBindings = (menus: MenuPermissionNode[]) => flattenMenus(menus)
  .filter(menu => menu.granted === true)
  .map(({ id, owner }) => ({ id, owner }))

/** 只从已收窄的独立策略生成菜单级兼容字段，旧角色策略和用户菜单资产字段不参与继承。 */
const effectiveMenuAccesses = (menu: MenuPermissionNode, policies: AssetAccessPolicy[]) => {
  const assetTypes = new Set(getMenuPermissionAssetTypes(menu))
  return policies.filter(policy => assetTypes.has(policy.assetType))
    .flatMap(policy => policy.accesses.map(access => ({
      ...cloneDeep(access), assetType: policy.assetType, granted: true,
    })))
}

const normalizeMenus = (items: MenuPermissionNode[], external: boolean) => flattenMenus(normalizeGrantedMenus(
  external ? items : filterApplicationMenuInterfacePermissions(items),
))

/** 先求应用、模板与用户的菜单/按钮交集；可授权资产目录只查询其中能授权的节点。 */
export const getApplicationRoleMenuCandidates = (input: MenuSources): MenuPermissionNode[] => {
  const user = new Map(normalizeMenus(input.currentUserMenus, input.isExternal).map(menu => [menu.id, menu]))
  const application = new Map(flattenMenus(input.applicationMenus).map(menu => [menu.id, menu]))
  return normalizeMenus(input.templateMenus || [], input.isExternal).flatMap(menu => {
    const own = user.get(menu.id)
    const app = application.get(menu.id)
    if (!own || !app) return []
    const granted = !!own.granted && !!menu.granted
    const buttons = new Set((own.buttons || []).filter(button => button.granted).map(button => button.id))
    return [{ ...menu, granted,
      assetTypes: [...new Set([...getMenuPermissionAssetTypes(app), ...getMenuPermissionAssetTypes(menu)])],
      buttons: granted ? (menu.buttons || []).filter(button => button.granted && buttons.has(button.id)) : [],
    }]
  })
}

/**
 * 可下授目录按范围 priority 升序返回，菜单中的 priority 仅用于比较宽窄，不作为可授权凭据。
 * 模板值可授时原样保留，否则只收窄到当前用户的上限；同级异名或未知范围不推断包含关系。
 */
export const intersectRoleAssetPolicies = (
  menus: MenuPermissionNode[], template: AssetAccessPolicy[], catalog: GrantableAssetType[],
): AssetAccessPolicy[] => {
  const priorities = new Map<string, Map<string, number>>()
  for (const menu of menus) {
    const types = getMenuPermissionAssetTypes(menu)
    for (const type of types) if (!priorities.has(type)) priorities.set(type, new Map())
    for (const access of menu.assetAccesses || []) {
      const type = access.assetType || (types.length === 1 ? types[0] : undefined)
      if (type && Number.isFinite(access.priority)) priorities.get(type)?.set(access.supportId, access.priority)
    }
  }
  const policies = new Map(template.map(policy => [policy.assetType, policy]))
  return catalog.flatMap(({ assetType, accesses }) => {
    const ranks = priorities.get(assetType)
    const fixed = assetType === 'notifyConfig' || assetType === 'notifyTemplate'
    const policy = policies.get(assetType) ?? (fixed ? undefined : policies.get('*'))
    const allowed = accesses.filter(access => !access.disabled)
    if (!ranks || !policy || !allowed.length || assetType === '*') return []
    const enabledIds = new Set(allowed.map(access => access.supportId))
    const last = allowed[allowed.length - 1].supportId
    const max = ranks.get(last)
    const upper = allowed.filter(access => access.supportId === last || (max !== undefined && ranks.get(access.supportId) === max))
    const values = new Map<string, AssetAccessPolicy['accesses'][number]>()
    const options = (policy as AssetAccessPolicy & { options?: Record<string, unknown> }).options
    for (const access of policy.accesses) {
      if (enabledIds.has(access.supportId)) {
        values.set(access.supportId, access)
        continue
      }
      // 固定通知值必须显式匹配；未知扩展配置不能从某个 support 移植到另一个。
      if (fixed || Object.keys(access).some(key => key !== 'supportId')
        || Object.keys(policy).some(key => !['assetType', 'accesses', 'options'].includes(key))
        || Object.keys(options || {}).some(key => key !== 'scopeStrategy')) continue
      const limit = ranks.get(access.supportId)
      if (access.supportId !== 'ignore' && !(limit !== undefined && max !== undefined && max < limit)) continue
      for (const { supportId } of upper) if (!values.has(supportId)) values.set(supportId, { supportId })
    }
    return values.size ? [{ ...policy, assetType, accesses: [...values.values()] }] : []
  })
}

/** 未获资产范围的父菜单可以保留作导航，但不能提交为已授权菜单。 */
export const resolveApplicationRolePermissionScope = (input: {
  isExternal: boolean; candidates: MenuPermissionNode[]; effectiveAssetAccesses: AssetAccessPolicy[]; roleMenus?: MenuPermissionNode[]
}) => {
    const roleMenus = new Map(normalizeMenus(input.roleMenus || [], input.isExternal).map(menu => [menu.id, menu]))
    const assetAccesses = cloneDeep(input.effectiveAssetAccesses.filter(policy => policy.accesses.length > 0))
    const effectiveTypes = new Set(assetAccesses.map(policy => policy.assetType))
    const blockedMenuNames: string[] = []
    const byId = new Map(input.candidates.map(menu => {
        const granted = !!menu.granted && getMenuPermissionAssetTypes(menu).every(type => effectiveTypes.has(type))
        if (menu.granted && !granted) blockedMenuNames.push(menu.i18nName || menu.name || menu.id)
        return [menu.id, { ...menu, granted, buttons: granted ? menu.buttons : [],
          assetAccesses: effectiveMenuAccesses(menu, assetAccesses), children: [] as MenuPermissionNode[],
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
            granted: grantableMenuIds.has(menu.id) && role?.granted === true,
            buttons: (menu.buttons || []).map(button => ({ ...button, granted: selectedButtons.has(button.id) })),
            children: echo(menu.children || []),
        }
    })
    const grantableMenuIds = new Set([...byId.values()].filter(menu => menu.granted).map(menu => menu.id))
    return { menus, grantedMenus: echo(menus), assetAccesses, grantableMenuIds, blockedMenuNames }
}

/** 资产类型跟随有效菜单，保留共享类型及模板扩展配置，不修改输入策略。 */
const policiesForMenus = (policies: AssetAccessPolicy[], menus: MenuPermissionNode[]) => {
  const assetTypes = new Set(menus.flatMap(getMenuPermissionAssetTypes))
  return cloneDeep(policies.filter(policy => assetTypes.has(policy.assetType)))
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
      assetAccesses: granted ? effectiveMenuAccesses(menu, assetAccesses) : [] }
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
