import type { DashboardModules } from '../../useDashboardModules'
import type { ResourceKind } from '../shared'

export type ResourceCapabilities = Pick<DashboardModules, 'collection' | 'networkCards'>

/** 布局、独立卡片和请求生命周期共用同一准入规则；无业务数据不代表能力缺失。 */
export function resourceKindAvailable(kind: ResourceKind, modules: DashboardModules): boolean {
  switch (kind) {
    case 'EdgeNodes':
    case 'VideoPlaybackTrend': return modules.edge
    case 'AlgorithmCoverage':
    case 'VisionTaskRanking': return modules.edge && modules.vision
    case 'Collection': return modules.collection
    case 'NetworkCards': return modules.networkCards
    default: return true
  }
}
