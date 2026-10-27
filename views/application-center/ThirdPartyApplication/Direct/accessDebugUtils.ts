import type { ApiGroup, ApiGroupGrant, ApiSpec } from '@authentication-manager-ui/api/application-center/apiApplication'
import type { DebugHttpResponse } from '@authentication-manager-ui/api/application-center/applicationDebug'
import { applicationDebugUrl } from '@authentication-manager-ui/api/application-center/applicationDebug'
import { selectedGroupOperations } from '../../ApiApplication/groupGrantUtils'

export type AccessDebugMode = 'token' | 'call' | 'callback'
export interface DebugApi extends ApiSpec {
  method: string; path: string; label: string; tags?: string[];
  provider?: string; group?: string; specification?: string; apiDoc?: string;
}
export interface DebugParameter { name: string; value: string }
export interface DebugToken { value: string; expiresAt: number; scope: string }
export type RunDebugTask = (action: (signal: AbortSignal, current: () => boolean) => Promise<void>) => Promise<void>

export const isJsonBody = (value: string): boolean => {
  try { JSON.parse(value); return true } catch { return false }
}

/** 目录仅提供方法/路径；不虚构参数 Schema，也不把未授权接口混入调试选择。 */
export const grantedDebugApis = (groups: ApiGroup[], grants: ApiGroupGrant[]): DebugApi[] => {
  const granted = selectedGroupOperations(grants)
  const result = new Map<string, DebugApi>()
  for (const group of groups) {
    for (const operation of group.operations || []) {
      if (!granted[group.id]?.includes(operation.id)) continue
      for (const spec of operation.apiDetail || []) {
        const method = spec.method?.toUpperCase()
        if (!operation.apiSpecIds?.includes(spec.id) || !spec.path || !method
          || !['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(method)) continue
        result.set(spec.id, { ...spec, method, path: spec.path,
          label: `${spec.summary || operation.name || group.name} · ${method} ${spec.path}` })
      }
    }
  }
  return [...result.values()]
}

export const pathParameters = (path: string): DebugParameter[] =>
  [...new Set([...path.matchAll(/\{([^{}]+)\}/g)].map(match => match[1]))].map(name => ({ name, value: '' }))

export const apiDebugUrl = (api: DebugApi, parameters: DebugParameter[], query: DebugParameter[]) => {
  let path = api.path
  for (const parameter of parameters) {
    if (!parameter.value.trim()) throw new Error('ThirdPartyApplication.debug.pathRequired')
    path = path.split(`{${parameter.name}}`).join(encodeURIComponent(parameter.value))
  }
  if (/[{}*]/.test(path)) throw new Error('ThirdPartyApplication.debug.unsupportedPath')
  const url = applicationDebugUrl(path)
  for (const parameter of query) {
    if (parameter.name.trim()) url.searchParams.append(parameter.name.trim(), parameter.value)
    else if (parameter.value) throw new Error('ThirdPartyApplication.debug.queryNameRequired')
  }
  return url
}

export const parseDebugToken = (body: string): DebugToken => {
  const value = JSON.parse(body) as { access_token?: unknown; token_type?: unknown; expires_in?: unknown; scope?: unknown }
  if (!value || typeof value.access_token !== 'string' || !value.access_token
    || typeof value.token_type !== 'string' || value.token_type.toLowerCase() !== 'bearer'
    || typeof value.expires_in !== 'number' || !Number.isFinite(value.expires_in) || value.expires_in <= 0) {
    throw new Error('ThirdPartyApplication.debug.invalidTokenResponse')
  }
  return { value: value.access_token, expiresAt: Date.now() + value.expires_in * 1000,
    scope: typeof value.scope === 'string' ? value.scope : '' }
}

export const redactDebugText = (text: string, secrets: string[]) => {
  let result = text
  for (const secret of secrets.filter(Boolean)) {
    result = result.split(secret).join('••••••')
    result = result.split(encodeURIComponent(secret)).join('••••••')
  }
  return result
}

export const displayDebugResponse = (response: DebugHttpResponse, secrets: string[]): DebugHttpResponse => {
  let body = response.body
  // 响应可能是 JSON、文本或空正文；仅展示时排版，不改动请求或验签的原始数据。
  try {
    body = JSON.stringify(JSON.parse(body), (key, value: unknown) =>
      ['accesstoken', 'refreshtoken', 'clientsecret'].includes(key.replace(/[_-]/g, '').toLowerCase()) && typeof value === 'string'
        ? '••••••' : value, 2)
  } catch { /* 非 JSON 保留原文。 */ }
  return { ...response, body: redactDebugText(body, secrets), headers: redactDebugText(response.headers, secrets) }
}
