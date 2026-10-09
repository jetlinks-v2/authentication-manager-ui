import { request } from '@jetlinks-web/core'
import type { AxiosResponseRewrite } from '@jetlinks-web/types'
import type { Pager, QueryPayload } from './apiApplication'

interface SubscriptionRequest {
  get<T>(url: string): Promise<AxiosResponseRewrite<T>>
  post<T>(url: string, data?: unknown): Promise<AxiosResponseRewrite<T>>
  put<T>(url: string, data?: unknown): Promise<AxiosResponseRewrite<T>>
  remove<T>(url: string): Promise<AxiosResponseRewrite<T>>
}

export interface SubscriptionScope {
  eventTypes: string[]
  configuration: Record<string, unknown>
}

export interface SubscriptionConfiguration {
  name: string
  description?: string
  scopes: SubscriptionScope[]
  channelProvider?: string
  channelConfiguration: Record<string, unknown>
}

export interface SubscriptionIssue {
  field: string
  code: string
  message: string
}

export interface SubscriptionValidation {
  valid: boolean
  issues: SubscriptionIssue[]
}

export interface ApplicationSubscription extends SubscriptionConfiguration {
  id: string
  applicationId: string
  state: 'enabled' | 'disabled'
  executionState: 'notRunning' | 'starting' | 'running' | 'failed'
  createTime?: number
  modifyTime?: number
  validation: SubscriptionValidation
}

export interface SubscriptionEvent {
  id: string
  name: string
  description?: string
  version?: string
  schema?: Record<string, unknown>
}

export interface SubscriptionMetadataProperty {
  id: string
  name?: string
  description?: string
  valueType?: { type?: string; [key: string]: unknown }
  expands?: Record<string, unknown>
}

export interface SubscriptionChannel {
  id: string
}

const api = request as SubscriptionRequest
const root = (applicationId: string) => `/application/${encodeURIComponent(applicationId)}/subscriptions`
const item = (applicationId: string, id: string) => `${root(applicationId)}/${encodeURIComponent(id)}`

export const querySubscriptions = (applicationId: string, query: QueryPayload) =>
  api.post<Pager<ApplicationSubscription>>(`${root(applicationId)}/_query`, query)
export const getSubscription = (applicationId: string, id: string) =>
  api.get<ApplicationSubscription>(item(applicationId, id))
export const createSubscription = (applicationId: string, data: SubscriptionConfiguration) =>
  api.post<string>(root(applicationId), data)
export const updateSubscription = (applicationId: string, id: string, data: SubscriptionConfiguration) =>
  api.put<number>(item(applicationId, id), data)
export const enableSubscription = (applicationId: string, id: string) =>
  api.post<number>(`${item(applicationId, id)}/_enable`)
export const disableSubscription = (applicationId: string, id: string) =>
  api.post<number>(`${item(applicationId, id)}/_disable`)
export const deleteSubscription = (applicationId: string, id: string) =>
  api.remove<number>(item(applicationId, id))
export const validateSubscription = (applicationId: string, data: SubscriptionConfiguration) =>
  api.post<SubscriptionValidation>(`${root(applicationId)}/_validate`, data)
export const querySubscriptionEvents = (applicationId: string) =>
  api.get<SubscriptionEvent[]>(`${root(applicationId)}/events`)
export const querySubscriptionChannels = (applicationId: string) =>
  api.get<SubscriptionChannel[]>(`${root(applicationId)}/channels`)
