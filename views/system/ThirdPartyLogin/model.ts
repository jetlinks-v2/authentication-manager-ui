import type {
  ApplicationProvider,
  EnumValue,
  ThirdPartyApplication,
  ThirdPartyApplicationPayload,
} from '@authentication-manager-ui/api/system/thirdPartyLogin'

export const loginMethods = ['wechat', 'dingtalk', 'oauth2'] as const

export type LoginMethod = typeof loginMethods[number]
export type MethodFilter = LoginMethod | 'all'
export type LoginSearchTerm = { value?: unknown; type?: string; terms?: LoginSearchTerm[] }

export interface LoginConfigDraft {
  method: LoginMethod
  name: string
  logoUrl: string
  appId: string
  appKey: string
  authorizationUrl: string
  tokenUrl: string
  userInfoUrl: string
  clientId: string
  secret: string
  scope: string
  userIdField: string
  showOnLogin: boolean
  autoCreateUser: boolean
  usernamePrefix: string
  roleIdList: string[]
  orgIdList: string[]
  enabled: boolean
}

export interface LoginConfig extends LoginConfigDraft {
  id: string
  createdAt: string
}

export function createDraft(method: LoginMethod): LoginConfigDraft {
  return {
    method,
    name: '',
    logoUrl: '',
    appId: '',
    appKey: '',
    authorizationUrl: '',
    tokenUrl: '',
    userInfoUrl: '',
    clientId: '',
    secret: '',
    scope: '',
    userIdField: '',
    showOnLogin: true,
    autoCreateUser: false,
    usernamePrefix: '',
    roleIdList: [],
    orgIdList: [],
    enabled: false,
  }
}

export function identifierOf(config: LoginConfigDraft): string {
  switch (config.method) {
    case 'wechat': return config.appId.trim()
    case 'dingtalk': return config.appKey.trim()
    case 'oauth2': return config.clientId.trim()
  }
}

export function filterConfigs(items: LoginConfig[], method: MethodFilter, query: string | LoginSearchTerm[]): LoginConfig[] {
  const terms = typeof query === 'string' ? [{ value: query }] : query
  return items.filter(item => (method === 'all' || item.method === method)
    && matchesSearchTerms([item.name, identifierOf(item)].map(value => value.toLowerCase()), terms))
}

function matchesSearchTerms(values: string[], terms: LoginSearchTerm[]): boolean {
  return terms.reduce((matched, term, index) => {
    const current = term.terms
      ? matchesSearchTerms(values, term.terms)
      : values.some(value => value.includes(String(term.value ?? '').trim().toLowerCase()))
    return index === 0 ? current : term.type === 'or' ? matched || current : matched && current
  }, true)
}

const wechatProvider: ApplicationProvider = 'wechat-official-account'

const supportedProviders = new Set<ApplicationProvider>([
  wechatProvider,
  'dingtalk-ent-app',
  'third-party',
])

function enumValue(value?: string | EnumValue): string {
  return typeof value === 'string' ? value : value?.value || ''
}

function methodOf(provider: string): LoginMethod | undefined {
  if (provider === wechatProvider) return 'wechat'
  if (provider === 'dingtalk-ent-app') return 'dingtalk'
  if (provider === 'third-party') return 'oauth2'
  return undefined
}

/** 只接入后端已存在的登录 provider，不依赖是否已展示在登录页。 */
export function isSupportedApplication(application: ThirdPartyApplication): boolean {
  if (!supportedProviders.has(application.provider as ApplicationProvider)) return false
  return application.provider !== 'third-party' || application.sso?.configuration.type === 'oauth2'
}

