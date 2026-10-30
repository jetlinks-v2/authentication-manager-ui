import dayjs from 'dayjs'
import { request } from '@jetlinks-web/core'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { moduleRegistry } from '@jetlinks-web-core/utils/module-registry'
import { buildOverviewDeviceTerms, queryOverviewChannelBreakdown } from '../../../../api/overview'
import { countOf, recordOf, rowsOf } from '../../../../visDashboard/Base/shared/apiResult'
import { HOME_TARGETS } from '../../../../visDashboard/Base/shared/navigation'
import { queryPrivateCount } from '../../../../visDashboard/Base/Private/services/query'
import { loadSummary, settleMetrics } from '../../../../visDashboard/ResourceCenter/services/metrics'
import { numberOf, rangeOf } from '../../../../visDashboard/ResourceCenter/services/trends'
import type { Metric } from '../../../../visDashboard/ResourceCenter/shared'
import type { ResourcePageAccess } from '../resourcePage.types'
import type { ResourceSummaryCard, ResourceSummaryId, VisualizationSummaryKey } from '../resourceSummary.types'

const prefix = 'resourcePage.summary.'
type GrantedMenu = { code?: string; children?: GrantedMenu[] }

/** 可视化素材分别准入；隐藏路由和已安装模块均不能代替用户授权。 */
export function visualizationSummaryKeys(access: ResourcePageAccess): VisualizationSummaryKey[] {
  if (!access.visualization) return []
  const menu = useMenuStore()
  const codes = new Set<string>()
  const collect = (items: readonly GrantedMenu[]) => {
    for (const item of items) {
      if (item.code) codes.add(item.code)
      if (item.children) collect(item.children)
    }
  }
  collect(menu.initialized && !menu.loading ? menu.menuResultCache : [])
  return (['image', 'component', 'model', 'template'] as const).filter(key =>
    HOME_TARGETS[key].menus.some(code => codes.has(code))
    && (access.saas || moduleRegistry.hasModule(key === 'model' ? 'visualization-model-ui' : 'visualization-manager-ui')),
  )
}

/** 候补按产品、物联消息、识别事件顺序准入；无权限时允许少于四张。 */
export function getResourceSummaryKinds(access: ResourcePageAccess): ResourceSummaryId[] {
  const ids: ResourceSummaryId[] = (['edge', 'iot', 'video'] as const).filter(id => access[id])
  if (!access.saas && access.networkCards) ids.push('networkCards')
  if (!access.saas && access.collection) ids.push('collection')
  const size = () => ids.length + Number(access.visualization)
  if (size() < 4 && !access.saas && access.product) ids.splice(Math.max(0, ids.indexOf('iot')), 0, 'product')
  if (size() < 4 && access.iot) ids.push('message')
  if (size() < 4 && access.aiEvents) ids.push('aiEvents')
  if (access.visualization) ids.push('visualization')
  return ids
}

/** 卡片元数据与请求均由已授权种类生成，展示组件不再维护候补分支。 */
export function createResourceSummaryCards(access: ResourcePageAccess, visualizationKeys: VisualizationSummaryKey[] = []): ResourceSummaryCard[] {
  const targets = {
    edge: HOME_TARGETS.gateway,
    iot: { ...HOME_TARGETS.devices, query: { type: 'device' } },
    video: HOME_TARGETS.video,
    networkCards: HOME_TARGETS.card,
    collection: HOME_TARGETS.collector,
    visualization: HOME_TARGETS.screen,
    product: { menus: ['device/Product'] },
    aiEvents: { menus: ['video/event'] },
  }
  const icons: Record<ResourceSummaryId, string> = { edge: 'ClusterOutlined', iot: 'CloudServerOutlined', video: 'VideoCameraOutlined',
    networkCards: 'CreditCardOutlined', collection: 'PartitionOutlined', visualization: 'FundProjectionScreenOutlined', product: 'AppstoreOutlined', message: 'MessageOutlined', aiEvents: 'ScanOutlined' }
  return getResourceSummaryKinds(access).map((id): ResourceSummaryCard => {
    const statusKeys = id === 'edge' ? ['online', 'offline', 'disabled'] : ['iot', 'video'].includes(id) ? ['online', 'offline']
      : id === 'networkCards' ? ['using', 'toBeActivated', 'deactivate']
        : id === 'collection' ? ['running', 'notRunning'] : id === 'product' ? ['enabled', 'disabled']
          : id === 'message' || id === 'aiEvents' ? ['yesterdaySameTime'] : visualizationKeys
    return { id, labelKey: `${prefix}${id}`, icon: icons[id],
      unitKey: `${prefix}${id === 'video' ? 'unitChannels' : id === 'networkCards' ? 'unitCards' : id === 'message' || id === 'aiEvents' ? 'unitMessages' : id === 'visualization' ? 'unitScreens' : ['edge', 'iot'].includes(id) ? 'unitDevices' : 'unitItems'}`,
      target: id === 'message' ? undefined : targets[id],
      statuses: statusKeys.map(key => ({ key, labelKey: id === 'edge' && key === 'disabled' ? 'resourceDashboard.disabled' : `${prefix}${key}`,
        tone: ['online', 'using', 'running', 'enabled'].includes(key) ? 'success' : ['offline', 'deactivate'].includes(key) ? 'error' : 'default' })),
    }
  })
}

