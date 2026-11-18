import type { MenuPermissionNode } from '@jetlinks-web-core/hooks'
import { getOwnMenuThree } from '@jetlinks-web-core/api/system/menu'
import {
  queryBusinessApplicationTemplates,
  getBusinessApplicationTemplateMenus,
} from '@authentication-manager-ui/api/application-center/businessApplication'
import type { RoleTemplateMenus } from './roleTemplatePermissions'

/** 错误响应和结构缺失必须失败，不能当成空模板/空授权继续保存。 */
export function requirePermissionResult<T>(response: { success?: boolean; result?: T; message?: string }): T {
  if (response?.success === false || response?.result == null) throw new Error(response?.message || 'Permission data unavailable')
  return response.result
}

/** 全局角色不继承某个应用实例的请求范围；模板读取有界并发，任一失败均不返回半份范围。 */
export async function loadRoleTemplateScope() {
  const [userResponse, templateResponse] = await Promise.all([
    getOwnMenuThree({ paging: false }, false),
    queryBusinessApplicationTemplates({ paging: false, sorts: [
      { name: 'sortIndex', order: 'asc' }, { name: 'createTime', order: 'desc' },
    ] }),
  ])
  const userMenus = requirePermissionResult<MenuPermissionNode[]>(userResponse)
  const templates = requirePermissionResult(templateResponse)
  if (!Array.isArray(userMenus) || !Array.isArray(templates)) throw new Error('Permission lists unavailable')
  const result: RoleTemplateMenus[] = new Array(templates.length)
  let nextIndex = 0
  await Promise.all(Array.from({ length: Math.min(4, templates.length) }, async () => {
    while (nextIndex < templates.length) {
      const index = nextIndex++
      const template = templates[index]
      const detail = requirePermissionResult(await getBusinessApplicationTemplateMenus(template.id))
      if (!Array.isArray(detail.menus)) throw new Error('Template menus unavailable')
      result[index] = { template, menus: detail.menus }
    }
  }))
  return { userMenus, templates: result }
}
