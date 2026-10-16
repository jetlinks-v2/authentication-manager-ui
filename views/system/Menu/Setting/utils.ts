import { cloneDeep } from 'lodash-es'
import type { MenuButton, MenuDefinition, MenuPermission } from '@authentication-manager-ui/api/system/menu'
import { messageSubscribe, USER_CENTER_MENU_CODE } from '@jetlinks-web-core/utils/consts'

export const MENU_OWNERS = ['iot', 'app'] as const
export type MenuOwner = typeof MENU_OWNERS[number]
export interface MenuRecord extends MenuDefinition { id: string }
export interface MenuNode extends MenuRecord { key: string; owner: MenuOwner; children?: MenuNode[] }
export type MenuDrafts = Record<MenuOwner, MenuNode[]>
export type MenuPayloads = Record<MenuOwner, MenuRecord[]>
export const isMenuOwner = (owner: string): owner is MenuOwner => owner === 'iot' || owner === 'app'
const normalizeOwner = (owner?: string | null) => owner || 'iot'

/** 只补齐缺失的 ID、父级与 owner，不根据父节点覆盖子节点归属。 */
export const flattenMenus = (menus: MenuDefinition[], parentId: string | null = null): MenuRecord[] =>
  menus.flatMap(menu => {
    const { children, key: _key, ...item } = cloneDeep(menu)
    const id = item.id || item.code
    return [{ ...item, id, parentId: item.parentId === undefined ? parentId : item.parentId,
      owner: normalizeOwner(item.owner) }, ...flattenMenus(children || [], id)]
  })

/** 保持配置页已有的 showPage 全部满足规则，未开放的新菜单不作为候选。 */
export const filterMenuDefinitions = (menus: MenuDefinition[], permissions: Set<string>): MenuDefinition[] =>
  menus.flatMap(menu => {
    const children = filterMenuDefinitions(menu.children || [], permissions)
    const allowed = !!menu.showPage?.length && menu.showPage.every(permission => permissions.has(permission))
    return allowed || children.length ? [{ ...cloneDeep(menu), children }] : []
  })

/** 按 ID 重建同 owner 的展示树，跨 owner 节点提升展示但保留真实 parentId。 */
const buildTrees = (menus: MenuRecord[]): MenuDrafts => {
  const drafts: MenuDrafts = { iot: [], app: [] }
  const nodes = new Map<string, MenuNode>()
  for (const menu of menus) {
    const owner = normalizeOwner(menu.owner)
    if (isMenuOwner(owner)) nodes.set(menu.id, { ...cloneDeep(menu), key: menu.id, owner, children: [] })
  }
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined
    if (parent && parent.owner === node.owner) parent.children!.push(node)
    else drafts[node.owner].push(node)
  }
  const sort = (tree: MenuNode[]) => {
    tree.sort((left, right) => (left.sortIndex || 0) - (right.sortIndex || 0))
    tree.forEach(node => sort(node.children || []))
  }
  MENU_OWNERS.forEach(owner => sort(drafts[owner]))
  return drafts
}

/** 本地配置决定归属，服务端决定已有菜单的显示、层级和排序。 */
export const createMenuDrafts = (base: MenuDefinition[], saved: MenuDefinition[], definitions = base) => {
  const configured = new Map(flattenMenus(definitions).map(menu => [menu.id, menu]))
  const merged = new Map<string, MenuRecord>()
  for (const menu of flattenMenus(base)) {
    merged.set(menu.id, { ...menu, options: { ...menu.options, show: false } })
  }
  for (const menu of flattenMenus(saved)) {
    const local = configured.get(menu.id)
    merged.set(menu.id, { ...local, ...menu, owner: local?.owner ?? menu.owner,
      options: { ...local?.options, ...menu.options, show: menu.options?.show !== false } })
  }
  const hiddenCodes = new Set([USER_CENTER_MENU_CODE, messageSubscribe])
  const isHidden = (menu: MenuRecord): boolean => {
    const visited = new Set<string>()
    let current: MenuRecord | undefined = menu
    while (current && !visited.has(current.id)) {
      if (hiddenCodes.has(current.code)) return true
      visited.add(current.id)
      current = current.parentId ? merged.get(current.parentId) : undefined
    }
    return false
  }
  const supported = [...merged.values()].filter(menu => isMenuOwner(normalizeOwner(menu.owner)))
  return { drafts: buildTrees(supported.filter(menu => !isHidden(menu))),
    preserved: supported.filter(isHidden) }
}

/** 全量保存必须包含未勾选项及隐藏系统菜单；平铺后每份载荷只含一个 owner。 */
export const buildMenuPayloads = (drafts: MenuDrafts, preserved: MenuRecord[]): MenuPayloads => {
  const payloads: MenuPayloads = { iot: [], app: [] }
  const records = [...flattenMenus(drafts.iot), ...flattenMenus(drafts.app), ...cloneDeep(preserved)]
  for (const menu of records) {
    const owner = normalizeOwner(menu.owner)
    if (isMenuOwner(owner)) payloads[owner].push({ ...menu, owner })
  }
  return payloads
}

const mergePermissions = (current: MenuPermission[] = [], configured: MenuPermission[] = []) => {
  const merged = new Map(current.map(permission => [permission.permission, cloneDeep(permission)]))
  for (const permission of configured) {
    const existing = merged.get(permission.permission)
    merged.set(permission.permission, { ...permission, ...existing,
      actions: [...new Set([...(existing?.actions || []), ...(permission.actions || [])])] })
  }
  return [...merged.values()]
}

/** 按按钮 ID 和权限标识补充定义，保留草稿的显示状态、顺序、层级和 owner。 */
export const synchronizeMenuDefinitions = (drafts: MenuDrafts, base: MenuDefinition[]): MenuDrafts => {
  const definitions = new Map(flattenMenus(base).map(menu => [menu.id, menu]))
  const sync = (tree: MenuNode[]): MenuNode[] => tree.map(menu => {
    const local = definitions.get(menu.id)
    const buttons = new Map<string, MenuButton>((menu.buttons || []).map(button => [button.id, cloneDeep(button)]))
    for (const button of local?.buttons || []) {
      const existing = buttons.get(button.id)
      buttons.set(button.id, { ...button, ...existing,
        permissions: mergePermissions(existing?.permissions, button.permissions) })
    }
    return { ...cloneDeep(menu), buttons: [...buttons.values()],
      permissions: mergePermissions(menu.permissions, local?.permissions), children: sync(menu.children || []) }
  })
  return { iot: sync(drafts.iot), app: sync(drafts.app) }
}
