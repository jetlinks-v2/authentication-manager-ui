export type AuthorizationTemplateScene = 'all' | 'personal_token' | 'api_client' | 'application' | 'automation'

export type AuthorizationTemplateType = 'system' | 'tenant' | 'user'

export type AuthorizationTemplateRiskLevel = 'readonly' | 'write' | 'admin'

export type AuthorizationTemplateState = 'draft' | 'enabled' | 'disabled' | 'deprecated'

export type AuthorizationTemplateEnumValue<T extends string = string> = T | {
  text?: string
  label?: string
  value?: T
}

export type ScopePermission = {
  permission: string
  actions: string[]
}

export type GrantScopePermit = {
  id: string
  actions: string[]
}

export type GrantScope = {
  permissions?: GrantScopePermit[]
  dimensions?: Record<string, any>[]
  [key: string]: any
}

export type AuthorizationTemplateItem = {
  id: string
  name: string
  description?: string
  scene: AuthorizationTemplateEnumValue<AuthorizationTemplateScene>
  type: AuthorizationTemplateEnumValue<AuthorizationTemplateType>
  riskLevel: AuthorizationTemplateEnumValue<AuthorizationTemplateRiskLevel>
  state: AuthorizationTemplateEnumValue<AuthorizationTemplateState>
  version?: number
  scope?: GrantScope
  configuration?: Record<string, any>
  createTime?: number
  modifyTime?: number
}

export type AuthorizationTemplateForm = {
  id: string
  name: string
  description?: string
  scene: AuthorizationTemplateScene
  type: AuthorizationTemplateType
  riskLevel: AuthorizationTemplateRiskLevel
  state: AuthorizationTemplateState
  scopePermissions: ScopePermission[]
}
