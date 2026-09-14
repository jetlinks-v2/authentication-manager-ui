import { provide, onScopeDispose, type InjectionKey } from 'vue'
import { createHomePolling } from './homePolling'
import { loadHomeRows } from './api'
export const homePollingKey: InjectionKey<ReturnType<typeof createHomePolling>> = Symbol('homePolling')
/** 共享结果仅属于当前概览组件树，不跨页面或项目保留。 */
export function provideHomePolling() {
  const polling = createHomePolling(loadHomeRows)
  provide(homePollingKey, polling)
  onScopeDispose(() => polling.dispose())
}
