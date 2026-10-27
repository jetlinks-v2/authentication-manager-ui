import { effectScope, watch, type EffectScope } from 'vue'
import { wsClient } from '@jetlinks-web/core'
import { getRequestHeaders } from '@jetlinks-web-core/utils/request-context'
import { getAnnouncementReadScope, notifyAnnouncementChanges } from './localReadStore'
import { disposeAnnouncementRealtimeDialogs } from './realtimeNotification'
import { queryAnnouncementInboxNoPaging } from './receivedDataSource'

type Listener = (payload: Record<string, any>) => void
const listeners = new Set<Listener>()
let subscription: { unsubscribe: () => void } | undefined
let scope: EffectScope | undefined
let context = ''
let generation = 0

// 确认记录跨项目共用，连接仍须按当前凭证及项目上下文隔离；此值只保存在内存。
const getContext = () => {
  const scope = getAnnouncementReadScope()
  const headers = Object.entries(getRequestHeaders()).filter(([key]) => !key.toLowerCase().startsWith('x-verify-'))
  return scope ? JSON.stringify([scope, headers]) : ''
}

const release = () => {
  generation++
  subscription?.unsubscribe()
  subscription = undefined
}

const connect = (force = false) => {
  const next = getContext()
  if (!force && next === context) return
  if (next !== context) disposeAnnouncementRealtimeDialogs()
  release()
  context = next
  if (!next) return
  const current = generation
  subscription = wsClient.getWebSocket(`system-bulletin-${generation}`, '/system/bulletin/received', {})
    .subscribe(async message => {
      const id = message.payload?.id
      // 旧身份迟到的帧不能刷新或打开当前身份的公告。
      if (current !== generation || next !== getContext() || !id) return
      // 共享连接握手身份可能早于项目/账号切换，只展示当前 HTTP 会话重新确认可见的批次。
      try {
        const response = await queryAnnouncementInboxNoPaging({
          paging: false,
          terms: [{ column: 'id', termType: 'eq', value: id }],
        })
        if (current !== generation || next !== getContext()) return
        notifyAnnouncementChanges()
        const payload = response.success && response.result?.find((record: Record<string, any>) => record.id === id)
        if (payload) listeners.forEach(listener => listener(payload))
      } catch {
        // 资格查询失败时保留后续列表查询入口，不展示未核实的 WebSocket 内容。
      }
    })
}

const checkContext = () => connect()
const onOnline = () => connect(true)
const contextEvents = ['storage', 'hashchange', 'popstate', 'focus'] as const

/** 所有顶栏消费者共享一个逻辑订阅，最后一个卸载时释放真实 RxJS Subscription。 */
export const subscribeAnnouncementRealtime = (listener: Listener) => {
  listeners.add(listener)
  if (listeners.size === 1) {
    scope = effectScope(true)
    scope.run(() => watch(getContext, checkContext, { immediate: true, flush: 'sync' }))
    contextEvents.forEach(event => window.addEventListener(event, checkContext))
    window.addEventListener('online', onOnline)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size) return
    scope?.stop()
    scope = undefined
    contextEvents.forEach(event => window.removeEventListener(event, checkContext))
    window.removeEventListener('online', onOnline)
    release()
    disposeAnnouncementRealtimeDialogs()
    context = ''
  }
}
