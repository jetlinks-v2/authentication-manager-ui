import { request } from '@jetlinks-web/core'
import type { AxiosResponseRewrite } from '@jetlinks-web/types'

type RequestConfig = Record<string, unknown>

interface TypedRequest {
  get<T>(url: string, data?: unknown, config?: RequestConfig): Promise<AxiosResponseRewrite<T>>
  post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<AxiosResponseRewrite<T>>
  put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<AxiosResponseRewrite<T>>
  remove<T>(url: string, data?: unknown, config?: RequestConfig): Promise<AxiosResponseRewrite<T>>
}

const apiRequest = request as TypedRequest

export interface EnumValue {
  value: string
  text?: string
}

export interface ApiServerConfig {
  secureKey?: string
  signature?: 'MD5' | 'SHA256'
  ipWhiteList?: string
  options?: Record<string, unknown>
}

export interface ApiApplication {
  id: string
  name: string
  description?: string
  provider?: string
  integrationModes?: Array<string | EnumValue>
  apiServer?: ApiServerConfig
  state?: string | EnumValue
  createTime?: number
  creatorId?: string
}

export interface ApiGroupOperation {
  id: string
  name?: string
  description?: string
  apiSpecIds?: string[]
  apiDetail?: ApiSpec[]
}

export interface ApiGroup {
  id: string
  name: string
  description?: string
  status?: string | EnumValue
  accessSupport?: string | EnumValue
  assetType?: string
  operations?: ApiGroupOperation[]
}

export interface ApiSpec {
  id: string
  method?: string
  path?: string
  summary?: string
  description?: string
  appId?: string
  operationId?: string
}

export interface ApiGroupGrant {
  id?: string
  targetType?: string
  targetId?: string
  groupId: string
  operationIds?: string[]
  assetAccesses?: Record<string, unknown>
  merge?: boolean
  priority?: number
}

export interface BusinessApplication {
  id: string
  name: string
  description?: string
  state?: string | EnumValue
}

export interface Pager<T> {
  data: T[]
  total?: number
  pageIndex?: number
  pageSize?: number
}

export interface AccessLog {
  id?: string
  ip?: string
  url?: string
  httpMethod?: string
  action?: string
  target?: string
  method?: string
  requestTime?: number
  responseTime?: number
  responseStatus?: number
  httpHeaders?: string | Record<string, unknown>
  parameters?: string | Record<string, unknown>
  exception?: string
  context?: Record<string, unknown>
}

export interface QueryPayload {
  paging?: boolean
  pageIndex?: number
  pageSize?: number
  terms?: Array<Record<string, unknown>>
  sorts?: Array<Record<string, unknown>>
}

export const queryApiApplications = (data: QueryPayload) =>
  apiRequest.post<Pager<ApiApplication>>('/application/_query', data)

export const getApiApplication = (id: string) =>
  apiRequest.get<ApiApplication>(`/application/${encodeURIComponent(id)}`)

export const saveApiApplication = (data: {
  application: ApiApplication
  grants?: ApiGroupGrant[]
  businessApplicationIds?: string[]
}) => apiRequest.post<void>('/application/_save', [data])

export const updateApiApplication = (id: string, data: Partial<ApiApplication>) =>
  apiRequest.put<void>(`/application/${encodeURIComponent(id)}`, data)

export const deleteApiApplication = (id: string) =>
  apiRequest.remove<void>(`/application/${encodeURIComponent(id)}`)

export const queryBusinessApplications = (data: QueryPayload = { paging: false }) =>
  apiRequest.post<BusinessApplication[]>('/business-application/_query/no-paging?paging=false', data)

export const queryApiGroups = (data: QueryPayload = { paging: false }) =>
  apiRequest.post<ApiGroup[]>('/open/api/group/detail/_query/no-paging?specification=true', data)

export const queryApiGrants = (appId: string) =>
  apiRequest.post<ApiGroupGrant[]>(`/open/api/group/api-client/${encodeURIComponent(appId)}/grant/_query`)

export const saveApiGrants = (appId: string, grants: ApiGroupGrant[]) =>
  apiRequest.put<void>(`/open/api/group/api-client/${encodeURIComponent(appId)}/_grant`, grants)

export const queryAccessLogs = (data: QueryPayload) =>
  apiRequest.post<Pager<AccessLog>>('/logger/access/_query', data)
