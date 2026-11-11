export type RuntimeErrorCode = 'failed' | 'forbidden' | 'unavailable' | 'range' | 'unsupported' | 'identity'
export interface RuntimeState<T> {
  data?: T
  loading: boolean
  error?: RuntimeErrorCode
  updatedAt?: number
  failures: number
  retryAt: number
}
export const emptyRuntimeState = <T>(): RuntimeState<T> => ({ loading: false, failures: 0, retryAt: 0 })


export function runtimeQueryError(error: unknown): { code: RuntimeErrorCode; retryable: boolean } {
  const source = error as { code?: string; status?: number; response?: { status?: number; data?: { status?: number } } }
  const status = Number(source?.response?.status || source?.response?.data?.status || source?.status)
  if (source?.code === 'range') return { code: 'range', retryable: false }
  if (status === 401 || status === 403) return { code: 'forbidden', retryable: false }
  // 400 也可能来自 MBean 采集计划或代理参数；只有明确的 range 错误才提示历史起止时间。
  if (status === 400) return { code: 'failed', retryable: false }
  if (source?.code === 'unsupported') return { code: 'unsupported', retryable: false }
  if (source?.code === 'identity') return { code: 'identity', retryable: false }
  if (status === 404 || source?.code === 'unavailable') return { code: 'unavailable', retryable: false }
  return { code: 'failed', retryable: true }
}

/** 成功零值由 data 保留；失败仅更改状态，不用空数据覆盖同条件旧值。 */
export function rejectRuntimeState<T>(state: RuntimeState<T>, error: unknown, now: number) {
  const failure = runtimeQueryError(error)
  state.error = failure.code
  state.failures++
  state.retryAt = failure.retryable ? now + [60000, 120000, 300000][Math.min(state.failures - 1, 2)] : Infinity
}

/** 实时断流使用秒级退避；历史查询保留原有周期，权限/身份错误不自动重试。 */
export function realtimeRetryAt(error: unknown, failures: number, now: number) {
  const failure = runtimeQueryError(error)
  // 在线节点重连/启动时可能暂时没有代理路由或 MBean，不能永久停在首次 404/未就绪。
  const retryable = failure.retryable || failure.code === 'unavailable' || failure.code === 'unsupported'
  return retryable ? now + Math.min(30000, 2000 * 2 ** Math.min(Math.max(0, failures - 1), 4)) : Infinity
}
