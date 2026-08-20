import { request } from '@jetlinks-web/core'
import type { AxiosResponseRewrite } from '@jetlinks-web/types'

type RequestConfig = Record<string, unknown>

interface TypedRequest {
  get<T>(url: string, data?: unknown, config?: RequestConfig): Promise<AxiosResponseRewrite<T>>
  post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<AxiosResponseRewrite<T>>
  put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<AxiosResponseRewrite<T>>
  patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<AxiosResponseRewrite<T>>
  remove<T>(url: string, data?: unknown, config?: RequestConfig): Promise<AxiosResponseRewrite<T>>
}

// The installed shared package exposes request as untyped; keep the cast isolated at this API boundary.
const apiRequest = request as TypedRequest

export interface EnumValue {
  value: string
  text?: string
}

export interface BusinessApplicationConfiguration {
  defaultLanguage?: string
  customDomain?: string
  timezone?: string
  [key: string]: unknown
}

export interface BusinessApplicationEntity {
  id: string
  projectId: string
  templateId: string
  name: string
  icon?: string
  description?: string
  configuration?: BusinessApplicationConfiguration
  state?: string | EnumValue
  createTime?: number
  modifyTime?: number
}

export interface BusinessApplicationTemplateEntity {
  id: string
  name: string
  code: string
  icon?: string
  description?: string
  state?: string | EnumValue
  sortIndex?: number
}

export interface BusinessApplicationRoleEntity {
  id: string
  name: string
  description?: string
  state?: string | EnumValue
  groupId?: string
  applicationId?: string
  [key: string]: unknown
}

export interface RoleInfo {
  id: string
  name?: string
}

export interface RelationInfo {
  id: string
  name?: string
}

export interface UserDetailEntity {
  id: string
  name: string
  username: string
  password?: string
  telephone?: string
  email?: string
  status?: number | string | EnumValue
  roleList?: RoleInfo[]
  orgList?: RelationInfo[]
  positions?: RelationInfo[]
  [key: string]: unknown
}

export interface SaveBusinessApplicationUserRequest {
  user: Partial<UserDetailEntity>
  roleIdList: string[]
  orgIdList?: string[]
  positions?: string[]
  businessApplicationIdList?: string[]
}

export interface DeviceEntity {
  id: string
  name: string
  productId?: string
  productName?: string
  classifiedId?: string
  classifiedName?: string
  groupId?: string
  groupName?: string
  parentId?: string
  parentName?: string
  accessId?: string
  accessName?: string
  accessProvider?: string
  state?: string | EnumValue
}

export interface MediaChannelEntity {
  id?: string
  deviceId?: string
  deviceName?: string
  channelId?: string
  name?: string
  manufacturer?: string
  model?: string
  address?: string
  civilCode?: string
  provider?: string
  status?: string | EnumValue
  state?: string | EnumValue
  features?: Array<string | EnumValue>
  ptzType?: string | number | EnumValue
  channelType?: string | EnumValue
  photoUrl?: string
  others?: Record<string, unknown>
}

export interface MediaDeviceEntity {
  id: string
  name?: string
  provider?: string
  channelNumber?: number | string
  state?: string | EnumValue
}

export interface QueryPayload {
  paging?: boolean
  pageIndex?: number
  pageSize?: number
  terms?: Array<Record<string, unknown>>
  sorts?: Array<Record<string, unknown>>
  context?: Record<string, unknown>
}

export interface PagerResult<T> {
  data: T[]
  total?: number
  pageIndex?: number
  pageSize?: number
}

export interface MenuView {
  id?: string
  code?: string
  name?: string
  i18nName?: string
  children?: MenuView[]
}

export const queryBusinessApplications = (data: QueryPayload) =>
  apiRequest.post<BusinessApplicationEntity[]>('/business-application/_query/no-paging?paging=false', data)

export const getBusinessApplication = (id: string) =>
  apiRequest.get<BusinessApplicationEntity>(`/business-application/${id}`)

export const createBusinessApplication = (data: Partial<BusinessApplicationEntity>) =>
  apiRequest.post<unknown>('/business-application', data)

