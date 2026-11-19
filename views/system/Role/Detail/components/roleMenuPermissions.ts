import type {
  MenuAssetPermissionSnapshot,
  MenuPermissionGroupDefinition,
  MenuPermissionNode,
} from '@jetlinks-web-core/hooks'
import { normalizeGrantedMenus } from '../../../../application-center/Template/Save/menu-config.shared'

const GLOBAL_MENU_OWNER = 'iot'

const flattenMenus = (menus: MenuPermissionNode[]): MenuPermissionNode[] =>
  menus.flatMap(menu => [menu, ...flattenMenus(menu.children || [])])

/** 角色的 granted 只用于回显；可编辑范围取 iot 候选与当前用户有效菜单及按钮的交集。 */
export function buildGlobalRoleMenuGroup(candidates: MenuPermissionNode[], userMenus: MenuPermissionNode[]): MenuPermissionGroupDefinition {
  const userMap = new Map(flattenMenus(normalizeGrantedMenus(userMenus)).map(menu => [menu.id, menu]))
  const menus = flattenMenus(candidates).flatMap(menu => {
    const userMenu = userMap.get(menu.id)
    if (menu.owner !== GLOBAL_MENU_OWNER || !userMenu?.granted) return []
    const userButtons = new Set((userMenu.buttons || []).filter(button => button.granted).map(button => button.id))
    const buttonIds = (menu.buttons || menu.actions || []).filter(button => userButtons.has(button.id)).map(button => button.id)
    return [{ id: menu.id, buttonIds }]
  })
  return { key: GLOBAL_MENU_OWNER, label: GLOBAL_MENU_OWNER, visibleOwner: GLOBAL_MENU_OWNER, menus }
}

/** 只比较有效编辑范围；其他 owner 和顺序变化均不使草稿失效。 */
export function globalRoleMenuScopeFingerprint(group: MenuPermissionGroupDefinition): string {
  const scopes = group.menus.map(({ id, buttonIds }) => [id, [...buttonIds].sort()] as const)
  return JSON.stringify(scopes.sort(([a], [b]) => a.localeCompare(b)))
}

/** 完整 owner 状态树承载撤销；未显示菜单留在原始草稿中，不以可见菜单构造保存载荷。 */
export function buildRoleGrantSnapshot(
  sourceMenus: MenuPermissionNode[], snapshot: MenuAssetPermissionSnapshot,
): MenuAssetPermissionSnapshot {
  const granted = new Map(snapshot.menus.map(menu => [menu.id, menu]))
  const visit = (menus: MenuPermissionNode[]): MenuPermissionNode[] => menus.map(source => {
    const menu: MenuPermissionNode = { ...source, granted: !!source.granted,
      buttons: (source.buttons || []).map(button => ({ ...button, granted: !!button.granted })),
      assetAccesses: source.granted ? granted.get(source.id)?.assetAccesses || [] : [],
      children: source.children?.length ? visit(source.children) : null }
    delete menu.actions
    delete menu._granted
    delete menu.indeterminate
    delete menu.dataAccesses
    delete menu.selectAccesses
    delete menu.selectAccessesByAssetType
    return menu
  })
  return { ...snapshot, menus: visit(sourceMenus) }
}
