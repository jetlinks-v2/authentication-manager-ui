import type { RouteRecordRaw } from 'vue-router'
import type { DocumentHelpRow } from './model'

export interface HelpTreeNode {
  key: string
  title: string
  count: number
  rowIds: string[]
  path: string
  breadcrumb: string
  code?: string
  pointKey?: string
  children?: HelpTreeNode[]
}

/** 以实际菜单为目录来源，点位仍以 code/key 标识，目录改名不影响配置。 */
export function buildHelpTree(rows: DocumentHelpRow[], menus: RouteRecordRaw[], translate: (value: string) => string, fallbackTitle: string): HelpTreeNode[] {
  const assigned = new Set<string>()
  const leaves = (items: DocumentHelpRow[], path: string, parents: string[]): HelpTreeNode[] => items.map(row => ({
    key: `point:${row.id}`, title: row.name, count: 1, rowIds: [row.id], path,
    breadcrumb: [...parents, row.name].join(' / '), code: row.code, pointKey: row.key,
  }))
  // 页面内位置由点位显式登记，避免将展示名称或埋点 key 当作层级。
  const pageChildren = (items: DocumentHelpRow[], path: string, parents: string[]): HelpTreeNode[] => {
    const groups = new Map<string, DocumentHelpRow[]>()
    items.forEach(row => {
      const location = row.location || ''
      groups.set(location, [...(groups.get(location) || []), row])
    })
    return [...groups].flatMap(([location, entries]) => location ? [{
      key: `location:${JSON.stringify([entries[0].code, location])}`, title: location,
      count: entries.length, rowIds: entries.map(row => row.id), path,
      breadcrumb: [...parents, location].join(' / '), code: entries[0].code,
      children: leaves(entries, path, [...parents, location]),
    }] : leaves(entries, path, parents))
  }
  const visit = (items: RouteRecordRaw[], parents: string[], identities: string[]): HelpTreeNode[] => items.flatMap(menu => {
    const code = String(menu.name ?? '')
    const identity = [...identities, code || menu.path]
    const label = menu.meta?.title && menu.meta.hideInMenu !== true ? translate(String(menu.meta.title)) : ''
    const labels = label ? [...parents, label] : parents
    const ownRows = rows.filter(row => row.code === code && !assigned.has(row.id))
    ownRows.forEach(row => assigned.add(row.id))
    const children = [...pageChildren(ownRows, menu.path, labels), ...visit(menu.children || [], labels, identity)]
    if (!children.length) return []
    if (!label) return children
    const rowIds = [...new Set(children.flatMap(child => child.rowIds))]
    return [{ key: `menu:${JSON.stringify(identity)}`, title: label, count: rowIds.length, rowIds,
      path: menu.path, breadcrumb: labels.join(' / '), code, children }]
  })
  const tree = visit(menus, [], [])
  const remaining = rows.filter(row => !assigned.has(row.id))
  if (remaining.length) {
    const pages = [...new Set(remaining.map(row => row.code))].map(code => {
      const items = remaining.filter(row => row.code === code)
      const label = items[0].page.split(' / ')[0]
      return { key: `route:${code}`, title: label, count: items.length, rowIds: items.map(row => row.id), path: '',
        breadcrumb: `${fallbackTitle} / ${label}`, code, children: pageChildren(items, '', [fallbackTitle, label]) }
    })
    tree.push({ key: 'unmapped', title: fallbackTitle, count: remaining.length, rowIds: remaining.map(row => row.id),
      path: '', breadcrumb: fallbackTitle, children: pages })
  }
  return tree
}

/** 搜索保留匹配点位的目录路径；命中目录时展示该目录的完整子树。 */
export function filterHelpTree(nodes: HelpTreeNode[], keyword: string): HelpTreeNode[] {
  const query = keyword.trim().toLocaleLowerCase()
  if (!query) return nodes
  return nodes.flatMap(node => {
    if ([node.title, node.code, node.pointKey].some(value => value?.toLocaleLowerCase().includes(query))) return [node]
    const children = filterHelpTree(node.children || [], query)
    return children.length ? [{ ...node, children }] : []
  })
}

export function findHelpTreeNode(nodes: HelpTreeNode[], key: string): HelpTreeNode | undefined {
  for (const node of nodes) {
    if (node.key === key) return node
    const found = findHelpTreeNode(node.children || [], key)
    if (found) return found
  }
}
