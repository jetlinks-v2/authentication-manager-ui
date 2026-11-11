import { request } from '@jetlinks-web/core'

export interface MonitorQueryClient {
  get(path: string): Promise<unknown>
  post(path: string, body: object): Promise<unknown>
}

/** 目录查询复用当前 API/凭证，并在响应返回后再次校验所属页面身份。 */
export function createMonitorQueryClient(isCurrent: () => boolean): MonitorQueryClient {
  async function run(load: () => Promise<unknown>): Promise<unknown> {
    if (!isCurrent()) throw Object.assign(new Error('Stale monitor query'), { code: 'identity' })
    const response = await load()
    if (!isCurrent()) throw Object.assign(new Error('Stale monitor query'), { code: 'identity' })
    if (!response || typeof response !== 'object') throw new Error('Invalid monitor response')
    const row = response as Record<string, unknown>
    if (row.success === false || Number(row.status) >= 400) throw Object.assign(new Error('Monitor query failed'), { status: row.status || 502 })
    return 'result' in row ? row.result : row
  }
  return {
    get: path => run(() => request.get(path, {}, { hiddenError: true, timeout: 15000 })),
    post: (path, body) => run(() => request.post(path, body, { hiddenError: true, timeout: 15000 })),
  }
}
