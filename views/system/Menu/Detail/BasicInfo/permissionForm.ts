import { cloneDeep } from 'lodash-es'
import type { MenuAccessSupport, MenuDataAccess, MenuDefinition, MenuPermission } from '@authentication-manager-ui/api/system/menu'

export type MenuPermissionSource = MenuDataAccess & Pick<MenuDefinition, 'id' | 'permissions'>

export interface MenuPermissionForm {
  id?: string
  permissions: MenuPermission[]
  accessSupport: MenuAccessSupport
  assetTypes: string[]
  indirectMenus: string[]
}

/** 与后端保持相同优先级；旧单资产记录在打开表单时转换，无需批量迁移。 */
export const createMenuPermissionForm = (value: MenuPermissionSource = {}): MenuPermissionForm => {
  const assetTypes = value.assetTypes?.length
    ? value.assetTypes
    : value.assetType ? [value.assetType] : []
  const accessSupport = typeof value.accessSupport === 'string'
    ? value.accessSupport
    : value.accessSupport?.value

  return {
    id: value.id,
    permissions: cloneDeep(value.permissions || []),
    accessSupport: accessSupport || 'unsupported',
    assetTypes: [...new Set(assetTypes.filter(type => typeof type === 'string' && type.trim()))],
    indirectMenus: [...(value.indirectMenus || [])],
  }
}

/** 只提交当前模式的字段，并显式清除旧标量，防止 PATCH 后回退到过期资产。 */
export const buildMenuPermissionPayload = (form: MenuPermissionForm) => {
  const assetTypes = form.accessSupport === 'support' ? [...new Set(form.assetTypes)] : []
  return {
    ...form,
    assetTypes,
    // 单资产继续兼容旧读取方；多资产不能用第一个资产冒充完整配置。
    assetType: assetTypes.length === 1 ? assetTypes[0] : '',
    indirectMenus: form.accessSupport === 'indirect' ? [...form.indirectMenus] : [],
  }
}
