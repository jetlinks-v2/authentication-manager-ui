export const loginMethods = ['wechat', 'dingtalk', 'wecom', 'oauth2'] as const

export type LoginMethod = typeof loginMethods[number]
export type MethodFilter = LoginMethod | 'all'
export type WechatAppType = 'official' | 'mini' | 'open'
export type LoginSearchTerm = { value?: unknown; type?: string; terms?: LoginSearchTerm[] }

export interface LoginConfigDraft {
  method: LoginMethod
  name: string
  displayName: string
  iconDataUrl: string
  wechatAppType: WechatAppType
  appId: string
  corpId: string
  appKey: string
  agentId: string
  authorizationUrl: string
  tokenUrl: string
  userInfoUrl: string
  clientId: string
  secret: string
  scope: string
  userIdField: string
  syncOrganization: boolean
  showOnLogin: boolean
  enabled: boolean
}

export interface LoginConfig extends LoginConfigDraft {
  id: string
  updatedAt: string
}

export function createDraft(method: LoginMethod): LoginConfigDraft {
  return {
    method,
    name: '',
    displayName: '',
    iconDataUrl: '',
    wechatAppType: 'official',
    appId: '',
    corpId: '',
    appKey: '',
    agentId: '',
    authorizationUrl: '',
    tokenUrl: '',
    userInfoUrl: '',
    clientId: '',
    secret: '',
    scope: '',
    userIdField: '',
    syncOrganization: false,
    showOnLogin: false,
    enabled: false,
  }
}

export function identifierOf(config: LoginConfigDraft): string {
  switch (config.method) {
    case 'wechat': return config.appId.trim()
    case 'dingtalk': return config.corpId.trim()
    case 'wecom': return `${config.corpId.trim()}/${config.agentId.trim()}`
    case 'oauth2': return config.clientId.trim()
  }
}

// 第一阶段不接服务端，只允许明显的示例值进入临时内存记录。
export function isExampleSecret(value: string): boolean {
  return /^demo-[a-z0-9_-]{4,}$/i.test(value.trim())
}

export function hasDuplicateIdentifier(
  items: LoginConfig[],
  draft: LoginConfigDraft,
  editingId?: string,
): boolean {
  const identifier = identifierOf(draft).toLowerCase()
  return items.some(item => item.id !== editingId && item.method === draft.method
    && identifierOf(item).toLowerCase() === identifier)
}

export function filterConfigs(items: LoginConfig[], method: MethodFilter, query: string | LoginSearchTerm[]): LoginConfig[] {
  const terms = typeof query === 'string' ? [{ value: query }] : query
  return items.filter(item => (method === 'all' || item.method === method)
    && matchesSearchTerms([item.name, item.displayName, identifierOf(item)].map(value => value.toLowerCase()), terms))
}

function matchesSearchTerms(values: string[], terms: LoginSearchTerm[]): boolean {
  return terms.reduce((matched, term, index) => {
    const current = term.terms
      ? matchesSearchTerms(values, term.terms)
      : values.some(value => value.includes(String(term.value ?? '').trim().toLowerCase()))
    return index === 0 ? current : term.type === 'or' ? matched || current : matched && current
  }, true)
}
