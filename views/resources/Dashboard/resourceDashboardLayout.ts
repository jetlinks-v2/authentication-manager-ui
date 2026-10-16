import type { ResourceKind } from '../../../visDashboard/ResourceCenter/shared'

export type ResourceLayoutItem = readonly [ResourceKind, number, number, number, number]
export type ResourceLayoutMode = 'wide' | 'medium' | 'compact'

export const saasResourceLayout: readonly ResourceLayoutItem[] = [
  ['EdgeNodes', 0, 0, 3, 4], ['IotDevices', 3, 0, 3, 4], ['VideoDevices', 6, 0, 3, 4], ['Visualization', 9, 0, 3, 4],
  ['QuickStart', 0, 4, 6, 9], ['MessageTrend', 6, 4, 6, 9],
  ['AlgorithmCoverage', 0, 13, 6, 9], ['VideoPlaybackTrend', 6, 13, 6, 14],
  ['DeviceDistribution', 0, 22, 6, 9],
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
  return Math.max(actions > 4 ? 9 : 6, needed)
}

type LayoutNode = {
  kind: ResourceKind
  height: number
  weight: number
} | {
  direction: 'row' | 'column'
  children: LayoutNode[]
  weight: number
}
interface MeasuredNode {
  node: LayoutNode
  width: number
  height: number
  children: MeasuredNode[]
}

const card = (kind: ResourceKind, height = 9, weight = 1): LayoutNode => ({ kind, height, weight })
const row = (children: LayoutNode[], weight = 1): LayoutNode => ({ direction: 'row', children, weight })
const column = (children: LayoutNode[], weight = 1): LayoutNode => ({ direction: 'column', children, weight })

/** 模板只表达业务分区与宽度比例；任意叶子均可隐藏，不在模板中枚举能力组合。 */
function layoutTemplate(mode: ResourceLayoutMode): LayoutNode {
  const metrics = [card('EdgeNodes', 4), card('IotDevices', 4), card('VideoDevices', 4), card('Visualization', 4)]
  if (mode === 'compact') return column([
    row(metrics.slice(0, 2)), row(metrics.slice(2)),
    card('QuickStart'), card('Collection'), card('AlgorithmCoverage'), card('MessageTrend'),
    card('NetworkCards', 14), card('DeviceDistribution'), card('VideoPlaybackTrend'),
  ])
  if (mode === 'medium') return column([
    row(metrics), card('QuickStart'),
    row([column([card('Collection'), card('AlgorithmCoverage')]), card('NetworkCards', 14)]),
    row([card('MessageTrend'), card('DeviceDistribution')]), card('VideoPlaybackTrend'),
  ])
  return column([
    row(metrics),
    row([
      column([
        row([card('QuickStart', 9, 2), card('Collection')]),
        row([card('AlgorithmCoverage'), card('MessageTrend')]),
      ], 3),
      card('NetworkCards', 14),
    ]),
    row([card('DeviceDistribution', 9, 3), card('VideoPlaybackTrend', 9, 5)]),
  ])
}

function filterLayout(node: LayoutNode, visible: ReadonlySet<ResourceKind>): LayoutNode | undefined {
  if ('kind' in node) return visible.has(node.kind) ? node : undefined
  const children = node.children.flatMap(child => {
    const filtered = filterLayout(child, visible)
    return filtered ? [filtered] : []
  })
  return children.length ? { ...node, children } : undefined
}

/** 累计取整使各项之和始终等于可用网格宽/高度，避免三等分等场景产生舍入空隙。 */
function allocateSpace(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((value, weight) => value + weight, 0)
  let cumulative = 0
  let previous = 0
  return weights.map(weight => {
    cumulative += weight
    const boundary = Math.round(total * cumulative / sum)
    const size = boundary - previous
    previous = boundary
    return size
  })
}

function measureLayout(node: LayoutNode, width: number, canvasWidth: number, actions: number): MeasuredNode {
  if ('kind' in node) return {
    node, width, height: node.kind === 'QuickStart' ? quickStartHeight(canvasWidth, width, actions) : node.height, children: [],
  }
  const widths = node.direction === 'row' ? allocateSpace(width, node.children.map(child => child.weight)) : node.children.map(() => width)
  const children = node.children.map((child, index) => measureLayout(child, widths[index], canvasWidth, actions))
  const heights = children.map(child => child.height)
  return { node, width, height: node.direction === 'row' ? Math.max(...heights) : heights.reduce((sum, height) => sum + height, 0), children }
}

function placeLayout(measured: MeasuredNode, x: number, y: number, height: number): ResourceLayoutItem[] {
  const { node, width, children } = measured
  if ('kind' in node) return [[node.kind, x, y, width, height]]
  // 同行卡片对齐高度；跨行侧卡需要的额外高度按列内原有高度比例分配，避免留下垂直空洞。
  const extraHeights = node.direction === 'column' ? allocateSpace(height - measured.height, children.map(child => child.height)) : []
  return children.flatMap((child, index) => {
    const childHeight = node.direction === 'row' ? height : child.height + extraHeights[index]
    const items = placeLayout(child, x, y, childHeight)
    if (node.direction === 'row') x += child.width
    else y += childHeight
    return items
  })
}

/** 先过滤全部组件，再按行比例撑满；空行自动移除，已保存的个人布局仍由画布优先恢复。 */
export function buildPrivateResourceLayout(visibleKinds: readonly ResourceKind[], width = 0, actions = 4 + Number(visibleKinds.includes('Collection')) + Number(visibleKinds.includes('NetworkCards'))): ResourceLayoutItem[] {
  const filtered = filterLayout(layoutTemplate(resourceLayoutMode(width)), new Set(visibleKinds))
  if (!filtered) return []
  const measured = measureLayout(filtered, 24, width, actions)
  return placeLayout(measured, 0, 0, measured.height)
}
