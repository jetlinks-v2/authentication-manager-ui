import { request } from '@jetlinks-web/core'

export type IntegrationState = 'pending' | 'enabled' | 'disabled' | 'removed'
export type EnumState = IntegrationState | { value: IntegrationState; text?: string }
export interface ResourceGrant {
  type: string
  mode: 'selected' | 'all_current'
  resourceIds: string[]
}
export interface ProjectIntegration {
  id: string
  appId: string
  projectId: string
  runtimeId?: string
  runtimeApplicationId?: string
  environment: string
  state: EnumState
  authorizationRevision: number
  grantedScopes: string[]
  resourceGrants: ResourceGrant[]
  authorizedBy?: string
  authorizedAt?: number
  createTime?: number
  modifyTime?: number
  updatedAt?: number
}
export interface AvailableApplication {
  appId: string
  name: string
  environment: string
  approvedScopes: string[]
  approvedResourceTypes: string[]
  reviewRevision: number
}
export interface AuthorizationDraft {
  grantedScopes: string[]
  resourceGrants: ResourceGrant[]
  reason: string
}
export interface IntegrationAction {
  projectId: string
  integration: ProjectIntegration
  state: Exclude<IntegrationState, 'pending'>
  activateApi?: boolean
}

type ResponseBody<T> = T | { result: T }
interface IntegrationRequest {
  get<T>(url: string, params: object, config: object): Promise<ResponseBody<T>>
  post<T>(url: string, data: unknown, config: object): Promise<ResponseBody<T>>
  put<T>(url: string, data: unknown, config: object): Promise<ResponseBody<T>>
}
const api = request as IntegrationRequest
// 控制面沿用现有请求入口，只选择控制面认证上下文；这里不猜测或改写部署地址。
const controlContext = { projectContext: false, applicationScope: false }
const root = (projectId: string) => `/console/project/${encodeURIComponent(projectId)}/third-party-integrations`
export const responseBody = <T>(response: ResponseBody<T>): T =>
  response && typeof response === 'object' && 'result' in response ? (response as { result: T }).result : response as T
const listBody = <T>(response: ResponseBody<T[]>): T[] => {
  const value = responseBody(response)
  if (!Array.isArray(value)) throw new Error('ThirdPartyApplication.project.invalidResponse')
  return value
}
export const queryProjectIntegrations = async (projectId: string) =>
  listBody(await api.get<ProjectIntegration[]>(root(projectId), {}, controlContext))
export const queryAvailableApplications = async (projectId: string) =>
  listBody(await api.get<AvailableApplication[]>(root(projectId) + '/available-applications', {}, controlContext))
export const connectProjectApplication = async (projectId: string, appId: string, draft: AuthorizationDraft) =>
  responseBody(await api.post<ProjectIntegration>(root(projectId) + '/connect', { appId, ...draft }, controlContext))
export const updateProjectAuthorization = async (projectId: string, integrationId: string, revision: number, draft: AuthorizationDraft) =>
  responseBody(await api.put<ProjectIntegration>(root(projectId) + '/' + encodeURIComponent(integrationId) + '/authorization',
    { ...draft, expectedAuthorizationRevision: revision }, controlContext))
export const changeIntegrationState = async (action: IntegrationAction, reason: string) =>
  responseBody(await api.put<ProjectIntegration>(root(action.projectId) + '/' + encodeURIComponent(action.integration.id) + '/state',
    { state: action.state, reason }, controlContext))
