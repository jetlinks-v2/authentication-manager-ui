import type { HomeRow } from '../shared/types'
import type { DashboardModules } from '../../useDashboardModules'

export type GuideStatus = 'complete' | 'incomplete' | 'loading' | 'unknown'
export type GuideStepKey = 'space' | 'gateway' | 'device' | 'algorithm' | 'alarm' | 'application'

export interface GuideRowsState {
  rows: HomeRow[]
  loading: boolean
  error?: boolean
}

function countOf(rows: HomeRow[], id: string): number | undefined {
  const row = rows.find(item => item.id === id)
  return row && !row.failed && typeof row.value === 'number' && Number.isFinite(row.value) ? row.value : undefined
}

function statusOf(value: number | undefined, loading: boolean): GuideStatus {
  return loading ? 'loading' : value === undefined ? 'unknown' : value > 0 ? 'complete' : 'incomplete'
}

/** 六步分别使用真实业务配置；查询不可用不等同于尚未配置。 */
export function resolveGuideStatuses(
  health: GuideRowsState,
  algorithms: GuideRowsState,
  configuration: GuideRowsState,
  applications: GuideRowsState,
  isEdit = false,
): Record<GuideStepKey, GuideStatus> {
  if (isEdit) return { space: 'incomplete', gateway: 'incomplete', device: 'incomplete', algorithm: 'incomplete', alarm: 'incomplete', application: 'incomplete' }
  const deviceCounts = ['devices', 'video'].map(id => countOf(health.rows, id))
  const device: GuideStatus = health.loading ? 'loading'
    : deviceCounts.some(value => value !== undefined && value > 0) ? 'complete'
    : deviceCounts.every(value => value === 0) ? 'incomplete' : 'unknown'
  return {
    space: statusOf(countOf(configuration.rows, 'space'), configuration.loading),
    gateway: statusOf(countOf(health.rows, 'gateway'), health.loading),
    device,
    algorithm: statusOf(countOf(algorithms.rows, 'coverage'), algorithms.loading),
    alarm: statusOf(countOf(configuration.rows, 'alarm'), configuration.loading),
    application: statusOf(applications.error ? undefined : applications.rows.length, applications.loading),
  }
}

/** 不可用步骤不参与引导完成度；算法覆盖步骤还依赖边缘接入能力。 */
export function guideStepAvailable(key: GuideStepKey, modules: DashboardModules): boolean {
  if (key === 'gateway') return modules.edge
  if (key === 'algorithm') return modules.edge && modules.vision
  if (key === 'alarm') return modules.vision
  return true
}

export function shouldShowGuide(statuses: Partial<Record<GuideStepKey, GuideStatus>>): boolean {
  return Object.values(statuses).some(status => status === 'incomplete' || status === 'unknown')
}
