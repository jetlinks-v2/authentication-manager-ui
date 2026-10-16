import { getMenuDefinitions } from '@authentication-manager-ui/api/system/menu'
import type { MenuDefinition } from '@authentication-manager-ui/api/system/menu'
import { getSystemPermission, updateMenus } from '@jetlinks-web-core/api/initHome'
import { getModulesMenu } from '@jetlinks-web-core/utils/modules'
import { USER_CENTER_MENU_DATA } from '@jetlinks-web-core/views/init-home/data/baseMenu'
import { MENU_OWNERS, createMenuDrafts, filterMenuDefinitions } from './utils'
import type { MenuPayloads } from './utils'

/** 直接读取模块定义，避免基础菜单按 code 预合并造成不同 ID 的候选丢失。 */
export const loadMenuSettings = async () => {
  const [permissions, menus] = await Promise.all([getSystemPermission(), getMenuDefinitions()])
  if (!permissions.success || !menus.success) throw new Error('Menu configuration load failed')
  const definitions: MenuDefinition[] = getModulesMenu()
  const permissionIds = new Set<string>((permissions.result as string[]).map(item =>
    (JSON.parse(item) as { id: string }).id))
  const base = filterMenuDefinitions(definitions, permissionIds)
  const saved = [...(menus.result || [])]
  // 个人中心不进入可选树；尚未写入时沿用初始化定义。
  const hasUserCenter = saved.some(menu => menu.code === USER_CENTER_MENU_DATA.code &&
    (!menu.owner || menu.owner === USER_CENTER_MENU_DATA.owner))
  if (!hasUserCenter) saved.push(USER_CENTER_MENU_DATA)
  return { ...createMenuDrafts(base, saved, definitions), base }
}

/** 等待所有 owner 请求结束；部分失败只报告失败 owner，不将已成功的请求视为回滚。 */
export const saveMenuSettings = async (payloads: MenuPayloads) => {
  const results = await Promise.allSettled(MENU_OWNERS.map(owner => updateMenus(payloads[owner], owner)))
  return MENU_OWNERS.filter((_, index) => {
    const result = results[index]
    return result.status === 'rejected' || !result.value.success
  })
}
