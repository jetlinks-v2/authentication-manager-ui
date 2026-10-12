import { request } from '@jetlinks-web/core'

/** 接收统一表格的取消信号，切换条件时终止旧的 HTTP 查询。 */
export const queryAccess = (data: object, context?: { signal: AbortSignal }) =>
    request.post(`/logger/access/_query`, data, { signal: context?.signal });

/** 系统日志沿用相同的表格请求生命周期。 */
export const querySystem = (data: object, context?: { signal: AbortSignal }) =>
    request.post(`/logger/system/_query`, data, { signal: context?.signal });
