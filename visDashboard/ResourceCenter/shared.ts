export type TimeRange = 'today' | 'yesterday' | '3d' | '7d' | '30d'
export interface ResourceConfig {
  title: string
  refreshSeconds: number
  limit: number
}
export interface ResourceInfo {
  type?: string
  componentProps?: Record<string, unknown>
}
export interface Metric { key: string; value?: number; failed?: boolean }
export const defaultSettings: ResourceConfig = { title: '', refreshSeconds: 60, limit: 8 }

/** 节点与任务排行沿用已有配置键；刷新下限避免误配置产生高频请求，0 表示不自动刷新。 */
export function settingsOf(kind: 'VideoPlaybackTrend' | 'VisionTaskRanking', info?: ResourceInfo): ResourceConfig {
  const value = info?.componentProps?.[`resourceCenter${kind}`]
  const raw = value && typeof value === 'object' ? value as Partial<ResourceConfig> : {}
  const seconds = Number(raw.refreshSeconds ?? 60)
  return {
    title: typeof raw.title === 'string' ? raw.title : '',
    refreshSeconds: Number.isFinite(seconds) ? (seconds === 0 ? 0 : Math.min(3600, Math.max(15, seconds))) : 60,
    limit: Math.min(50, Math.max(1, Math.floor(Number(raw.limit) || 8))),
  }
}
