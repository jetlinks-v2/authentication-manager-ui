import type { MenuPermissionNode } from '@jetlinks-web-core/hooks'
import { queryApplicationRoleMenuBindings, type ApplicationRoleMenuBinding } from '@authentication-manager-ui/api/application-center/businessApplication'

/** 数据库按 owner 替换绑定，故必须核对全部分页。截断、总数漂移、重复行都不能当作空角色。 */
export async function readRoleMenuBindings(applicationId: string, roleId: string): Promise<ApplicationRoleMenuBinding[]> {
  const bindings = new Map<string, ApplicationRoleMenuBinding>()
  let total: number | undefined
  for (let index = 0; ; index++) {
    const response = await queryApplicationRoleMenuBindings(applicationId, roleId, index)
    const page = response?.result
    if (!page || response.success !== true || !Array.isArray(page.data) || typeof page.total !== 'number'
      || !Number.isSafeInteger(page.total) || page.total < 0 || (total !== undefined && page.total !== total)
      || (page.pageIndex !== undefined && page.pageIndex !== index)) throw new Error('Incomplete application role bindings')
    total = page.total
    for (const row of page.data) {
      if (!row || typeof row.menuId !== 'string' || !row.menuId.trim() || bindings.has(row.menuId)
        || !Array.isArray(row.buttons) || !row.buttons.every(b => b && typeof b.id === 'string' && b.id && typeof b.granted === 'boolean')) {
        throw new Error('Invalid application role binding')
      }
      bindings.set(row.menuId, row)
    }
    if (bindings.size === total) return [...bindings.values()]
    if (!page.data.length || bindings.size > total) throw new Error('Incomplete application role bindings')
  }
}

// 比较稳定的 ID/权限，不让展示名称和接口排序影响“未修改”或并发判断。
const fingerprint = (rows: unknown[][]) => JSON.stringify(rows.map(row => JSON.stringify(row)).sort())
const buttonIds = (row: MenuPermissionNode) => (row.buttons || []).map(b => b.id).sort()
const candidatesKey = (menus: MenuPermissionNode[]) => fingerprint(menus.map(m => [m.id, m.parentId, m.owner, m.appId, m.granted, buttonIds(m)]))
const bindingsKey = (bindings: ApplicationRoleMenuBinding[]) => fingerprint(bindings.map(b => [b.menuId, b.merge, b.priority,
  b.buttons.filter(button => button.granted).map(button => button.id).sort()]))
const selectionKey = (rows: MenuPermissionNode[]) => fingerprint(rows.map(m => [m.id, buttonIds(m)]))

/** 老记录可能仍用历史 owner，成功响应后按菜单及按钮核对实际替换结果。 */
export function matchesMenuOnlyWrite(menus: MenuPermissionNode[], stored: ApplicationRoleMenuBinding[]) {
  return selectionKey(menus.filter(m => m.granted)) === fingerprint(stored.map(b => [b.menuId,
    b.buttons.filter(button => button.granted).map(button => button.id).sort()]))
}

/** 以真实关系和可勾选 ID 建立编辑基线；预检只构造本次安全的菜单变更，不修改草稿。 */
export function menuOnlyBaseline(candidates: MenuPermissionNode[], selection: MenuPermissionNode[], bindings?: ApplicationRoleMenuBinding[]) {
  const eligible = new Set(candidates.filter(m => m.granted).map(m => m.id))
  // 勾选子项可能使仅作导航的父行在编辑器内呈选中态，这不构成新的菜单授权。
  const selected = (rows: MenuPermissionNode[]) => rows.filter(m => eligible.has(m.id))
  const initial = selected(selection)
  const initialKey = selectionKey(initial)
  const initialIds = new Set(initial.map(m => m.id))
  const scopeKey = candidatesKey(candidates)
  const storedKey = bindings && bindingsKey(bindings)
  return {
    verified: storedKey !== undefined,
    changed: (draft: MenuPermissionNode[]) => selectionKey(selected(draft)) !== initialKey,
    prepare(draft: MenuPermissionNode[], fresh: MenuPermissionNode[], stored: ApplicationRoleMenuBinding[]) {
      if (storedKey === undefined) return { warning: 'menuBindingsUnavailable' } as const
      if (scopeKey !== candidatesKey(fresh) || storedKey !== bindingsKey(stored)) return { warning: 'menuGrantChanged' } as const
      const choices = new Map(fresh.filter(m => m.granted).map(m => [m.id, m]))
      const rows = selected(draft)
      const nextIds = new Set(rows.map(m => m.id))
      // 关系 DTO 没有原绑定的 owner/数据策略，且后端始终清理历史 null owner。
      // 不能假定其它 owner 不受影响；每条旧绑定必须曾在本页选中且这次被明确取消。
      if (stored.some(b => !initialIds.has(b.menuId) || nextIds.has(b.menuId))) return { warning: 'menuBindingProtected' } as const
      const menus: MenuPermissionNode[] = []
      for (const row of rows) {
        const choice = choices.get(row.id)
        const allowed = new Set((choice?.buttons || []).map(b => b.id))
        if (!choice?.owner || row.buttons?.some(b => !allowed.has(b.id))) return { warning: 'menuGrantChanged' } as const
        menus.push({ id: choice.id, owner: choice.owner, appId: choice.appId, granted: true,
          buttons: (row.buttons || []).map(({ id }) => ({ id, granted: true })) })
      }
      for (const { menuId } of stored) {
        const owner = choices.get(menuId)?.owner
        if (!owner) return { warning: 'menuBindingProtected' } as const
        menus.push({ id: menuId, owner, granted: false, buttons: [] })
      }
      // 不重放详情中的菜单级权限，也不传顶层 assetAccesses（[] 会清空独立策略）。
      return { menus } as const
    },
  }
}
