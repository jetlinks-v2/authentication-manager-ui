import { request } from '@jetlinks-web/core'
import type { AxiosResponseRewrite } from '@jetlinks-web/types'
import type { SubscriptionMetadataProperty } from './applicationSubscription'

interface CredentialRequest {
  get<T>(url: string): Promise<AxiosResponseRewrite<T>>
  put<T>(url: string, data?: unknown): Promise<T>
  post<T>(url: string, data?: unknown): Promise<T>
}

export interface CredentialProvider {
  type: string
  tokenEndpoint?: string
  grantType?: string
  clientAuthMethods?: string[]
  configMetadata?: { properties?: SubscriptionMetadataProperty[] }
  features?: string[]
}

export interface ApplicationCredential {
  type: string
  state: string
  clientId?: string
  tokenEndpoint?: string
  grantType?: string
  clientAuthMethods?: string[]
  secretHint?: string
  configuration?: Record<string, unknown>
  features?: string[]
}

export interface CredentialSecret extends ApplicationCredential {
  clientSecret: string
}

const api = request as CredentialRequest
const root = (applicationId: string) => `/application/${encodeURIComponent(applicationId)}/credentials`
const item = (applicationId: string, type: string) => `${root(applicationId)}/${encodeURIComponent(type)}`

export const queryCredentialProviders = () => api.get<CredentialProvider[]>('/application/credentials/providers')
export const queryCredentials = (applicationId: string) => api.get<ApplicationCredential[]>(root(applicationId))
export const enableCredential = (applicationId: string, type: string, configuration: Record<string, unknown>) =>
  api.put<CredentialSecret>(item(applicationId, type), { configuration })
export const revealCredential = (applicationId: string, type: string) =>
  api.post<CredentialSecret>(`${item(applicationId, type)}/_reveal`)
export const rotateCredential = (applicationId: string, type: string) =>
  api.post<CredentialSecret>(`${item(applicationId, type)}/_rotate`)
export const revokeCredential = (applicationId: string, type: string) =>
  api.put<void>(`${item(applicationId, type)}/_revoke`)
