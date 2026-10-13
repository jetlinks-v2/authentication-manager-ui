import type { ApplicationCallbackConfiguration } from '@authentication-manager-ui/api/application-center/businessApplicationCallback'

export interface ApplicationConnectionDraft {
  enabled: boolean
  endpoint: string
  authenticationType: string
  tokenUrl: string
  clientId: string
  clientSecret: string
  clientAuthentication: 'client_secret_basic' | 'client_secret_post'
  scope: string
  timeout: number
}

export const connectionDraftOf = (callback?: ApplicationCallbackConfiguration): ApplicationConnectionDraft => {
  const configuration = callback?.authentication.configuration
  return {
    enabled: !!callback,
    endpoint: callback?.endpoint || '',
    authenticationType: callback?.authentication.type || 'oauth2',
    tokenUrl: String(configuration?.tokenUrl || ''),
    clientId: String(configuration?.clientId || ''),
    clientSecret: '',
    clientAuthentication: configuration?.clientAuthentication === 'client_secret_post' ? 'client_secret_post' : 'client_secret_basic',
    scope: String(configuration?.scope || ''),
    timeout: typeof configuration?.timeout === 'number' ? configuration.timeout : 10,
  }
}

const isHttpUrl = (value: string) => {
  if (!/^https?:[/][/]/i.test(value)) return false
  try { return ['http:', 'https:'].includes(new URL(value).protocol) } catch { return false }
}

export const connectionValidationKey = (draft: ApplicationConnectionDraft, secretConfigured: boolean) => {
  if (!draft.enabled) return ''
  if (draft.authenticationType !== 'oauth2') return 'unsupportedType'
  if (!isHttpUrl(draft.endpoint.trim())) return 'endpointInvalid'
  if (draft.tokenUrl.length > 2048 || !isHttpUrl(draft.tokenUrl.trim())) return 'tokenUrlInvalid'
  if (!draft.clientId.trim() || draft.clientId.length > 256) return 'clientIdInvalid'
  if (!secretConfigured && !draft.clientSecret.trim()) return 'secretRequired'
  if (draft.scope.length > 1024) return 'scopeInvalid'
  if (!Number.isInteger(draft.timeout) || draft.timeout < 1 || draft.timeout > 30) return 'timeoutInvalid'
  return ''
}

/** enabled 只属于前端草稿；未配置时不向后端提交 callback.enabled。 */
export const callbackOfDraft = (draft: ApplicationConnectionDraft): ApplicationCallbackConfiguration | undefined => {
  if (!draft.enabled) return undefined
  return {
    endpoint: draft.endpoint.trim(),
    authentication: {
      type: draft.authenticationType,
      configuration: {
        grantType: 'client_credentials', tokenUrl: draft.tokenUrl.trim(), clientId: draft.clientId.trim(),
        clientAuthentication: draft.clientAuthentication, timeout: draft.timeout,
        ...(draft.scope.trim() ? { scope: draft.scope.trim() } : {}),
        ...(draft.clientSecret.trim() ? { clientSecret: draft.clientSecret } : {}),
      },
    },
  }
}
