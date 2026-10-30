import type { HomeFeature, HomeRow } from './types'
type Listener = (rows: HomeRow[] | undefined, failed: boolean, completedAt: number) => void
type Entry = {
  key: HomeFeature
  listeners: Map<Listener, number>
  rows?: HomeRow[]
  failed: boolean
  pending?: Promise<void>
  started?: boolean
  refreshRequested?: boolean
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
    // 同步触发共用尚未发出的请求；写操作后的刷新不能被已经发出的旧查询吞掉。
    entry.started = false
    entry.pending = Promise.resolve().then(() => {
      entry.started = true
      return load(entry.key)
    }).then(rows => ({ rows, failed: false }), () => ({ rows: undefined, failed: true })).then(result => {
      if (entries.get(key) !== entry) return
      entry.pending = undefined
      entry.started = false
      if (entry.refreshRequested) {
        entry.refreshRequested = false
        void run(key, entry)
        return
      }
      entry.rows = result.rows
      entry.failed = result.failed
      entry.completedAt = Date.now()
      entry.listeners.forEach((_, listener) => listener(entry.rows, entry.failed, entry.completedAt))
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
      if (current.completedAt) listener(current.rows, current.failed, current.completedAt)
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
      keys.forEach(source => {
        const key = JSON.stringify([scope, source])
        const entry = entries.get(key)
        if (!entry) return
        // 在途期间多次刷新合并为一次后续查询，离开 scope 后不再补发。
        if (entry.pending && entry.started) entry.refreshRequested = true
        else void run(key, entry)
      })
    },
    dispose() {
      entries.forEach(entry => clearTimeout(entry.timer))
      entries.clear()
    },
  }
}
