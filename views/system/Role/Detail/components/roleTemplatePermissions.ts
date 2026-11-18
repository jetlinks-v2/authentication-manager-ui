import type {
  MenuAssetPermissionSnapshot,
  MenuPermissionGroupDefinition,
  MenuPermissionNode,
} from '@jetlinks-web-core/hooks'
import type { BusinessApplicationTemplateEntity } from '@authentication-manager-ui/api/application-center/businessApplication'
import { normalizeGrantedMenus } from '../../../../application-center/Template/Save/menu-config.shared'

export interface RoleTemplateMenus {
  template: BusinessApplicationTemplateEntity
  menus: MenuPermissionNode[]
}

export const flattenRoleMenus = (menus: MenuPermissionNode[], parentId?: string): MenuPermissionNode[] =>
  menus.flatMap(menu => [
    { ...menu, parentId: menu.parentId || parentId, children: null },
    ...flattenRoleMenus(menu.children || [], menu.id),
  ])

const grantedMenus = (menus: MenuPermissionNode[]) => flattenRoleMenus(normalizeGrantedMenus(menus))
const grantedButtons = (menu?: MenuPermissionNode) => new Set(
  (menu?.buttons || []).filter(button => button.granted).map(button => button.id),
)

/** 模板和登录用户决定可编辑范围；角色自身的 granted 只负责回显，不参与求交集。 */
export function buildRoleTemplateGroups(
  candidates: MenuPermissionNode[], userMenus: MenuPermissionNode[], templates: RoleTemplateMenus[], basicLabel: string,
): MenuPermissionGroupDefinition[] {
  const userMap = new Map(grantedMenus(userMenus).map(menu => [menu.id, menu]))
  const candidateMap = new Map(flattenRoleMenus(candidates).map(menu => [menu.id, menu]))
  const toScope = (menu: MenuPermissionNode, buttonIds: Set<string>) => ({
    id: menu.id, buttonIds: (menu.buttons || menu.actions || []).filter(button => buttonIds.has(button.id)).map(button => button.id),
  })
  const baseGroups = new Map<string, MenuPermissionGroupDefinition>()
  candidateMap.forEach(menu => {
    const owner = menu.owner || 'default'
    const user = userMap.get(menu.id)
    if (owner === 'app' || !user?.granted) return
    if (!baseGroups.has(owner)) baseGroups.set(owner, { key: owner, label: owner === 'iot' ? basicLabel : owner, menus: [] })
    baseGroups.get(owner)!.menus.push(toScope(menu, grantedButtons(user)))
  })
  const appGroups = templates.flatMap(({ template, menus }) => {
    const scopes = grantedMenus(menus).flatMap(menu => {
      const user = userMap.get(menu.id)
      const candidate = candidateMap.get(menu.id)
      if (!menu.granted || !user?.granted || candidate?.owner !== 'app') return []
      const userButtons = grantedButtons(user)
      return [toScope(candidate, new Set([...grantedButtons(menu)].filter(id => userButtons.has(id))))]
    })
    return scopes.length ? [{ key: `template:${template.id}`, label: template.i18nName || template.name || template.id, menus: scopes }] : []
  })
  const basic = baseGroups.get('iot')
  return [...(basic ? [basic] : []), ...[...baseGroups.values()].filter(group => group.key !== 'iot'), ...appGroups]
}

/** 仅比较权限身份和范围，模板重命名、列表顺序变化不使草稿失效。 */
export function roleTemplateScopeFingerprint(userMenus: MenuPermissionNode[], templates: RoleTemplateMenus[]): string {
  const signature = (menus: MenuPermissionNode[]) => grantedMenus(menus)
    .filter(menu => menu.granted)
    .map(menu => [menu.id, menu.owner || '', menu.parentId || '', [...grantedButtons(menu)].sort()] as const)
    .sort((a, b) => a[0].localeCompare(b[0]))
  return JSON.stringify({ user: signature(userMenus), templates: templates
    .map(item => [item.template.id, signature(item.menus)] as const).sort((a, b) => a[0].localeCompare(b[0])) })
}

/** 完整 owner 状态树承载撤销；未显示菜单留在原始草稿中，绝不以分组视图构造保存载荷。 */
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
