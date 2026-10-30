import type { DashboardGridItem } from '@jetlinks-web-core/components/DashBoardCanvas'
import type { ResourcePageCell, ResourcePagePanel } from './resourcePage.types'
import type { ResourceSummaryId } from './resourceSummary.types'

export interface ResourcePageWidget {
  id: string
  kind: ResourcePagePanel | 'summary' | 'offline'
  summaryId?: ResourceSummaryId
  gridItem: DashboardGridItem
}

/** 只在排布发生变化的宽度档切换缓存，窗口微调不创建新的个人布局。 */
export function resourcePageCanvasMode(width: number) {
  return width < 520 ? 'phone' : width < 760 ? 'compact' : width < 900 ? 'medium' : width < 1100 ? 'wide' : 'large'
}

/** 原型仅决定默认几何；每张统计卡及业务面板均为独立的画布组件。 */
export function buildResourcePageWidgets(
  summaries: readonly ResourceSummaryId[], cells: readonly ResourcePageCell[], width: number, nodeCount?: number,
): ResourcePageWidget[] {
  const result: ResourcePageWidget[] = []
  const columns = 24
  const summaryColumns = width < 520 ? 1 : width < 900 ? 2 : Math.min(4, summaries.length)
  let y = 0
  for (let offset = 0; offset < summaries.length; offset += summaryColumns) {
    const row = summaries.slice(offset, offset + summaryColumns)
    row.forEach((summaryId, index) => {
      const x = Math.round(index * columns / row.length), end = Math.round((index + 1) * columns / row.length)
      result.push({ id: `resource-summary-${summaryId}`, kind: 'summary', summaryId,
        gridItem: { x, y, w: end - x, h: 7, minW: width < 520 ? 24 : Math.min(end - x, 6), minH: 7 } })
    })
    y += 7
  }
  const small = nodeCount !== undefined && nodeCount <= 3
  const rankingHeight = small ? (nodeCount === 3 ? 16 : nodeCount === 2 ? 13 : 12) : 20
  let x = 0, rowHeight = 0, rowStart = result.length, stacked = false
  const finishRow = () => {
    if (!stacked) result.slice(rowStart).forEach(item => { item.gridItem.h = rowHeight })
    y += rowHeight; x = 0; rowHeight = 0; rowStart = result.length; stacked = false
  }
  const append = (kind: ResourcePageWidget['kind'], left: number, top: number, w: number, h: number) => {
    result.push({ id: `resource-panel-${kind}`, kind, gridItem: { x: left, y: top, w, h,
      minW: width < 760 ? 24 : Math.min(w, 8),
      minH: kind === 'gateway' || kind === 'vision' ? 12 : kind === 'map' ? 17 : 16 } })
  }
  for (const cell of cells) {
    const w = width < 760 ? 24 : width < 1100 && (cell.span === 2 || cell.span === 4) ? 12 : cell.span * 4
    if (x + w > columns) finishRow()
    let h = cell.panels.some(panel => panel === 'gateway' || panel === 'vision') ? rankingHeight : 17
    if (cell.offline) {
      if (width < 760) {
        stacked = true
        append('map', x, y, w, 18)
        append('offline', x, y + 18, w, 18)
        h = 36
      } else {
        append('map', x, y, 16, 18)
        append('offline', x + 16, y, 8, 18)
        h = 18
      }
    } else {
      stacked ||= cell.panels.length > 1
      cell.panels.forEach((panel, index) => append(panel, x, y + index * h, w, h))
      h *= cell.panels.length
    }
    rowHeight = Math.max(rowHeight, h)
    x += w
    if (x === columns) finishRow()
  }
  if (x) finishRow()
  return result
}
