import type { DashboardModules } from '../../../visDashboard/useDashboardModules'
import type { HomeFeature } from '../../../visDashboard/Base/shared/types'
import { homeFeatureAvailable } from '../../../visDashboard/Base/shared/resources'

export type OverviewLayoutItem = readonly [HomeFeature, number, number, number, number]
type RowItem = readonly [HomeFeature, number, number]
export interface OverviewLayoutOptions {
  saas: boolean
  modules: DashboardModules
  showGuide: boolean
  guideAvailable: boolean
}

/** 保留概览原有分区；移除不可用卡后按原同行宽度比例补齐，后续行紧接前一行。 */
export function buildOverviewLayout({ saas, modules, showGuide, guideAvailable }: OverviewLayoutOptions): OverviewLayoutItem[] {
  const rows: RowItem[][] = saas ? [
    [['QuickActions', 8, 9], ['Quotas', 4, 9]],
    [['DeviceAccess', 3, 13], ['Visualization', 5, 13], ['Operations', 4, 13]],
    [['AiCenter', 4, 11], ['RuleEngine', 4, 11], ['Applications', 4, 11], ['Collection', 4, 11]],
    [['Announcements', 12, 12]],
  ] : [
    [['DeviceAccess', 3, 13], ['Collection', 3, 13], ['RuleEngine', 3, 13], ['AiCenter', 3, 13]],
    [['QuickActions', 6, 9], ['Applications', 6, 9]],
    [['Visualization', 6, modules.model ? 14 : 12], ['Operations', 6, 14]],
  ]
  const layout: OverviewLayoutItem[] = []
  let y = 0
  if (guideAvailable && showGuide) {
    layout.push(['QuickGuide', 0, 0, 12, 6])
    y = 6
  }
  for (const source of rows) {
    const row = source.filter(([feature]) => homeFeatureAvailable(feature, modules, saas))
    if (!row.length) continue
    const weight = row.reduce((sum, [, width]) => sum + width, 0)
    const height = Math.max(...row.map(([, , h]) => h))
    let accumulated = 0
    row.forEach(([feature, width]) => {
      const x = Math.round(accumulated * 12 / weight)
      accumulated += width
      layout.push([feature, x, y, Math.round(accumulated * 12 / weight) - x, height])
    })
    y += height
  }
  return layout
}

/** 能力组合隔离个人布局；不读取或删除旧的无账号全局键，防止旧卡片和跨项目坐标回流。 */
export function overviewLayoutStorageKey(scope: string, saas: boolean, modules: DashboardModules, showGuide: boolean): string {
  const capabilities = [modules.edge, modules.model, modules.vision, modules.collection, modules.networkCards]
  return `project-overview:v3:${encodeURIComponent(JSON.stringify([scope, saas, capabilities, showGuide]))}`
}
