import type { DashboardGridItem } from '@jetlinks-web-core/components/DashBoardCanvas'
import { parseStoredLayout } from '@jetlinks-web-core/components/DashBoardCanvas/utils/layout'

export type SaasOverviewFeature = 'SaasSummary' | 'SaasRecent' | 'SaasResources' | 'SaasToday' | 'SaasQuotas' | 'Applications' | 'Announcements' | 'SaasHelp'
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
  if (feature === 'SaasSummary') return width < 700 ? 5 : 4
  if (feature === 'SaasRecent') return 5
  if (feature === 'SaasResources') {
    const columns = contentWidth > 839 ? 4 : contentWidth > 479 ? 2 : 1
    const rows = Math.max(1, Math.ceil(counts.resources / columns))
    // 对齐资源卡实际的 56px 标题、32px 正文留白、114px 指标行与 12px 行距。
    return rowsFor(88 + rows * 114 + (rows - 1) * 12)
  }
  if (feature === 'SaasToday') {
    const columns = contentWidth > 639 ? 4 : contentWidth > 279 ? 2 : 1
    const rows = Math.max(1, Math.ceil(counts.today / columns))
    // 48px 标题、32px 正文留白及每行指标内容，避免单行卡片底部留白过多。
    return rowsFor(80 + rows * 90 + (rows - 1) * 16)
  }
  // 标题约 56px；应用正文容纳三条（含停用状态），帮助正文仅容纳四条。
  return rowsFor({ SaasQuotas: 340, Applications: 272, Announcements: 286, SaasHelp: 248 }[feature])
}

/** 桌面主、侧列按内容连续排布；窄屏单列，用户之后可用同一画布自由调整。 */
export function buildSaasOverviewLayout(
  features: readonly SaasOverviewFeature[], width: number, counts: SaasOverviewCounts,
): SaasOverviewLayoutItem[] {
  const mode = saasOverviewLayoutMode(width)
  const visible = new Set(features)
  const items: SaasOverviewLayoutItem[] = []
  const minimumRows: Record<SaasOverviewFeature, number> = {
    SaasSummary: 3, SaasRecent: 5, SaasResources: 7, SaasToday: 6,
    SaasQuotas: 8, Applications: 8, Announcements: 7, SaasHelp: 7,
  }
  const appendColumn = (column: readonly SaasOverviewFeature[], x: number, w: number, y = 0, minWidth = 6) => {
    for (const feature of column.filter(feature => visible.has(feature))) {
      const minH = minimumRows[feature]
      const h = Math.max(minH, defaultHeight(feature, cardWidth(width, w), counts))
      items.push({ feature, gridItem: {
        // 同一缓存档的最小列数保持不变，避免窄屏恢复时单独扩宽侧栏、挤开主栏。
        x, y, w, h, minW: mode === 'compact' ? 24 : mode === 'stacked' ? 12 : minWidth, minH,
      } })
      y += h
    }
    return y
  }
  const contentTop = appendColumn(['SaasSummary'], 0, 24)
  if (mode !== 'wide') {
    appendColumn(features.filter(feature => feature !== 'SaasSummary'), 0, 24, contentTop)
    return items
  }
  const main: SaasOverviewFeature[] = ['SaasRecent', 'SaasResources', 'SaasToday']
  const side: SaasOverviewFeature[] = ['SaasQuotas', 'Applications']
  // 24列中选择最接近原型340px的侧栏，避免较窄容器仍强制四分之一宽。
  const sideWidth = Math.max(4, Math.min(9, Math.round(356 * 24 / (width + 16))))
  const hasSide = side.some(feature => visible.has(feature))
  const mainBottom = appendColumn(main, 0, hasSide ? 24 - sideWidth : 24, contentTop)
  const sideBottom = hasSide ? appendColumn(side, 24 - sideWidth, sideWidth, contentTop, 4) : contentTop
  const bottom = Math.max(mainBottom, sideBottom)
  const footer = (['Announcements', 'SaasHelp'] as const).filter(feature => visible.has(feature))
  if (footer.length === 1) appendColumn(footer, 0, 24, bottom)
  else if (footer.length === 2) {
    appendColumn(['Announcements'], 0, 24 - sideWidth, mainBottom)
    appendColumn(['SaasHelp'], 24 - sideWidth, sideWidth, hasSide ? sideBottom : mainBottom, 4)
    // 只延长公告来对齐帮助底边，保留公告最小阅读区，不拉高上方卡片或帮助列表。
    const announcement = items.find(item => item.feature === 'Announcements')!.gridItem
    const help = items.find(item => item.feature === 'SaasHelp')!.gridItem
    announcement.h = Math.max(announcement.h, help.y + help.h - announcement.y)
  }
  return items
}

/** scope已包含账号、项目、API基址与应用；组件集合和宽度档各自保留个人布局。 */
export function saasOverviewLayoutStorageKey(scope: string, width: number, features: readonly SaasOverviewFeature[]) {
  return `project-overview:saas:canvas:v1:${scope}:${saasOverviewLayoutMode(width)}:${features.join(',')}`
}

/** 欢迎卡片进入画布时复制同范围旧布局，整体下移腾出顶部，保留已有尺寸及旧缓存。 */
export function migrateSaasOverviewLayout(storage: Pick<Storage, 'getItem' | 'setItem'>, scope: string,
  width: number, features: readonly SaasOverviewFeature[], summaryGrid: DashboardGridItem) {
  const key = saasOverviewLayoutStorageKey(scope, width, features)
  if (!features.includes('SaasSummary') || storage.getItem(key) !== null) return
  const previous = features.filter(feature => feature !== 'SaasSummary')
  const previousKey = saasOverviewLayoutStorageKey(scope, width, previous)
  let saved
  try { saved = parseStoredLayout(JSON.parse(storage.getItem(previousKey) || 'null')) } catch { return }
  const expected = new Set(previous.map(feature => `projectHome${feature}`))
  if (!saved || saved.length !== expected.size || new Set(saved.map(item => item.i)).size !== expected.size) return
  if (!saved.every(item => expected.has(item.i) && [item.x, item.y, item.w, item.h].every(Number.isInteger)
    && item.x >= 0 && item.y >= 0 && item.w > 0 && item.h > 0 && item.x + item.w <= saasOverviewGrid.colNum)) return
  const { x, y, w, h } = summaryGrid
  storage.setItem(key, JSON.stringify([
    { i: 'projectHomeSaasSummary', x, y, w, h },
    ...saved.map(item => ({ ...item, y: item.y + y + h })),
  ]))
}
