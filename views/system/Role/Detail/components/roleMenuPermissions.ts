import type {
  MenuAssetPermissionSnapshot,
  MenuPermissionGroupDefinition,
  MenuPermissionNode,
} from '@jetlinks-web-core/hooks'
import { normalizeGrantedMenus } from '../../../../application-center/Template/Save/menu-config.shared'

const flattenMenus = (menus: MenuPermissionNode[]): MenuPermissionNode[] =>
  menus.flatMap(menu => [menu, ...flattenMenus(menu.children || [])])

/** 角色的 granted 只用于回显；每组可编辑范围是同一 owner 下候选与当前用户授权的交集。 */
export function buildGlobalRoleMenuGroups(candidates: MenuPermissionNode[], userMenus: MenuPermissionNode[]): MenuPermissionGroupDefinition[] {
  const userMap = new Map(flattenMenus(normalizeGrantedMenus(userMenus)).map(menu => [menu.id, menu]))
  const groups = ['iot', 'app'].map((key): MenuPermissionGroupDefinition => ({ key, label: key, visibleOwner: key, menus: [] }))
  for (const menu of flattenMenus(candidates)) {
    const group = groups.find(group => group.key === menu.owner)
    const userMenu = userMap.get(menu.id)
    if (!group || !userMenu?.granted || userMenu.owner !== menu.owner) continue
    const userButtons = new Set((userMenu.buttons || []).filter(button => button.granted).map(button => button.id))
    const buttonIds = (menu.buttons || menu.actions || []).filter(button => userButtons.has(button.id)).map(button => button.id)
    group.menus.push({ id: menu.id, buttonIds })
  }
  return groups
}

/** 编辑器按子节点推导父节点授权；编辑树只连接同 owner 的最近祖先，避免跨页签连带授权。 */
export function buildOwnerEditTree(menus: MenuPermissionNode[]): MenuPermissionNode[] {
  const roots: MenuPermissionNode[] = []
  const ancestors = new Map<MenuPermissionNode['owner'], { id: string; children: MenuPermissionNode[] }>()
  const visit = (source: MenuPermissionNode) => {
    const parent = ancestors.get(source.owner)
    const children: MenuPermissionNode[] = []
    const node = { ...source, parentId: parent?.id, children }
    const siblings = parent?.children ?? roots
    siblings.push(node)
    ancestors.set(source.owner, node)
    source.children?.forEach(visit)
    if (parent) ancestors.set(source.owner, parent)
    else ancestors.delete(source.owner)
  }
  menus.forEach(visit)
  return roots
}

/** 两组均参与保存前复核，菜单和按钮返回顺序不影响草稿。 */
export function globalRoleMenuScopeFingerprint(groups: MenuPermissionGroupDefinition[]): string {
  return JSON.stringify(groups.map(({ key, menus }) => {
    const scopes = menus.map(({ id, buttonIds }) => [id, [...buttonIds].sort()] as const)
    return [key, scopes.sort(([a], [b]) => a.localeCompare(b))]
  }))
}

/** 将同一份编辑快照还原到详情原树；保留混合 owner 的父子关系，显式提交未授权的菜单及按钮。 */
export function buildRoleGrantSnapshot(
  sourceMenus: MenuPermissionNode[], draftMenus: MenuPermissionNode[], snapshot: MenuAssetPermissionSnapshot,
): MenuAssetPermissionSnapshot {
  const drafts = new Map(draftMenus.map(menu => [menu.id, menu]))
  const granted = new Map(snapshot.menus.map(menu => [menu.id, menu]))
  const visit = (menus: MenuPermissionNode[], parentId?: string): MenuPermissionNode[] => menus.map(source => {
    const draft = drafts.get(source.id) ?? source
    const menu: MenuPermissionNode = { ...source, granted: !!draft.granted,
      ...(!source.parentId && parentId ? { parentId } : {}),
      buttons: (draft.buttons || draft.actions || []).map(button => ({ ...button, granted: !!button.granted })),
      assetAccesses: granted.get(source.id)?.assetAccesses || [],
      children: source.children?.length ? visit(source.children, source.id) : null }
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
