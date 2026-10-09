import { request } from '@jetlinks-web/core'
import type { Pager, QueryPayload } from './apiApplication'

export type GroupStatus = 'enabled' | 'disabled'
export type GroupAccessSupport = 'support' | 'unsupported' | 'indirect'
export type GroupEnum<T extends string> = T | { value: T; text?: string }
export interface ManagedApiOperation {
  id: string
  name?: string
  description?: string
  apiSpecIds: string[]
  options?: Record<string, unknown> | null
}
export interface ManagedApiGroup {
  id: string
  name: string
  description?: string | null
  status: GroupEnum<GroupStatus>
  accessSupport?: GroupEnum<GroupAccessSupport> | null
  assetType?: string | null
  operations?: ManagedApiOperation[] | null
  options?: Record<string, unknown> | null
}
export interface ApiGroupWrite {
  name: string
  description?: string | null
  status: GroupStatus
  accessSupport?: GroupAccessSupport | null
  assetType?: string | null
  operations: ManagedApiOperation[]
  options?: Record<string, unknown> | null
}
export interface RawOpenApiSpec {
  id: string
  method: string
  path: string
  summary?: string
  appId?: string
  operationId?: string
  permissionId?: string
  actions?: string[]
  assetType?: string
}
export interface RuntimeAssetType { id: string; name?: string; i18nName?: string }
type ResponseBody<T> = T | { result: T }
interface ManagementRequest {
  get<T>(url: string): Promise<ResponseBody<T>>
  post<T>(url: string, body: unknown): Promise<ResponseBody<T>>
  put<T>(url: string, body: unknown): Promise<ResponseBody<T>>
  remove<T>(url: string): Promise<ResponseBody<T>>
}
const api = request as ManagementRequest
const groupRoot = '/open/api/group'
const specRoot = '/open/api/spec'
const encode = (id: string) => encodeURIComponent(id)
export const groupBody = <T>(response: ResponseBody<T>): T => response && typeof response === 'object' && 'result' in response
  ? (response as { result: T }).result : response as T
export const queryManagedGroups = (query: QueryPayload) => api.post<Pager<ManagedApiGroup>>(groupRoot + '/detail/_query', query)
export const getManagedGroup = async (id: string) => groupBody(await api.get<ManagedApiGroup>(groupRoot + '/' + encode(id)))
export const createManagedGroup = async (body: ApiGroupWrite) => groupBody(await api.post<ManagedApiGroup>(groupRoot, body))
export const updateManagedGroup = async (id: string, body: Partial<ApiGroupWrite>) => {
  const updated = groupBody(await api.put<boolean>(groupRoot + '/' + encode(id), body))
  if (updated !== true) throw new Error('ApiGroupManagement.updateFailed')
}
export const deleteManagedGroup = (id: string) => api.remove<unknown>(groupRoot + '/' + encode(id))
// 只读配置所需的真实元数据，不把 specification/apiDoc 载入选择器或写入草稿。
const specIncludes = ['id', 'method', 'path', 'summary', 'appId', 'operationId', 'permissionId', 'actions', 'assetType']
export const queryRawSpecs = (query: QueryPayload) => api.post<Pager<RawOpenApiSpec>>(specRoot + '/_query', { ...query, includes: specIncludes })
export const queryLinkedSpecs = async (ids: string[]) => groupBody(await api.post<RawOpenApiSpec[]>(specRoot + '/_query/no-paging', {
  paging: false, includes: specIncludes, terms: [{ column: 'id', termType: 'in', value: ids }],
}))
