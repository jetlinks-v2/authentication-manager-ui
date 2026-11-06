export interface VisionTrendGateway { id: string; name: string; online: boolean; local?: boolean }
export interface VisionTrendSource {
  key: string
  taskId: string
  average: number | null
  p95: number | null
  count: number | null
  success: number | null
  runningTime: number | null
  firstInferenceTime: number | null
}
export interface VisionTrendSnapshot {
  collectedAt: number
  sources: VisionTrendSource[]
  bindings: { taskId: string; skillId: string }[]
}
export interface VisionReviewSnapshot {
  collectedAt: number
  pending: { taskId: string; skillId: string; value: number; time: number }[]
}
export type VisionTrendSample = { kind: 'cv'; snapshot: VisionTrendSnapshot }
  | { kind: 'review'; snapshot?: VisionReviewSnapshot; error?: 'unsupported' | 'failed' }
export interface VisionTrendTask { value: string; label: string }
export interface VisionTrendPoint {
  time: number
  average: number | null
  p95: number | null
  sources: number
  success: number | null
  pending: number | null
}
export const VISION_TREND_BEAN = 'org.jetlinks:type=MonitorMetric,name=ZLMediaAiTask'
export const VISION_REVIEW_BEAN = 'org.jetlinks:type=MonitorMetric,name=AgentRuntimeReview'
export const VISION_TREND_METRICS = ['latency', 'pending', 'success'] as const
export type VisionTrendMetric = typeof VISION_TREND_METRICS[number]
export const VISION_TREND_INTERVALS = [1, 2, 5] as const
export type VisionTrendInterval = typeof VISION_TREND_INTERVALS[number]
