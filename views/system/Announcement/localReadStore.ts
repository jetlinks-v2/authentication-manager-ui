import { useUserStore } from '@jetlinks-web-core/store/user'
import { getRequestBaseApi } from '@jetlinks-web-core/utils/request-context'

const STORAGE_PREFIX = 'jetlinks:bulletin-confirmation:v1:'
const listeners = new Set<() => void>()
let storageRefreshTimer: ReturnType<typeof setTimeout> | undefined
const batchPrefix = (scope: string) => `${scope}:batch:`

/** 服务和真实认证用户共同隔离确认记录；项目切换不拆分同一用户的平台公告确认。 */
export const getAnnouncementReadScope = () => {
  const userId = useUserStore().userInfo.id
  if (!userId) return ''
  const service = new URL(getRequestBaseApi() || '/', window.location.origin).href.replace(/\/+$/, '')
  return `${STORAGE_PREFIX}${encodeURIComponent(service)}:${encodeURIComponent(userId)}`
}

export const getAnnouncementReadIds = (scope = getAnnouncementReadScope()): string[] => {
  if (!scope) return []
  let legacy: unknown
  try {
    legacy = JSON.parse(localStorage.getItem(scope) || '[]')
  } catch {
    legacy = []
  }
  const confirmed = new Set<string>(Array.isArray(legacy)
    ? legacy.filter((id): id is string => typeof id === 'string' && !!id) : [])
  const prefix = batchPrefix(scope)
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index)
    if (!key?.startsWith(prefix)) continue
    const id = key.slice(prefix.length)
    const state = localStorage.getItem(key)
    if (state === 'read') confirmed.add(id)
    else if (state === 'unread') confirmed.delete(id)
  }
  return [...confirmed]
}

const notifyChanges = () => {
  clearTimeout(storageRefreshTimer)
  storageRefreshTimer = undefined
  listeners.forEach(listener => listener())
}

/** 每发布批次独立写入，避免其他标签页确认不同公告时互相覆盖；显式未读覆盖原集合。 */
export const changeAnnouncementLocalState = (
  type: '_read' | '_unread',
  ids: string[],
  scope = getAnnouncementReadScope(),
) => {
  if (!scope) return
  const prefix = batchPrefix(scope)
  new Set(ids.filter(Boolean)).forEach(id => {
    localStorage.setItem(`${prefix}${id}`, type === '_read' ? 'read' : 'unread')
  })
  notifyChanges()
}

const onStorage = (event: StorageEvent) => {
  const scope = getAnnouncementReadScope()
  if ((event.storageArea === null || event.storageArea === localStorage)
    && (event.key === null || (scope && (event.key === scope || event.key.startsWith(batchPrefix(scope)))))) {
    // 批量确认产生多条 storage 事件，合并为一次接收列表及统计刷新。
    clearTimeout(storageRefreshTimer)
    storageRefreshTimer = setTimeout(notifyChanges, 30)
  }
}

/** 同页确认与其他标签页的写入/清空使用相同通知通道，最后一个订阅释放浏览器监听。 */
export const subscribeAnnouncementReadChanges = (listener: () => void) => {
  if (!listeners.size) window.addEventListener('storage', onStorage)
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (!listeners.size) {
      window.removeEventListener('storage', onStorage)
      clearTimeout(storageRefreshTimer)
      storageRefreshTimer = undefined
    }
  }
}
