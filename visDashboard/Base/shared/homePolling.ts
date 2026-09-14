import type { HomeFeature, HomeRow } from './types'
type Listener = (rows: HomeRow[] | undefined, failed: boolean) => void
type Entry = {
  key: HomeFeature
  listeners: Map<Listener, number>
  rows?: HomeRow[]
  failed: boolean
  pending?: Promise<void>
  timer?: ReturnType<typeof setTimeout>
  completedAt: number
}
/** 页面范围内共享数据源，按消费者的最短周期刷新；最后一个消费者离开即释放。 */
export function createHomePolling(load: (key: HomeFeature) => Promise<HomeRow[]>) {
  const entries = new Map<string, Entry>()
  const schedule = (key: string, entry: Entry) => {
    clearTimeout(entry.timer)
    if (!entry.listeners.size || entry.pending) return
    const interval = Math.min(...entry.listeners.values())
    if (!Number.isFinite(interval)) return
    const delay = Math.max(0, entry.completedAt + interval - Date.now())
    entry.timer = setTimeout(() => { void run(key, entry) }, delay)
  }
  const run = (key: string, entry: Entry): Promise<void> => {
    if (entry.pending) return entry.pending
    clearTimeout(entry.timer)
    // 同步订阅和重试共用在途请求，失效响应不得写入重新创建的订阅。
    entry.pending = Promise.resolve().then(() => load(entry.key)).then(rows => {
      entry.rows = rows; entry.failed = false
    }, () => {
      entry.rows = undefined; entry.failed = true
    }).then(() => {
      if (entries.get(key) !== entry) return
      entry.completedAt = Date.now()
      entry.pending = undefined
      entry.listeners.forEach((_, listener) => listener(entry.rows, entry.failed))
      schedule(key, entry)
    })
    return entry.pending
  }
  return {
    subscribe(source: HomeFeature, interval: number, listener: Listener, scope = '') {
      const key = JSON.stringify([scope, source])
      let entry = entries.get(key)
      if (!entry) {
        entry = { key: source, listeners: new Map(), failed: false, completedAt: 0 }
        entries.set(key, entry)
      }
      const current = entry
      current.listeners.set(listener, interval === 0 ? Infinity : Math.max(5, interval || 60) * 1000)
      if (current.completedAt) listener(current.rows, current.failed)
      if (!current.completedAt) void run(key, current)
      else schedule(key, current)
      return () => {
        current.listeners.delete(listener)
        if (!current.listeners.size) {
          clearTimeout(current.timer)
          if (entries.get(key) === current) entries.delete(key)
        } else schedule(key, current)
      }
    },
    refresh(keys: HomeFeature[], scope = '') {
      keys.forEach(source => { const key = JSON.stringify([scope, source]); const entry = entries.get(key); if (entry) void run(key, entry) })
    },
    dispose() {
      entries.forEach(entry => clearTimeout(entry.timer))
      entries.clear()
    },
  }
}
