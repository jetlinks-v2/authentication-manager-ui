export type ResourceSupplementalKind = 'online' | 'traffic' | 'pools' | 'points' | 'protocols' | 'offline'
export type ResourceSupplementalRange = 'today' | '7d' | '30d' | 'month'
export type ResourceSupplementalTone = 'success' | 'error' | 'default' | 'primary'

export interface ResourceSupplementalRow {
  id: string
  name: string
  value: number
  tone?: ResourceSupplementalTone
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
