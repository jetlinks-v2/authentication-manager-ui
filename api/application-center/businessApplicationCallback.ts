import { request } from '@jetlinks-web/core'
import type { AxiosResponseRewrite } from '@jetlinks-web/types'
import type { BusinessApplicationConfiguration, PagerResult, QueryPayload } from './businessApplication'

interface CallbackRequest {
  get<T>(url: string): Promise<AxiosResponseRewrite<T>>
  post<T>(url: string, data?: unknown, config?: { timeout: number }): Promise<AxiosResponseRewrite<T>>
  patch<T>(url: string, data: unknown): Promise<AxiosResponseRewrite<T>>
}

export interface ApplicationCallbackConfiguration {
  endpoint: string
  authentication: {
    type: string
    secretConfigured?: boolean
    configuration: Record<string, unknown>
  }
}

export interface CallbackAuthenticationType {
  type: string
  name: string
  secretFields: string[]
}

export interface CallbackTestResult {
  phase: 'token' | 'callback'
  success: boolean
  code: string
  httpStatus: number | null
  elapsedMillis: number
}

export interface CallbackMemberSnapshot {
  id: string
  username?: string
  name?: string
  status?: 'enabled' | 'disabled' | 'locked'
  email?: string
  telephone?: string
  avatar?: string
  modifyTime?: number
}

export interface CallbackRoleSnapshot {
  id: string
  name?: string
  description?: string
  state?: string
  modifyTime?: number
}

export type CallbackTaskState = 'pending' | 'delivering' | 'succeeded' | 'dead' | 'cancelled'
export interface CallbackDeliveryTask {
  id: string
  registrationId: string
  eventId: string
  provider: string
  state: CallbackTaskState
  attempt: number
  createdAt: number
  readyAt?: number
  completedAt?: number
  resultCode?: string
  resultMessage?: string
  bindings?: string[]
}

export interface CallbackDeliveryRecord {
  recordId: string
  taskId: string
  registrationId: string
  eventId: string
  eventType: string
  provider: string
  attempt: number
  nodeId?: string
  result: string
  code?: string
  startedAt?: number
  completedAt?: number
  nextRetryTime?: number
  bindings?: string[]
}

const api = request as CallbackRequest
const path = (id: string) => '/business-application/' + encodeURIComponent(id)
export const getCallbackAuthenticationTypes = () =>
  api.get<CallbackAuthenticationType[]>('/business-application/callback/authentication-types')
export const saveApplicationCallback = (id: string, configuration: BusinessApplicationConfiguration) =>
  api.patch<void>('/business-application', [{ id, configuration }])
export const testApplicationCallback = (id: string) =>
  api.post<CallbackTestResult[]>(path(id) + '/callback/_test', null, { timeout: 65000 })
export const resyncApplicationCallback = (id: string) =>
  api.post<void>(path(id) + '/callback/_resync', null)
export const queryCallbackMembers = (id: string, query: QueryPayload) =>
  api.post<PagerResult<CallbackMemberSnapshot>>(path(id) + '/members/_query', query)
export const queryCallbackRoles = (id: string, query: QueryPayload) =>
  api.post<PagerResult<CallbackRoleSnapshot>>(path(id) + '/roles/_query', query)
export const queryCallbackTasks = (id: string, query: QueryPayload) =>
  api.post<PagerResult<CallbackDeliveryTask>>(path(id) + '/callback/tasks/_query', query)
export const queryCallbackRecords = (id: string, query: QueryPayload) =>
  api.post<PagerResult<CallbackDeliveryRecord>>(path(id) + '/callback/records/_query', query)
export const requeueApplicationCallback = (id: string, taskId: string, expectedAttempt: number) =>
  api.post<boolean>(path(id) + '/callback/tasks/' + encodeURIComponent(taskId) + '/_requeue', { expectedAttempt })
