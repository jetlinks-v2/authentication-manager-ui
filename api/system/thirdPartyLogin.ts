import { request } from '@jetlinks-web/core'
import type { AxiosResponseRewrite } from '@jetlinks-web/types'

export type ApplicationProvider =
  | 'wechat-official-account'
  | 'dingtalk-ent-app'
  | 'third-party'

export interface EnumValue {
  value: string
  text?: string
}

export interface OAuth2UserProperty {
  userId?: string
  username?: string
  name?: string
  avatar?: string
  email?: string
  telephone?: string
  description?: string
}

export interface OAuth2Configuration {
  authorizationUrl?: string
  redirectUri?: string
  clientId?: string
  clientSecret?: string
  userInfoUrl?: string
  scope?: string
  userProperty?: OAuth2UserProperty
  grantType?: string
  tokenUrl?: string
  accessTokenProperty?: string
  tokenRequestType?: string
}

export interface SsoConfiguration {
  type?: string
  appId?: string
  appKey?: string
  appSecret?: string
  oauth2?: OAuth2Configuration
  scope?: string
  followRequire?: boolean
  token?: string
  aesKey?: string
  [key: string]: unknown
}

export interface ApplicationSsoConfig {
  configuration: SsoConfiguration
  autoCreateUser?: boolean
  usernamePrefix?: string
  roleIdList?: string[]
  orgIdList?: string[]
  defaultPasswd?: string
  [key: string]: unknown
}

export interface ThirdPartyApplication {
  id: string
  name: string
  provider: string
  logoUrl?: string
  description?: string
  integrationModes?: Array<string | EnumValue>
  sso?: ApplicationSsoConfig
  state?: string | EnumValue
  configurations?: Record<string, unknown>
  group?: unknown
  code?: string
  createTime?: number
  modifyTime?: number
}

export interface ThirdPartyApplicationPayload {
  name: string
  provider: ApplicationProvider
  logoUrl?: string
  description?: string
  integrationModes: string[]
  sso: ApplicationSsoConfig
  state?: 'enabled' | 'disabled'
  configurations?: Record<string, unknown>
  group?: unknown
  code?: string
}

export interface PagerResult<T> {
  data: T[]
  total: number
  pageIndex: number
  pageSize: number
}

export interface SystemPaths {
  'base-path'?: string
}

/** 查询全部应用，页面侧再按现有第三方 SSO provider 收敛范围。 */
export const queryThirdPartyApplications = () => request.post(
  '/application/_query',
  { pageIndex: 0, pageSize: 1000, sorts: [{ name: 'createTime', order: 'desc' }] },
) as Promise<AxiosResponseRewrite<PagerResult<ThirdPartyApplication>>>

/** 获取应用完整配置，编辑时用于保留页面未承载的既有 SSO 字段。 */
export const getThirdPartyApplication = (id: string) =>
  request.get(`/application/${id}`) as Promise<AxiosResponseRewrite<ThirdPartyApplication>>

/** 使用现有应用管理资源创建 SSO 应用。 */
export const createThirdPartyApplication = (data: ThirdPartyApplicationPayload) =>
  request.post('/application', data) as Promise<AxiosResponseRewrite<ThirdPartyApplication>>

/** 使用现有应用管理资源更新 SSO 应用。 */
export const updateThirdPartyApplication = (id: string, data: Partial<ThirdPartyApplicationPayload>) =>
  request.put(`/application/${id}`, data) as Promise<AxiosResponseRewrite<boolean>>

/** 删除应用及其现有 SSO 配置。 */
export const deleteThirdPartyApplication = (id: string) =>
  request.remove(`/application/${id}`) as Promise<AxiosResponseRewrite<ThirdPartyApplication>>

/** 现有应用管理通过局部更新 state 启停应用。 */
export const updateThirdPartyApplicationState = (id: string, state: 'enabled' | 'disabled') =>
  request.put(`/application/${id}`, { state }) as Promise<AxiosResponseRewrite<boolean>>

/** 读取服务端对外访问基地址，用于生成第三方平台回调地址。 */
export const getSystemPaths = () =>
  request.get('/system/config/paths') as Promise<AxiosResponseRewrite<SystemPaths>>
