import { getMenuPermissionAssetTypes } from '@jetlinks-web-core/hooks/useMenuAssetPermissionEditor'
import type { MenuAssetPermissionResetOptions, MenuPermissionNode } from '@jetlinks-web-core/hooks/menuAssetPermissionEditor.types'

// 这些历史菜单声明没有对应的独立资产：巡检执行结果跟随任务，热力图区域跟随空间。
// 仅清理已确认失效的 ID，不能用 /asset/types 的缺失结果过滤暂未启动服务的有效资产。
const retiredAssetTypes = new Set([
  'inspectionPoint',
  'inspectionItem',
  'inspectionRule',
  'inspectionFinding',
  'inspectionReport',
  'aiHeatmapFloorRegion',
])

const isRetiredAssetType = (value: unknown) => typeof value === 'string' && retiredAssetTypes.has(value)

const cleanMenus = (menus: MenuPermissionNode[]): MenuPermissionNode[] => menus.map(menu => {
  const assetTypes = getMenuPermissionAssetTypes(menu)
  const hasRetiredType = assetTypes.some(isRetiredAssetType)
  return {
    ...menu,
    ...(hasRetiredType ? {
      assetTypes: assetTypes.filter(type => !isRetiredAssetType(type)),
    } : {}),
    ...(isRetiredAssetType(menu.assetType) ? { assetType: '' } : {}),
    ...(menu.assetAccesses ? { assetAccesses: menu.assetAccesses.filter(access => !isRetiredAssetType(access.assetType)) } : {}),
    ...(menu.children ? { children: cleanMenus(menu.children) } : {}),
  }
})

/** 同时清理旧菜单候选和已存策略，避免异常类型通过回显或保存快照重新出现。 */
export const cleanRoleAssetPermissions = (input: MenuAssetPermissionResetOptions): MenuAssetPermissionResetOptions => ({
  ...input,
  menus: cleanMenus(input.menus),
  assetAccesses: input.assetAccesses?.filter(policy => !isRetiredAssetType(policy.assetType)),
})
