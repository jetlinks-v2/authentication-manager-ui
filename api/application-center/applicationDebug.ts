import { getRequestBaseApi, getRequestTenantDomain } from '@jetlinks-web-core/utils/request-context'
import { request } from '@jetlinks-web/core'
import type { AxiosResponseRewrite } from '@jetlinks-web/types'

export interface DebugApiResource { id: string; type: string; resource: string }
const documentationRequest = request as { get<T>(url: string): Promise<AxiosResponseRewrite<T>> }

// 文档元数据走管理会话；真实调试请求仍只携带应用身份。
export const queryDebugApiResources = (appId: string): Promise<AxiosResponseRewrite<DebugApiResource[]>> =>
  documentationRequest.get<DebugApiResource[]>(`/open/api/spec/${encodeURIComponent(appId)}/expands/_query`)

export interface DebugHttpResponse {
  status: number
  ok: boolean
  elapsed: number
  body: string
  headers: string
}

/** 只使用当前平台 API 地址；接口目录和表单输入均不能切换到任意外部主机。 */
export const applicationDebugUrl = (path: string): URL => {
  const base = new URL(getRequestBaseApi() || '/', window.location.origin)
  if (!/^https?:$/.test(base.protocol) || base.username || base.password || base.search || base.hash
    || !path.startsWith('/') || path.startsWith('//') || /[\\?#\s]/.test(path)) {
    throw new Error('ThirdPartyApplication.debug.invalidAddress')
  }
  const prefix = base.pathname.replace(/\/+$/, '') + '/'
  const target = new URL(prefix + path.slice(1), base.origin)
  if (target.origin !== base.origin || !target.pathname.startsWith(prefix)) {
    throw new Error('ThirdPartyApplication.debug.invalidAddress')
  }
  return target
}

export interface DebugHttpRequest {
  url: URL
  method: string
  token?: string
  body?: string | URLSearchParams
  contentType?: string
  signal: AbortSignal
}

/** 管理请求会强制注入登录态；调试单独传输，仅允许应用 Bearer 身份与租户路由头。 */
export const sendApplicationDebugRequest = async (request: DebugHttpRequest): Promise<DebugHttpResponse> => {
  const headers = new Headers({ Accept: 'application/json' })
  const domain = getRequestTenantDomain()
  if (domain) headers.set('X-Tenant-Domain', domain)
  if (request.token) headers.set('Authorization', `Bearer ${request.token}`)
  if (request.contentType) headers.set('Content-Type', request.contentType)
  const start = performance.now()
  const response = await fetch(request.url, {
    method: request.method, headers, body: request.body, signal: request.signal,
    credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer',
  })
  const body = await response.text()
  return {
    status: response.status, ok: response.ok, elapsed: Math.round(performance.now() - start), body,
    headers: [...response.headers.entries()].map(([name, value]) => `${name}: ${value}`).join('\n'),
  }
}