export const updateBusinessApplication = (id: string, data: Partial<BusinessApplicationEntity>) =>
  apiRequest.put<unknown>(`/business-application/${id}`, data)

export const deleteBusinessApplication = (id: string) =>
  apiRequest.remove<void>(`/business-application/${id}`)

export const queryBusinessApplicationTemplates = (data: QueryPayload = { paging: false }) =>
  apiRequest.post<BusinessApplicationTemplateEntity[]>(
    '/business-application-template/_query/no-paging?paging=false',
    data,
  )

export const getBusinessApplicationTemplateMenus = (id: string) =>
  apiRequest.get<MenuView[]>(`/business-application-template/${id}/menus`)

export const queryBusinessApplicationRoles = (
  applicationId: string,
  data: QueryPayload = { pageIndex: 0, pageSize: 500 },
) => apiRequest.post<PagerResult<BusinessApplicationRoleEntity>>('/role/_query/', {
  ...data,
  terms: [
    { column: 'applicationId', termType: 'eq', value: applicationId },
    ...(data.terms || []),
  ],
})

export const createBusinessApplicationRole = (
  applicationId: string,
  data: Partial<BusinessApplicationRoleEntity>,
) => apiRequest.post<BusinessApplicationRoleEntity>('/role', {
  ...data,
  applicationId,
  state: data.state || 'enabled',
})

export const updateBusinessApplicationRole = (data: Partial<BusinessApplicationRoleEntity>) =>
  apiRequest.patch<BusinessApplicationRoleEntity>('/role', data)

export const deleteBusinessApplicationRole = (roleId: string) =>
  apiRequest.remove<void>(`/role/${roleId}`)

export const queryBusinessApplicationUsers = (
  applicationId: string,
  data: QueryPayload = { pageIndex: 0, pageSize: 500 },
) => apiRequest.post<PagerResult<UserDetailEntity>>(
  `/user/detail/business_application/${applicationId}/_query`,
  data,
)

export const queryUserDetails = (data: QueryPayload) =>
  apiRequest.post<PagerResult<UserDetailEntity>>('/user/detail/_query', data)

export const createBusinessApplicationUser = (data: SaveBusinessApplicationUserRequest) =>
  apiRequest.post<string>('/user/detail/_create', data)

export const updateBusinessApplicationUser = (
  userId: string,
  data: SaveBusinessApplicationUserRequest,
) => apiRequest.put<string>(`/user/detail/${userId}/_update`, data)

export const queryDevices = (data: QueryPayload) =>
  apiRequest.post<DeviceEntity[]>('/device/instance/_query/no-paging?paging=false', data)

export const queryDeviceDetails = (data: QueryPayload) =>
  apiRequest.post<PagerResult<DeviceEntity>>('/device/instance/detail/_query', data)

export const queryMediaChannels = (data: QueryPayload) =>
  apiRequest.post<MediaChannelEntity[]>('/media/channel/_query/no-paging?paging=false', data)

export const queryMediaDevices = (data: QueryPayload) =>
  apiRequest.post<PagerResult<MediaDeviceEntity>>('/media/device/_query', data)

export const queryMediaDeviceChannels = (gatewayId: string, data: QueryPayload) =>
  apiRequest.post<PagerResult<MediaChannelEntity>>(
    `/media/device/${encodeURIComponent(gatewayId)}/channel/_query`,
    data,
  )

/** Bind a selected device batch to one business application with the full device permission set. */
export const bindBusinessApplicationDevices = (applicationId: string, ids: string[]) =>
  apiRequest.post<void>('/assets/bind/device', {
    targetType: 'business_application',
    targetId: applicationId,
    assetType: 'device',
    assetIdList: ids,
    permission: ['read', 'save', 'delete', 'share'],
  })

export const unbindBusinessApplicationDevice = (applicationId: string, id: string) =>
  apiRequest.post<void>('/assets/unbind/device', [{
    targetType: 'business_application',
    targetId: applicationId,
    assetType: 'device',
    assetIdList: [id],
  }])
