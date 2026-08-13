import { request } from '@jetlinks-web/core'
import type {
  AssetAccessPolicy,
  AssetTypeName,
  GrantableAssetType,
  MenuPermissionNode,
} from '@jetlinks-web-core/hooks'

interface EnumItem {
  value: string
  text?: string
}

export interface BusinessApplicationTemplate {
  id: string
  name: string
  code: string
  icon?: string
  description?: string
  document?: string
  state?: string | EnumItem
  sortIndex?: number
  createTime?: number
  modifyTime?: number
  [key: string]: unknown
}

export interface TemplateAssetAccessPolicy extends AssetAccessPolicy {
  options?: {
    scopeStrategy?: string | EnumItem
    [key: string]: unknown
  }
}

export interface ApplicationTemplateMenuGrant {
  menus: MenuPermissionNode[]
  assetAccesses: TemplateAssetAccessPolicy[]
}

export interface SelectOption {
  label: string
  value: string
  disabled?: boolean
}

export const APPLICATION_TEMPLATE_TAG_TARGET_TYPE = 'business-application-template'

const encode = (value: string) => encodeURIComponent(value)

export const queryApplicationTemplates = (data: Record<string, unknown>): Promise<any> =>
  request.post('/business-application-template/_query', data)

export const getApplicationTemplate = (id: string): Promise<any> =>
  request.get(`/business-application-template/${encode(id)}`)

export const createApplicationTemplate = (
  data: Partial<BusinessApplicationTemplate>,
): Promise<any> => request.post('/business-application-template', data)

export const updateApplicationTemplate = (
  id: string,
  data: Partial<BusinessApplicationTemplate>,
): Promise<any> => request.put(`/business-application-template/${encode(id)}`, data)

export const updateApplicationTemplateStatus = (id: string, state: string): Promise<any> =>
  updateApplicationTemplate(id, { state })

export const deleteApplicationTemplate = (id: string): Promise<any> =>
  request.remove(`/business-application-template/${encode(id)}`)

export const getApplicationTemplateMenus = (id: string): Promise<any> =>
  request.get(`/business-application-template/${encode(id)}/menus`)

export const saveApplicationTemplateMenus = (
  id: string,
  data: ApplicationTemplateMenuGrant,
): Promise<any> => request.put(`/business-application-template/${encode(id)}/menus`, data)

export const getCurrentUserMenuTree = (data: Record<string, unknown>): Promise<any> =>
  request.post('/menu/user-own/tree', data)

export const getAssetTypes = (): Promise<any> => request.get('/asset/types')

export const getGrantableAssetAccesses = (menus: MenuPermissionNode[]): Promise<any> =>
  request.post('/menu/asset-accesses/grantable', menus)

export const getAssetScopeStrategies = (): Promise<any> =>
  request.get('/dictionary/asset-scope-strategy/items')

export const queryTagCategoryTreeByType = (type: string): Promise<any> =>
  request.get(`/tag/category/type/${encode(type)}/tree`)

export const saveTagCategory = (data: any): Promise<any> => request.post('/tag/category', data)

export const updateTagCategory = (data: any): Promise<any> => request.patch('/tag/category', data)

export const deleteTagCategory = (id: string): Promise<any> =>
  request.remove(`/tag/category/${encode(id)}`)

export const queryTagTreeByCategory = (
  categoryId: string,
  includeChildren = false,
): Promise<any> => request.get(
  `/tag/category/${encode(categoryId)}/tags/tree${includeChildren ? '?includeChildren=true' : ''}`,
)

export const saveTag = (data: any): Promise<any> => request.post('/tag', data)

export const updateTag = (data: any): Promise<any> => request.patch('/tag', data)

export const deleteTag = (id: string): Promise<any> => request.remove(`/tag/${encode(id)}`)

export const getTargetTags = (targetType: string, targetId: string): Promise<any> =>
  request.get(`/tag/target/${encode(targetType)}/${encode(targetId)}`)

export const overwriteTargetTags = (
  targetType: string,
  targetId: string,
  tagIds: string[],
): Promise<any> => request.put(`/tag/target/${encode(targetType)}/${encode(targetId)}`, tagIds)

export type {
  AssetTypeName,
  GrantableAssetType,
  MenuPermissionNode,
}
