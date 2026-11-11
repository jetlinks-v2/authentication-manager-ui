export type ResourceSupplementalKind = 'online' | 'traffic' | 'pools' | 'points' | 'protocols' | 'offline'
export type ResourceSupplementalRange = 'today' | '7d' | '30d' | 'month'
export type ResourceSupplementalTone = 'success' | 'error' | 'default' | 'primary'

export interface ResourceSupplementalRow {
  id: string
  name: string
  value: number
  tone?: ResourceSupplementalTone
}

/** 数量分布行的展示契约；失败值不能被绘制成真实零值。 */
export interface ResourceDistributionBar {
  id: string
  name: string
  color: string
  valueText: string
  percentText: string
  barPercent: number
  failed: boolean
}

export interface ResourcePoolRow {
  id: string
  name: string
  used: number
  total: number
  cards: number
}

export interface ResourceOfflineDevice {
  id: string
  name: string
  description: string
  offlineTime: number
}

export interface ResourceSupplementalData {
  total: number
  series: Array<{ time: string; value: number }>
  rows: ResourceSupplementalRow[]
  pools: ResourcePoolRow[]
  devices: ResourceOfflineDevice[]
}

/** Each panel owns its result; unavailable modules must never borrow another panel's data. */
export const emptySupplementalData = (): ResourceSupplementalData => ({
  total: 0, series: [], rows: [], pools: [], devices: [],
})
