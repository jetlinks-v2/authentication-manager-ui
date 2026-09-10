export const kinds = ['EdgeNodes', 'IotDevices', 'VideoDevices', 'Visualization', 'QuickStart', 'MessageTrend', 'Collection', 'NetworkCards', 'DeviceDistribution'] as const
export type ResourceKind = typeof kinds[number]
export type DeviceKind = 'edge' | 'iot' | 'video'
export type TimeRange = 'today' | 'yesterday' | '3d' | '7d' | '30d'
export interface ResourceConfig {
  title: string
  refreshSeconds: number
  deviceType: DeviceKind
  timeRange: TimeRange
  limit: number
}
export interface ResourceInfo {
  type?: string
  componentProps?: Record<string, unknown>
}
export interface Metric { key: string; value?: number; failed?: boolean }
export interface Datum { id: string; name: string; value: number }
export interface ResourceData {
  metrics: Metric[]
  distribution: Datum[]
  series: { time: string; value: number }[]
  ranking: Datum[]
  rankingFailed?: boolean
}
export const typeOf = (kind: ResourceKind) => `resourceCenter${kind}`
export const emptyData = (): ResourceData => ({ metrics: [], distribution: [], series: [], ranking: [] })
export const defaultSettings: ResourceConfig = { title: '', refreshSeconds: 60, deviceType: 'iot', timeRange: 'today', limit: 8 }

/** 归一化画布配置；刷新下限避免误配置产生高频请求，0 表示不自动刷新。 */
export function settingsOf(kind: ResourceKind, info?: ResourceInfo): ResourceConfig {
  const value = info?.componentProps?.[typeOf(kind)]
  const raw = value && typeof value === 'object' ? value as Partial<ResourceConfig> : {}
  const seconds = Number(raw.refreshSeconds ?? 60)
  return {
    title: typeof raw.title === 'string' ? raw.title : '',
    refreshSeconds: Number.isFinite(seconds) ? (seconds === 0 ? 0 : Math.min(3600, Math.max(15, seconds))) : 60,
    deviceType: ['edge', 'iot', 'video'].includes(raw.deviceType || '') ? raw.deviceType! : 'iot',
    timeRange: ['today', 'yesterday', '3d', '7d', '30d'].includes(raw.timeRange || '') ? raw.timeRange! : 'today',
    limit: Math.min(50, Math.max(1, Math.floor(Number(raw.limit) || 8))),
  }
}
