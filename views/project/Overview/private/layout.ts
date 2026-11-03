import type { DashboardGridItem } from '@jetlinks-web-core/components/DashBoardCanvas'
import type { PrivateOverviewAccess } from '../../../../visDashboard/Base/Private/services/access'

export type PrivateOverviewPanel = 'kpi' | 'access' | 'applications' | 'trend' | 'assets' | 'monitor' | 'alarms'
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

/** 按授权生成稳定组件身份；统计值、请求错误与轮询结果不参与几何计算。 */
export function buildPrivateOverviewLayout(access: PrivateOverviewAccess, showAccess: boolean, width: number): PrivateOverviewWidget[] {
  const items: PrivateOverviewWidget[] = []
  const mode = privateOverviewLayoutMode(width)
  const stacked = mode === 'compact' || mode === 'stacked'
  const metrics = [
    ...(!access.video && access.product ? ['product'] : []),
    ...(access.iot ? ['devices'] : []), ...(access.video ? ['video'] : []),
    ...(access.screen ? ['screen'] : []), ...(access.message ? ['message'] : []), ...(access.ai ? ['ai'] : []),
  ]
  const append = (panel: PrivateOverviewPanel, x: number, y: number, w: number, h: number, minH: number, metricId?: string) => {
    items.push({ id: `private-overview-${metricId || panel}`, panel, metricId,
      gridItem: { x, y, w, h, minW: mode === 'compact' ? 24 : mode === 'stacked' ? 12 : panel === 'kpi' ? 4 : Math.min(w, 6), minH } })
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
  const hasTrend = access.message || access.ai
  const hasAssets = access.iot || access.video
  const hasAlarms = access.iotAlarm || access.videoAlarm
  const side = Math.max(4, Math.min(9, Math.round(356 * 24 / (width + 16))))
  const top = y
  if (showAccess) {
    // 48px 卡头、32px 正文留白、两行 60px 入口及 8px 行距，共 208px。
    append('access', 0, y, !stacked && access.applications ? 24 - side : 24, 7, 6)
    y += 7
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
    append('assets', 0, y, assetWidth, 9, 8)
    if (!splitBottom) y += 9
  }
  if (access.runtime) {
    append('monitor', splitBottom ? assetWidth : 0, y, splitBottom ? mainWidth - assetWidth : mainWidth, splitBottom ? 9 : 6, 6)
    y += splitBottom ? 9 : 6
  }
  // 告警高度只容纳自身摘要、趋势与三条记录，不为对齐另一列而拉长。
  if (hasAlarms) append('alarms', stacked || mainWidth === 24 ? 0 : mainWidth,
    stacked ? y : access.applications && showAccess ? top + 8 : contentTop,
    stacked || mainWidth === 24 ? 24 : side, 17, 12)
  return items
}

/** 账号/项目/API/应用沿用能力 scope，额外隔离部署、断点与可见组件集合。 */
export function privateOverviewLayoutStorageKey(scope: string, width: number, widgets: readonly PrivateOverviewWidget[]) {
  return `project-overview:private:canvas:v2:${scope}:${privateOverviewLayoutMode(width)}:${widgets.map(item => item.id).join(',')}`
}
