import { cloneDeep } from 'lodash-es'
import { flattenMenus } from './utils'
import type { MenuDrafts, MenuNode, MenuRecord } from './utils'

export interface MenuDrop {
  dragId: string
  targetId: string
  placement: 'inside' | 'before' | 'after'
}

const findNode = (tree: MenuNode[], id: string): MenuNode | undefined => {
  for (const node of tree) {
    if (node.id === id) return node
    const child = findNode(node.children || [], id)
    if (child) return child
  }
}

/** 父级选择联动仅作用于当前 Tab，按 ID 区分同 code 的菜单。 */
export const selectMenu = (tree: MenuNode[], id: string, selected: boolean): MenuNode[] => {
  const result = cloneDeep(tree)
  const setSelected = (node: MenuNode, value: boolean) => {
    node.options = { ...node.options, show: value }
    node.children?.forEach(child => setSelected(child, value))
  }
  const target = findNode(result, id)
  if (target) setSelected(target, selected)
  const restoreParents = (nodes: MenuNode[]): boolean => {
    let shown = false
    for (const node of nodes) {
      const childShown = restoreParents(node.children || [])
      // 菜单管理入口始终保留，避免关闭当前系统的配置入口。
      if (childShown || (node.owner === 'iot' && node.code === 'system/Menu')) {
        node.options = { ...node.options, show: true }
      }
      shown ||= node.options?.show === true
    }
    return shown
  }
  restoreParents(result)
  return result
}

/** 拖拽显式更新父级；未移动的跨 owner 根节点继续保留原始父级引用。 */
export const moveMenu = (tree: MenuNode[], drop: MenuDrop): MenuNode[] => {
  const result = cloneDeep(tree)
  const dragged = findNode(result, drop.dragId)
  const target = findNode(result, drop.targetId)
  if (!dragged || !target || dragged.owner !== target.owner || findNode([dragged], target.id)) return result
  const remove = (nodes: MenuNode[]): boolean => {
    const index = nodes.findIndex(node => node.id === dragged.id)
    if (index >= 0) { nodes.splice(index, 1); return true }
    return nodes.some(node => remove(node.children || []))
  }
  remove(result)
  const insert = (nodes: MenuNode[]): boolean => {
    const index = nodes.findIndex(node => node.id === target.id)
    if (index >= 0) {
      if (drop.placement === 'inside') {
        target.children ||= []
        dragged.parentId = target.id
        target.children.unshift(dragged)
      } else {
        dragged.parentId = target.parentId ?? null
        nodes.splice(index + (drop.placement === 'after' ? 1 : 0), 0, dragged)
      }
      return true
    }
    return nodes.some(node => insert(node.children || []))
  }
  insert(result)
  const reorder = (nodes: MenuNode[]) => {
    nodes.forEach((node, index) => { node.sortIndex = index + 1; reorder(node.children || []) })
  }
  reorder(result)
  return result
}

/** 使用真实父级链校验层级和环，包含拆分 Tab 后未在展示树中出现的祖先。 */
export const hasValidMenuDepth = (drafts: MenuDrafts, preserved: MenuRecord[]): boolean => {
  const records = [...flattenMenus(drafts.iot), ...flattenMenus(drafts.app), ...preserved]
  const byId = new Map(records.map(menu => [menu.id, menu]))
  return records.every(menu => {
    let current: MenuRecord | undefined = menu
    const visited = new Set<string>()
    while (current) {
      if (visited.has(current.id) || visited.size === 3) return false
      visited.add(current.id)
      current = current.parentId ? byId.get(current.parentId) : undefined
    }
    return true
  })
}
