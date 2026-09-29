import { ndJson, request } from '@jetlinks-web/core'
import type { AxiosResponseRewrite } from '@jetlinks-web/types'
import type { Observable } from 'rxjs'

export interface AccountBindingApplication {
  id: string
  name: string
  provider: string
  bound: boolean
  applicationUserId?: string
}

export type AccountBindingEvent =
  | { type: 'init'; result: string }
  | { type: 'processing' }
  | { type: 'success'; result: { bound: boolean; userId?: string } }
  | { type: 'failed'; message?: string }

export const getAccountBindings = (): Promise<AxiosResponseRewrite<AccountBindingApplication[]>> =>
  request.get('/application/sso/me/bindings')

/** 绑定当前账号时显式禁止自动开户；签名绑定令牌由后端生成。 */
export const startAccountBinding = (appId: string): Observable<AccountBindingEvent> =>
  ndJson.get(
    `/application/sso/${encodeURIComponent(appId)}/login/_async?forBind=true&autoCreateUser=false`,
  )
