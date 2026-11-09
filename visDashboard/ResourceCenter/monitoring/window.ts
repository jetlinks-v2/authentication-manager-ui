export interface RealtimeWindowAdapter<T> { time(value: T): number; gap(time: number): T }
export const REALTIME_WINDOW_MS = 60000
export const REALTIME_WINDOW_POINTS = 61

/** 两张实时卡片共用一分钟窗口；暂停和缺测保留断点，不补零。 */
export function appendRealtimeWindow<T>(points: T[], point: T, intervalMs: number, adapter: RealtimeWindowAdapter<T>, interrupted = false): T[] {
  const time = adapter.time(point), last = points.at(-1), lastTime = last === undefined ? undefined : adapter.time(last)
  if (lastTime !== undefined && time <= lastTime) return points
  const next = points.filter(value => adapter.time(value) >= time - REALTIME_WINDOW_MS)
  if (lastTime !== undefined && (interrupted || time - lastTime > intervalMs * 3)) next.push(adapter.gap(lastTime + Math.min(intervalMs, (time - lastTime) / 2)))
  next.push(point)
  return next.filter(value => adapter.time(value) >= time - REALTIME_WINDOW_MS).slice(-REALTIME_WINDOW_POINTS)
}

/** 横轴从当前页面首个样本起展开，单点只留一秒范围，避免预留打开前的空白。 */
export function realtimeWindowBounds(start?: number, end?: number) {
  const min = start !== undefined && end !== undefined ? Math.max(start, end - REALTIME_WINDOW_MS) : start
  return { min, max: min !== undefined && end !== undefined ? Math.max(end, min + 1000) : end }
}