/** 将应用管理实体转换为当前页面的统一展示模型。 */
export function fromApplication(
  application: ThirdPartyApplication,
  includeSecret = false,
): LoginConfig | undefined {
  const method = methodOf(application.provider)
  if (!method) return undefined

  const configuration = application.sso?.configuration || {}
  const oauth2 = configuration.oauth2 || {}
  const timestamp = application.createTime

  return {
    ...createDraft(method),
    id: application.id,
    method,
    name: application.name,
    logoUrl: application.logoUrl || '',
    appId: configuration.appId || '',
    appKey: configuration.appKey || '',
    authorizationUrl: oauth2.authorizationUrl || '',
    tokenUrl: oauth2.tokenUrl || '',
    userInfoUrl: oauth2.userInfoUrl || '',
    clientId: oauth2.clientId || '',
    secret: includeSecret
      ? method === 'oauth2' ? oauth2.clientSecret || '' : configuration.appSecret || ''
      : '',
    scope: method === 'oauth2' ? oauth2.scope || '' : configuration.scope || '',
    userIdField: oauth2.userProperty?.userId || '',
    showOnLogin: (application.integrationModes || [])
      .some(mode => enumValue(mode) === 'ssoClient'),
    autoCreateUser: application.sso?.autoCreateUser ?? false,
    usernamePrefix: application.sso?.usernamePrefix || '',
    roleIdList: [...(application.sso?.roleIdList || [])],
    orgIdList: [...(application.sso?.orgIdList || [])],
    enabled: enumValue(application.state) === 'enabled',
    createdAt: timestamp ? new Date(timestamp).toLocaleString() : '--',
  }
}

/** 构造现有应用管理保存契约，并保留页面未承载的既有 SSO 配置。 */
export function toApplicationPayload(
  draft: LoginConfigDraft,
  current?: ThirdPartyApplication,
): ThirdPartyApplicationPayload {
  const currentSso = current?.sso
  const currentConfiguration = currentSso?.configuration || {}
  let provider: ApplicationProvider
  let configuration = { ...currentConfiguration }
  const integrationModes = (current?.integrationModes || [])
    .map(enumValue)
    .filter(mode => mode && mode !== 'ssoClient')
  if (draft.showOnLogin) integrationModes.push('ssoClient')

  if (draft.method === 'wechat') {
    provider = wechatProvider
    configuration = {
      ...configuration,
      appId: draft.appId.trim(),
      appSecret: draft.secret,
    }
  } else if (draft.method === 'dingtalk') {
    provider = 'dingtalk-ent-app'
    configuration = {
      ...configuration,
      appKey: draft.appKey.trim(),
      appSecret: draft.secret,
    }
  } else {
    provider = 'third-party'
    const currentOauth2 = currentConfiguration.oauth2 || {}
    const userProperty = currentOauth2.userProperty || {}
    configuration = {
      ...configuration,
      type: 'oauth2',
      oauth2: {
        ...currentOauth2,
        authorizationUrl: draft.authorizationUrl.trim(),
        tokenUrl: draft.tokenUrl.trim(),
        userInfoUrl: draft.userInfoUrl.trim(),
        clientId: draft.clientId.trim(),
        clientSecret: draft.secret,
        scope: draft.scope.trim(),
        userProperty: {
          ...userProperty,
          userId: draft.userIdField.trim(),
          username: userProperty.username || draft.userIdField.trim(),
        },
        tokenRequestType: currentOauth2.tokenRequestType || 'POST_BODY',
      },
    }
  }

  const sso = {
    ...currentSso,
    configuration,
    autoCreateUser: draft.autoCreateUser,
    roleIdList: [...draft.roleIdList],
    orgIdList: [...draft.orgIdList],
  }
  const usernamePrefix = draft.usernamePrefix.trim()
  if (usernamePrefix) sso.usernamePrefix = usernamePrefix
  else delete sso.usernamePrefix

  return {
    name: draft.name.trim(),
    provider,
    logoUrl: draft.logoUrl || undefined,
    description: current?.description,
    integrationModes,
    sso,
    state: draft.enabled ? 'enabled' : 'disabled',
    configurations: current?.configurations,
    group: current?.group,
    code: current?.code,
  }
}
