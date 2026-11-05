import type { DashboardGridItem } from '@jetlinks-web-core/components/DashBoardCanvas'
import type { PrivateOverviewAccess } from '../../../../visDashboard/Base/Private/services/access'
import { selectPrivateMetricIds } from '../../../../visDashboard/Base/Private/services/metricSelection'
import { recentOverviewHeight } from '../../../../visDashboard/Base/Saas/components/presentation'

export type PrivateOverviewPanel = 'kpi' | 'recent' | 'access' | 'applications' | 'my-applications' | 'account' | 'trend' | 'assets' | 'monitor' | 'alarms'
export interface PrivateOverviewWidget {
  id: string
  panel: PrivateOverviewPanel
  metricId?: string
  gridItem: DashboardGridItem
}

export const privateOverviewGrid = { colNum: 24, rowHeight: 16, marginHorizontal: 16, marginVertical: 16 }
/** 仅在列数发生变化时切换个人布局，普通窗口微调不会丢失拖拽结果。 */
export const privateOverviewLayoutMode = (width: number) => (
  width < 560 ? 'compact' : width < 1040 ? 'stacked' : width < 1200 ? 'wide' : 'large'
)

/** 同一缓存档内保持最小列宽不变，恢复大屏个人布局时不单独扩宽侧栏而产生碰撞。 */
function privateOverviewMinimumWidth(mode: ReturnType<typeof privateOverviewLayoutMode>, panel: PrivateOverviewPanel) {
  if (mode === 'compact') return 24
  if (mode === 'stacked') return 12
  if (panel === 'kpi' || (mode === 'large' && ['applications', 'alarms', 'account'].includes(panel))) return 4
  return 6
}

/** 仅应用账号使用应用入口与账号信息，窄屏顺序堆叠。 */
export function buildPrivateApplicationLayout(width: number): PrivateOverviewWidget[] {
  const mode = privateOverviewLayoutMode(width)
  const stacked = mode === 'compact' || mode === 'stacked'
  const side = Math.max(4, Math.min(9, Math.round(356 * 24 / (width + 16))))
  const make = (panel: 'my-applications' | 'account', x: number, y: number, w: number): PrivateOverviewWidget => ({
    id: `private-overview-${panel}`, panel,
    gridItem: { x, y, w, h: 10, minW: privateOverviewMinimumWidth(mode, panel), minH: 8 },
  })
  return [make('my-applications', 0, 0, stacked ? 24 : 24 - side),
    make('account', stacked ? 0 : 24 - side, stacked ? 10 : 0, stacked ? 24 : side)]
}

/** 按授权生成稳定组件身份；统计值、请求错误与轮询结果不参与几何计算。 */
export function buildPrivateOverviewLayout(access: PrivateOverviewAccess, showAccess: boolean, width: number,
  showRecent = true, compactSingleAssets = true, enforceMetricMinimum = true, showGuide = false): PrivateOverviewWidget[] {
  const items: PrivateOverviewWidget[] = []
  const mode = privateOverviewLayoutMode(width)
  const stacked = mode === 'compact' || mode === 'stacked'
  const metrics = selectPrivateMetricIds(access, enforceMetricMinimum)
  const append = (panel: PrivateOverviewPanel, x: number, y: number, w: number, h: number, minH: number, metricId?: string) => {
    items.push({ id: `private-overview-${metricId || panel}`, panel, metricId,
      gridItem: { x, y, w, h, minW: privateOverviewMinimumWidth(mode, panel), minH } })
  }
  const columns = mode === 'compact' ? 1 : mode === 'stacked' ? 2 : mode === 'wide' ? 3 : Math.max(1, metrics.length)
  let y = 0
  for (let offset = 0; offset < metrics.length; offset += columns) {
    const row = metrics.slice(offset, offset + columns)
    row.forEach((id, index) => {
      const x = Math.round(index * 24 / row.length), end = Math.round((index + 1) * 24 / row.length)
      append('kpi', x, y, end - x, 4, 4, id)
    })
    y += 4
  }
  if (showRecent) {
    const recentHeight = Math.ceil((recentOverviewHeight(width) + 16) / 32)
    append('recent', 0, y, 24, recentHeight, 5)
    y += recentHeight
  }
  const hasTrend = access.message || access.ai
  const hasAssets = access.iot || access.video
  const hasAlarms = access.iotAlarm || access.videoAlarm
  const side = Math.max(4, Math.min(9, Math.round(356 * 24 / (width + 16))))
  const top = y
  if (showAccess) {
    // 引导预留步骤和任务说明；快捷入口仍保持 208px，个人缩放的小卡由正文滚动。
    const accessHeight = showGuide ? 10 : 7
    append('access', 0, y, !stacked && access.applications ? 24 - side : 24, accessHeight, 6)
    y += accessHeight
  }
  if (access.applications) {
    append('applications', !stacked && showAccess ? 24 - side : 0, stacked ? y : top, !stacked && showAccess ? side : 24, 8, 7)
    if (stacked || !showAccess) y += 8
  }
  const mainWidth = !stacked && hasAlarms && (hasTrend || hasAssets || access.runtime) ? 24 - side : 24
  if (!stacked && mainWidth === 24 && access.applications && showAccess) y = Math.max(y, top + 8)
  const contentTop = y
  if (hasTrend) { append('trend', 0, y, mainWidth, 9, 7); y += 9 }
  // 沿用私有化桌面的主、侧栏关系；较窄主栏内的设备和运行状况顺序排列。
  const splitBottom = mode === 'large' && hasAssets && access.runtime
  const assetWidth = splitBottom ? Math.floor(mainWidth / 2) : mainWidth
  if (hasAssets) {
    // 单分组宽屏左右排列；视频来源最多五行，需要比物联多一格。
    const compact = compactSingleAssets && !stacked && !splitBottom && access.iot !== access.video
    const assetHeight = compact ? access.video ? 7 : 6 : 9
    append('assets', 0, y, assetWidth, assetHeight, compact ? assetHeight : 8)
    if (!splitBottom) y += assetHeight
  }
  if (access.runtime) {
    append('monitor', splitBottom ? assetWidth : 0, y, splitBottom ? mainWidth - assetWidth : mainWidth, splitBottom ? 9 : 6, 6)
    y += splitBottom ? 9 : 6
  }
  // 告警高度只容纳自身摘要、趋势与三条记录，不为对齐另一列而拉长。
  // 告警独占整行时必须避开更高的接入引导；仅侧栏告警接在应用卡之后。
  if (hasAlarms) append('alarms', stacked || mainWidth === 24 ? 0 : mainWidth,
    stacked || mainWidth === 24 ? y : access.applications && showAccess ? top + 8 : contentTop,
    stacked || mainWidth === 24 ? 24 : side, 17, 12)
  return items
}

/** 账号/项目/API/应用沿用能力 scope，额外隔离部署、断点与可见组件集合。 */
export function privateOverviewLayoutStorageKey(scope: string, width: number, widgets: readonly PrivateOverviewWidget[]) {
  return `project-overview:private:canvas:v2:${scope}:${privateOverviewLayoutMode(width)}:${widgets.map(item => item.id).join(',')}`
}
