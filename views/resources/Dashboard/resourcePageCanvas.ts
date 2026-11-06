import type { DashboardGridItem } from '@jetlinks-web-core/components/DashBoardCanvas'
import type { ResourcePageCell, ResourcePagePanel } from './resourcePage.types'
import type { ResourceSummaryId } from './resourceSummary.types'

export interface ResourcePageWidget {
  id: string
  kind: ResourcePagePanel | 'summary' | 'distribution'
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
  options: { private?: boolean } = {},
): ResourcePageWidget[] {
  const result: ResourcePageWidget[] = []
  const columns = 24
  // 仅采集账号把通道状态、点位和协议并排，避免单张总量卡占据整行。
  if (options.private && summaries.length === 1 && summaries[0] === 'collection'
    && cells.every(cell => cell.panels.every(panel => panel === 'points' || panel === 'protocols'))) {
    const collectionWidgets: Omit<ResourcePageWidget, 'gridItem'>[] = [
      { id: 'resource-summary-collection', kind: 'summary', summaryId: 'collection' },
      ...cells.flatMap(cell => cell.panels.map(kind => ({ id: `resource-panel-${kind}`, kind }))),
    ]
    return collectionWidgets.map((item, index) => ({ ...item, gridItem: { x: width < 900 ? 0 : index * 8,
      y: width < 900 ? index * 10 : 0, w: width < 900 ? 24 : 8, h: 10, minW: width < 900 ? 24 : 8, minH: 10 } }))
  }
  const summaryColumns = width < 520 ? 1 : width < 900 ? 2
    : Math.min(options.private && width >= 1100 ? 6 : 4, summaries.length)
  const summaryHeight = options.private && width < 240 ? 10 : 7
  let y = 0
  for (let offset = 0; offset < summaries.length; offset += summaryColumns) {
    const row = summaries.slice(offset, offset + summaryColumns)
    row.forEach((summaryId, index) => {
      const x = Math.round(index * columns / row.length), end = Math.round((index + 1) * columns / row.length)
      result.push({ id: `resource-summary-${summaryId}`, kind: 'summary', summaryId,
        gridItem: { x, y, w: end - x, h: summaryHeight, minW: width < 520 ? 24 : Math.min(end - x, 6), minH: summaryHeight } })
    })
    y += summaryHeight
  }
  const small = nodeCount !== undefined && nodeCount <= 3
  // 边端没有网关表格的节点数；视觉卡沿用云端两节点时的紧凑高度。
  const localVision = !cells.some(cell => cell.panels.includes('gateway')) && cells.some(cell => cell.panels.includes('vision'))
  const rankingHeight = localVision ? 13 : small ? (nodeCount === 3 ? 16 : nodeCount === 2 ? 13 : 12) : 20
  let x = 0, rowHeight = 0, rowStart = result.length, stacked = false
  const finishRow = () => {
    const row = result.slice(rowStart)
    // 并排时分别保留消息卡和视觉卡在云端的原高度，不把较矮的视觉卡拉伸。
    const pairedTrends = row.some(item => item.kind === 'message') && row.some(item => item.kind === 'vision')
    if (!stacked && !pairedTrends) row.forEach(item => { item.gridItem.h = rowHeight })
    y += rowHeight; x = 0; rowHeight = 0; rowStart = result.length; stacked = false
  }
  const append = (kind: ResourcePageWidget['kind'], left: number, top: number, w: number, h: number) => {
    result.push({ id: `resource-panel-${kind}`, kind, gridItem: { x: left, y: top, w, h,
      minW: width < 760 ? 24 : Math.min(w, 8),
      minH: kind === 'gateway' || kind === 'vision' ? 12 : kind === 'map' ? 17 : Math.min(h, 16),
      ...(kind === 'distribution' ? { minW: width < 760 ? 24 : 12, minH: width < 760 ? 32 : 18, maxH: 72 } : {}),
    } })
  }
  for (const cell of cells) {
    const w = width < 760 ? 24 : width < 1100 && (cell.span === 2 || cell.span === 4) ? 12 : cell.span * 4
    if (x + w > columns) finishRow()
    let h = cell.panels.some(panel => panel === 'gateway' || panel === 'vision') ? rankingHeight : 17
    // 采集分布以紧凑行呈现；内容较多时在卡片内部滚动。
    if (options.private && (cell.id === 'points' || cell.id === 'protocols')) h = 10
    // 流量趋势和流量池默认同行等高；数据较多时流量池列表在卡内滚动。
    if (options.private && (cell.id === 'traffic' || cell.id === 'pools')) h = 11
    // SaaS 与私有化共用少节点行高，避免在线趋势把简短节点表格再次拉高。
    if (cells.some(item => item.panels.includes('gateway'))) {
      if (cell.id === 'online') h = rankingHeight
      if (options.private && cell.panels.length > 1) h = Math.ceil(rankingHeight / cell.panels.length)
    }
    if (cell.offline) {
      // 地图和最近离线设备构成一个画布项，内部响应式排布由组合卡片承接。
      h = width < 760 ? 36 : 18
      append('distribution', x, y, w, h)
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