/** 总量及分项独立失败，成功数据继续保留。 */
function withMetrics(card: ResourceSummaryCard, metrics: Metric[]): ResourceSummaryCard {
  const total = metrics.find(item => item.key === 'total')
  return { ...card, value: total?.value, failed: !total || total.failed,
    statuses: card.statuses.map(status => {
      const metric = metrics.find(item => item.key === status.key)
      return { ...status, value: metric?.value, failed: !metric || metric.failed }
    }),
  }
}

/** 同一时刻建立今天与昨天的等长时间窗；合法空聚合集合才表示零条。 */
async function messageMetrics(): Promise<Metric[]> {
  const now = dayjs()
  const count = async (yesterday: boolean) => {
    const end = yesterday ? now.subtract(1, 'day') : now
    const rows = rowsOf(await request.post('/dashboard/_multi', [{ dashboard: 'device', object: 'message',
      measurement: 'quantity', dimension: 'agg', group: 'resourceSummaryMessage',
      params: { ...rangeOf('today', end), from: end.startOf('day').valueOf(), to: end.valueOf() },
    }], { hiddenError: true }))
    return rows.reduce((sum, row) => {
      const value = recordOf(row.data).value
      if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !value.trim())) {
        throw new Error('Invalid message count')
      }
      return sum + numberOf(value)
    }, 0)
  }
  return settleMetrics({ total: () => count(false), yesterdaySameTime: () => count(true) })
}

/** 识别事件沿用事件页设备资产范围，排除复判；比较昨日同一时刻。 */
async function aiEventMetrics(): Promise<Metric[]> {
  const now = dayjs()
  const count = async (yesterday: boolean) => {
    const end = yesterday ? now.subtract(1, 'day') : now
    return countOf(await request.post('/ai/task/history/_count', { terms: [
      { column: 'timestamp', termType: 'btw', value: [end.startOf('day').valueOf(), end.valueOf()] },
      { column: 'taskType', termType: 'not', value: 'reviewHandle' },
    ] }, { hiddenError: true, params: { assetType: 'device' } }))
  }
  return settleMetrics({ total: () => count(false), yesterdaySameTime: () => count(true) })
}

/** 模板沿用当前工作台分页接口和 projectPageType 条件，避开已失效的 dimension 入口。 */
async function visualizationMetrics(card: ResourceSummaryCard): Promise<Metric[]> {
  const loaders: Record<string, () => Promise<number>> = {
    total: () => queryPrivateCount('/visualization/project/_query', [{ column: 'projectType', termType: 'eq', value: 'bigScreen' }]),
  }
  for (const { key } of card.statuses) {
    loaders[key] = key === 'template'
      ? () => queryPrivateCount('/visualization/template/_query', [{ column: 'projectPageType', termType: 'eq', value: 'bigScreen' }])
      : () => queryPrivateCount('/visualization/resource/latest/_query', [{ column: 'searchCode', termType: 'in', value: `visResource:${key}` }])
  }
  return settleMetrics(loaders)
}

/** 按已选卡片查询其 owning API；可视化分项已在创建阶段按菜单授权裁剪。 */
export async function loadResourceSummary(card: ResourceSummaryCard, access: ResourcePageAccess): Promise<ResourceSummaryCard> {
  try {
    if (card.id === 'edge') {
      const terms = buildOverviewDeviceTerms('edge')
      const count = (state?: string) => queryPrivateCount('/device/instance/_count', state
        ? [...terms, { column: 'state', termType: 'eq', value: state }] : terms)
      // 总数减在线数还包含禁用节点；与设备列表一样分别按原始 state 统计三态。
      return withMetrics(card, await settleMetrics({
        total: () => count(), online: () => count('online'), offline: () => count('offline'), disabled: () => count('notActive'),
      }))
    }
    if (card.id === 'iot' || (card.id === 'video' && access.saas)) {
      const kind = card.id === 'iot' ? 'IotDevices' : 'VideoDevices'
      return withMetrics(card, await loadSummary(kind))
    }
    if (card.id === 'video') {
      const groups = await queryOverviewChannelBreakdown('all')
      const total = groups.reduce((sum, item) => sum + item.total, 0)
      const online = groups.reduce((sum, item) => sum + item.online, 0)
      return withMetrics(card, [{ key: 'total', value: total }, { key: 'online', value: online }, { key: 'offline', value: total - online }])
    }
    if (card.id === 'message') return withMetrics(card, await messageMetrics())
    if (card.id === 'aiEvents') return withMetrics(card, await aiEventMetrics())
    if (card.id === 'visualization') return withMetrics(card, await visualizationMetrics(card))
    const path = card.id === 'product' ? '/device-product/_count' : card.id === 'networkCards' ? '/network/card/_count' : '/data-collect/channel/_count'
    const loaders: Record<string, () => Promise<number>> = { total: () => queryPrivateCount(path) }
    for (const { key } of card.statuses) {
      const term = card.id === 'product' ? { column: 'state', termType: 'eq', value: key === 'enabled' ? 1 : 0 }
        : card.id === 'networkCards' ? { column: 'cardStateType', termType: 'eq', value: key }
          : { column: 'runningState', termType: key === 'running' ? 'eq' : 'not', value: 'running' }
      loaders[key] = () => queryPrivateCount(path, [term])
    }
    return withMetrics(card, await settleMetrics(loaders))
  } catch {
    return { ...card, value: undefined, failed: true, statuses: card.statuses.map(status => ({ ...status, value: undefined, failed: true })) }
  }
}
