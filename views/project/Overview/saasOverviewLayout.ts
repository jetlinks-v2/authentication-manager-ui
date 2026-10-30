import type { DashboardGridItem } from '@jetlinks-web-core/components/DashBoardCanvas'

export type SaasOverviewFeature = 'SaasRecent' | 'SaasResources' | 'SaasToday' | 'SaasQuotas' | 'Applications' | 'Announcements' | 'SaasHelp'
export type SaasOverviewLayoutMode = 'wide' | 'stacked' | 'compact'
interface SaasOverviewLayoutItem { feature: SaasOverviewFeature; gridItem: DashboardGridItem }
interface SaasOverviewCounts { resources: number; today: number }

export const saasOverviewGrid = { colNum: 24, rowHeight: 16, marginHorizontal: 16, marginVertical: 16 }
export const saasOverviewLayoutMode = (width: number): SaasOverviewLayoutMode => (
  width < 560 ? 'compact' : width < 1040 ? 'stacked' : 'wide'
)
const rowsFor = (pixels: number) => Math.ceil((pixels + 16) / 32)
const cardWidth = (width: number, columns: number) => (width + 16) * columns / 24 - 16

/** 默认高度依据既有卡片的列数与展示上限；业务零值、异常和异步返回不改变坐标。 */
function defaultHeight(feature: SaasOverviewFeature, width: number, counts: SaasOverviewCounts) {
  const contentWidth = width - 32
  if (feature === 'SaasRecent') {
    const columns = width >= 900 ? 6 : width > 560 ? 3 : width > 320 ? 2 : 1
    const rows = Math.ceil(6 / columns)
    return rowsFor(86 + rows * 56 + (rows - 1) * 6)
  }
  if (feature === 'SaasResources') {
    const columns = contentWidth > 839 ? 4 : contentWidth > 479 ? 2 : 1
    const rows = Math.max(1, Math.ceil(counts.resources / columns))
    return rowsFor(86 + rows * 124 + (rows - 1) * 16)
  }
  if (feature === 'SaasToday') {
    const columns = contentWidth > 639 ? 4 : contentWidth > 279 ? 2 : 1
    const rows = Math.max(1, Math.ceil(counts.today / columns))
    return rowsFor(86 + rows * 114 + (rows - 1) * 16)
  }
  return rowsFor({ SaasQuotas: 340, Applications: 302, Announcements: 286, SaasHelp: 390 }[feature])
}

/** 桌面保持主列、侧列与底部区；窄屏单列，用户之后可用同一画布自由调整。 */
export function buildSaasOverviewLayout(
  features: readonly SaasOverviewFeature[], width: number, counts: SaasOverviewCounts,
): SaasOverviewLayoutItem[] {
  const mode = saasOverviewLayoutMode(width)
  const visible = new Set(features)
  const items: SaasOverviewLayoutItem[] = []
  const minimumRows: Record<SaasOverviewFeature, number> = {
    SaasRecent: 5, SaasResources: mode === 'compact' ? 10 : 7, SaasToday: 7,
    SaasQuotas: 8, Applications: 8, Announcements: 7, SaasHelp: 7,
  }
  const appendColumn = (column: readonly SaasOverviewFeature[], x: number, w: number, y = 0) => {
    for (const feature of column.filter(feature => visible.has(feature))) {
      const minH = minimumRows[feature]
      const h = Math.max(minH, defaultHeight(feature, cardWidth(width, w), counts))
      items.push({ feature, gridItem: {
        x, y, w, h, minW: mode === 'compact' ? 24 : mode === 'stacked' ? 12 : Math.min(6, w), minH,
      } })
      y += h
    }
    return y
  }
  if (mode !== 'wide') {
    appendColumn(features, 0, 24)
    return items
  }
  const main: SaasOverviewFeature[] = ['SaasRecent', 'SaasResources', 'SaasToday']
  const side: SaasOverviewFeature[] = ['SaasQuotas', 'Applications']
  // 24列中选择最接近原型340px的侧栏，避免较窄容器仍强制四分之一宽。
  const sideWidth = Math.max(4, Math.min(9, Math.round(356 * 24 / (width + 16))))
  const hasSide = side.some(feature => visible.has(feature))
  const mainBottom = appendColumn(main, 0, hasSide ? 24 - sideWidth : 24)
  const lastMain = items.at(-1)
  const sideBottom = hasSide ? appendColumn(side, 24 - sideWidth, sideWidth) : 0
  const lastSide = hasSide ? items.at(-1) : undefined
  const bottom = Math.max(mainBottom, sideBottom)
  if (lastMain) lastMain.gridItem.h += bottom - mainBottom
  if (lastSide) lastSide.gridItem.h += bottom - sideBottom
  const footer = (['Announcements', 'SaasHelp'] as const).filter(feature => visible.has(feature))
  if (footer.length === 1) appendColumn(footer, 0, 24, bottom)
  else if (footer.length === 2) {
    appendColumn(['Announcements'], 0, 24 - sideWidth, bottom)
    appendColumn(['SaasHelp'], 24 - sideWidth, sideWidth, bottom)
  }
  return items
}

/** scope已包含账号、项目、API基址与应用；组件集合和宽度档各自保留个人布局。 */
export function saasOverviewLayoutStorageKey(scope: string, width: number, features: readonly SaasOverviewFeature[]) {
  return `project-overview:saas:canvas:v1:${scope}:${saasOverviewLayoutMode(width)}:${features.join(',')}`
}
