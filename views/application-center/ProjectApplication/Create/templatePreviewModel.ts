import type { MenuPermissionNode } from '@jetlinks-web-core/hooks'
import { normalizeGrantedMenus } from '../../Template/Save/menu-config.shared'

export interface TemplatePreviewMenu {
  key: string
  title: string
  buttons: Array<{ key: string; title: string }>
  children: TemplatePreviewMenu[]
}

/** 保留已授权菜单、按钮与父级路径，兼容扁平 parentId 和嵌套 children。 */
export const buildTemplatePreviewMenus = (menus: MenuPermissionNode[]): TemplatePreviewMenu[] => {
  const entries = new Map<string, { node: TemplatePreviewMenu; parentId?: string; granted: boolean }>()
  const collect = (items: MenuPermissionNode[], parentId?: string) => {
    items.forEach(item => {
      entries.set(item.id, {
        node: {
          key: item.id,
          title: item.i18nName || item.name || item.code || item.id,
          // 仅为子菜单保留的未授权父节点，不代表已获得其按钮权限。
          buttons: item.granted ? (item.buttons || [])
            .filter(button => button.granted)
            .map(button => ({ key: button.id, title: button.i18nName || button.name || button.id })) : [],
          children: [],
        },
        parentId: item.parentId || parentId,
        granted: !!item.granted,
      })
      collect(item.children || [], item.id)
    })
  }
  collect(normalizeGrantedMenus(menus))

  const roots: TemplatePreviewMenu[] = []
  entries.forEach(({ node, parentId }) => {
    const parent = parentId && parentId !== node.key ? entries.get(parentId)?.node : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  })

  const prune = (nodes: TemplatePreviewMenu[]): TemplatePreviewMenu[] => nodes.flatMap(node => {
    const children = prune(node.children)
    return entries.get(node.key)?.granted || children.length ? [{ ...node, children }] : []
  })
  return prune(roots)
}
