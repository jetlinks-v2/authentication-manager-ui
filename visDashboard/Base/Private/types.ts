import type { HomeTarget } from '../shared/types'

export type PrivateSource = 'iot' | 'video'
export type PrivateTrendMetric = 'message' | 'ai'
export type PrivateTrendRange = 'today' | '7d'
export interface PrivateStatus { labelKey: string; label?: string; value?: number; tone?: 'success' | 'error' | 'default' }
export interface PrivateMetric {
  id: string
  labelKey: string
  icon: string
  unitKey: string
  value?: number
  yesterday?: number
  statuses?: PrivateStatus[]
  failed?: boolean
  target?: HomeTarget
}
export interface PrivateBreakdown { id: string; labelKey: string; value?: number; offline?: number; failed?: boolean }
export interface PrivateAssetGroup {
  id: PrivateSource
  labelKey: string
  unitKey: string
  total?: number
  online?: number
  offline?: number
  failed?: boolean
  breakdown: PrivateBreakdown[]
  target?: HomeTarget
}
export interface PrivateResources { kpis: PrivateMetric[]; assets: PrivateAssetGroup[] }
export interface PrivateGuideStep {
  id: string
  labelKey: string
  actionKey: string
  state: 'complete' | 'incomplete' | 'unknown'
  value?: number
  next: boolean
  target: HomeTarget
}
export interface PrivateGuideLane { id: PrivateSource; labelKey: string; steps: PrivateGuideStep[] }
export interface PrivateGuide { lanes: PrivateGuideLane[]; complete: number; total: number; show: boolean }
export interface PrivateTrendPoint { timestamp: number; value: number }
export interface PrivateTrendSeries { id: string; labelKey: string; points: PrivateTrendPoint[]; total?: number; failed?: boolean }
export interface PrivateTrend { metric: PrivateTrendMetric; range: PrivateTrendRange; series: PrivateTrendSeries[]; updatedAt: number }
export interface PrivateAlarmLevel { id: string; label: string; value: number; tone: 'high' | 'med' | 'low' }
export interface PrivateAlarmItem {
  id: string
  title: string
  object: string
  time: string
  timestamp?: number
  source: PrivateSource
  level?: string
  tone?: 'high' | 'med' | 'low'
  target: HomeTarget
}
export interface PrivateAlarmSource {
  id: PrivateSource
  pending?: number
  today?: number
  yesterday?: number
  failed?: boolean
  levels: PrivateAlarmLevel[]
  levelsFailed?: boolean
  trend: PrivateTrendPoint[]
  trendFailed?: boolean
  latest: PrivateAlarmItem[]
  latestFailed?: boolean
  target: HomeTarget
}
export interface PrivateAlarms {
  sources: PrivateAlarmSource[]
  pending?: number
  today?: number
  levels: PrivateAlarmLevel[]
  latest: PrivateAlarmItem[]
  updatedAt: number
}
