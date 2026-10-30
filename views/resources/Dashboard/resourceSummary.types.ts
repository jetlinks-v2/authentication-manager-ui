import type { HomeTarget } from '../../../visDashboard/Base/shared/types'

export type ResourceSummaryId = 'edge' | 'iot' | 'video' | 'networkCards' | 'collection' | 'visualization' | 'product' | 'message' | 'aiEvents'
export type VisualizationSummaryKey = 'image' | 'component' | 'model' | 'template'

/** 指标缺失保留 undefined；failed 与真实的零值分别展示。 */
export interface ResourceSummaryStatus {
  key: string
  labelKey: string
  value?: number
  failed?: boolean
  tone?: 'success' | 'error' | 'default'
}

export interface ResourceSummaryCard {
  id: ResourceSummaryId
  labelKey: string
  unitKey: string
  icon: string
  target?: HomeTarget
  value?: number
  failed?: boolean
  statuses: ResourceSummaryStatus[]
}
