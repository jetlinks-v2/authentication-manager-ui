import type { HomeRow } from '../shared/types'

export type GuideStatus = 'complete' | 'incomplete' | 'loading' | 'unknown'

export interface GuideRowsState {
  rows: HomeRow[]
  loading: boolean
}

function countOf(rows: HomeRow[], id: string): number | undefined {
  const row = rows.find(item => item.id === id)
  return row && !row.failed && typeof row.value === 'number' && Number.isFinite(row.value) ? row.value : undefined
}

function statusOf(value: number | undefined, loading: boolean): GuideStatus {
  return loading ? 'loading' : value === undefined ? 'unknown' : value > 0 ? 'complete' : 'incomplete'
}

export function resolveGuideStatuses(
  health: GuideRowsState,
  algorithms: GuideRowsState,
  space: GuideRowsState,
  isEdit = false,
): Record<string, GuideStatus> {
  if (isEdit) return { gateway: 'incomplete', device: 'incomplete', space: 'incomplete', algorithm: 'incomplete' }
  const deviceCounts = ['devices', 'video'].map(id => countOf(health.rows, id))
  const device: GuideStatus = health.loading ? 'loading'
    : deviceCounts.some(value => value !== undefined && value > 0) ? 'complete'
    : deviceCounts.every(value => value === 0) ? 'incomplete' : 'unknown'
  return {
    gateway: statusOf(countOf(health.rows, 'gateway'), health.loading),
    device,
    space: statusOf(countOf(space.rows, 'space'), space.loading),
    algorithm: statusOf(countOf(algorithms.rows, 'coverage'), algorithms.loading),
  }
}

export function shouldShowGuide(statuses: Record<string, GuideStatus>): boolean {
  return Object.values(statuses).some(status => status === 'incomplete' || status === 'unknown')
}
