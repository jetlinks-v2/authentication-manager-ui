import { createNdJson } from '@jetlinks-web/core'
import { getRequestBaseApi, getRequestHeaders } from '@jetlinks-web-core/utils/request-context'
import { langKey } from '@jetlinks-web-core/utils/consts'

/** 沿用平台的分包解码、取消与身份上下文，订阅销毁只释放本页请求。 */
export const createDiagnosticsStream = (onRequest?: () => void, url?: string) => createNdJson({
  langKey,
  handleRequest(config) {
    const headers = new Headers(config.headers)
    Object.entries(getRequestHeaders({ url })).forEach(([key, value]) => headers.set(key, value))
    headers.set('Accept', 'application/x-ndjson')
    // 仅表示本页请求已配置、开始等待响应；不声称远端Recording已经启动。
    onRequest?.()
    return { ...config, baseURL: getRequestBaseApi(), headers }
  },
})

/** 流可返回原始记录或平台信封，失败不能变成正常空快照。 */
export function unwrapDiagnosticRecord<T>(value: unknown): T {
  if (value && typeof value === 'object' && 'success' in value) {
    const envelope = value as { success?: boolean; result?: unknown; message?: string; status?: number }
    if (envelope.success === false) throw Object.assign(new Error(envelope.message || 'Diagnostic request failed'), { status: envelope.status })
    return envelope.result as T
  }
  return value as T
}
