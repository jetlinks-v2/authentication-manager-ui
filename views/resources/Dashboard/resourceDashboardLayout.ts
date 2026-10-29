import type { ResourceKind } from '../../../visDashboard/ResourceCenter/shared'

export type ResourceLayoutItem = readonly [ResourceKind, number, number, number, number]
export type ResourceLayoutMode = 'wide' | 'medium' | 'compact'

export const resourceDeviceMapType = 'deviceMapCard'
export const resourceVisionRankingType = 'resourceCenterVisionTaskRanking'

export const saasResourceLayout: readonly ResourceLayoutItem[] = [
  ['EdgeNodes', 0, 0, 3, 4], ['IotDevices', 3, 0, 3, 4], ['VideoDevices', 6, 0, 3, 4], ['Visualization', 9, 0, 3, 4],
  ['QuickStart', 0, 4, 6, 9], ['MessageTrend', 6, 4, 6, 9],
  ['VideoPlaybackTrend', 0, 13, 6, 9], ['VisionTaskRanking', 6, 13, 6, 9],
  ['AlgorithmCoverage', 0, 22, 6, 9], ['DeviceDistribution', 6, 22, 6, 9],
]

/** 画布按实际可用宽度分档，列数仍为24，避免侧栏挤压后继续缩放桌面三栏。 */
export const resourceLayoutMode = (width: number): ResourceLayoutMode => (
  width > 0 && width < 560 ? 'compact' : width > 0 && width < 1000 ? 'medium' : 'wide'
)

/** 高度与快速开始实际的双列/单列行数对应，保证四、五、六个入口都能完整显示。 */
function quickStartHeight(width: number, columns: number, actions: number) {
  const contentWidth = ((width || 1280) + 18) * columns / 24 - 18 - 32
  const rows = contentWidth <= 480 ? actions : Math.ceil(actions / 2)
  const needed = Math.ceil((68 + rows * 48 + (rows - 1) * 8 + 18) / 34)
  return Math.max(9, needed)
}

const metrics: ResourceKind[] = ['EdgeNodes', 'IotDevices', 'VideoDevices', 'Visualization']

/** 每排只包含平级卡片，避免跨行侧卡在其他组件隐藏后继续占据固定比例。 */
function layoutRows(mode: ResourceLayoutMode): ResourceKind[][] {
  if (mode === 'compact') return [
    metrics.slice(0, 2), metrics.slice(2),
    ['QuickStart'], ['MessageTrend'], ['VideoPlaybackTrend'], ['VisionTaskRanking'],
    ['AlgorithmCoverage'], ['DeviceDistribution'], ['Collection'], ['NetworkCards'],
  ]
  return [metrics, ['QuickStart', 'MessageTrend'], ['VideoPlaybackTrend', 'VisionTaskRanking'],
    ['AlgorithmCoverage', 'DeviceDistribution'], ['Collection', 'NetworkCards']]
}

/** 先过滤再按可见项均分24列；累计取整闭合行宽，空行直接移除，默认高度按实际入口计算。 */
export function buildPrivateResourceLayout(
  visibleKinds: readonly ResourceKind[], width = 0,
  actions = 3 + Number(visibleKinds.includes('EdgeNodes')) + Number(visibleKinds.includes('Collection')) + Number(visibleKinds.includes('NetworkCards')),
): ResourceLayoutItem[] {
  const visible = new Set(visibleKinds)
  let y = 0
  return layoutRows(resourceLayoutMode(width)).flatMap(row => {
    const kinds = row.filter(kind => visible.has(kind))
    if (!kinds.length) return []
    const widths = kinds.map((_, index) => Math.round(24 * (index + 1) / kinds.length) - Math.round(24 * index / kinds.length))
    const height = Math.max(...kinds.map((kind, index) => kind === 'QuickStart'
      ? quickStartHeight(width, widths[index], actions)
      : kind === 'NetworkCards' ? 14 : metrics.includes(kind) ? 4 : 9))
    const items = kinds.map((kind, index): ResourceLayoutItem => [
      kind, Math.round(24 * index / kinds.length), y, widths[index], height,
    ])
    y += height
    return items
  })
}

/** SaaS 与私有化共用当前画布的行序，按12列换算；无模块的卡片过滤后同行补位。 */
export function buildSaasResourceLayout(
  visibleKinds: readonly ResourceKind[], width = 0,
  actions = 3 + Number(visibleKinds.includes('EdgeNodes')) + Number(visibleKinds.includes('Collection')) + Number(visibleKinds.includes('NetworkCards')),
): ResourceLayoutItem[] {
  return buildPrivateResourceLayout(visibleKinds, width, actions).map(([kind, x, y, w, h]) => (
    [kind, Math.round(x / 2), y, Math.round((x + w) / 2) - Math.round(x / 2), h]
  ))
}
