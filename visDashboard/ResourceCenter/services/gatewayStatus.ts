import { request } from '@jetlinks-web/core'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { queryOverviewGatewayPage, type OverviewGatewayItem } from '../../../api/overview'
import { rowsOf, textOf } from '../../Base/shared/apiResult'

dayjs.extend(utc)
dayjs.extend(timezone)
export const gatewayMetrics = ['queue', 'cpu', 'memory', 'disk'] as const
export type GatewayMetric = typeof gatewayMetrics[number]
export const metricDefinitions = {
  queue: { pointType: 'edge-ai-gateway', pointId: 'edge.ai.review.queue.pending', alias: 'queuePending', unit: '条' },
  cpu: { pointType: 'device-health', pointId: 'system.cpu.usage', alias: 'cpuUsage', unit: '%' },
  memory: { pointType: 'device-health', pointId: 'system.memory.usage', alias: 'memoryUsage', unit: '%' },
  disk: { pointType: 'device-health', pointId: 'system.disk.usage', alias: 'diskUsage', unit: '%' },
} as const
export interface GatewayStatus extends OverviewGatewayItem {
  metrics: Partial<Record<GatewayMetric, { property: string; value: number; unit: string }>>
  failedMetrics?: GatewayMetric[]
  lastReportTime?: number
}
export interface GatewayPoint { time: number; value: number | null }
export interface GatewayStatusResult { gateways: GatewayStatus[]; unit: string; partialError?: boolean }
const options = { hiddenError: true }
const bucketMs = 15 * 60 * 1000
const formatTime = (time: number) => dayjs(time).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss')

export function metricNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined
  if (typeof value === 'string' && !value.trim()) return undefined
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : undefined
}

function queryMetric(metric: GatewayMetric) {
  const { pointId, alias } = metricDefinitions[metric]
  return { pointId, alias, aggregation: 'LAST' }
}

export async function loadGatewayDirectory(isCurrent: () => boolean = () => true): Promise<OverviewGatewayItem[]> {
  const gateways: OverviewGatewayItem[] = []
  let pageIndex = 0
  while (true) {
    if (!isCurrent()) throw new Error('Gateway query cancelled')
    const page = await queryOverviewGatewayPage(100, pageIndex++)
    gateways.push(...page.data)
    if (gateways.length >= page.total) break
    if (!page.data.length) throw new Error('Incomplete gateway page')
  }
  return [...new Map(gateways.map(item => [item.id, item])).values()]
}

/** 单指标LAST保留Top10查询契约，再合并完整目录，离线及缺指标设备不会被误删为空数据。 */
export async function loadGatewayStatuses(
  metric: GatewayMetric, now = Date.now(), directory?: OverviewGatewayItem[], isCurrent: () => boolean = () => true,
): Promise<GatewayStatusResult> {
  const devices = directory ?? await loadGatewayDirectory(isCurrent)
  const definition = metricDefinitions[metric]
  const unit = definition.unit
  if (!devices.length) return { gateways: [], unit }
  const gateways: GatewayStatus[] = devices.map(item => ({ ...item, metrics: {} }))
  const ids = devices.filter(item => item.online).map(item => item.id)
  if (!ids.length) return { gateways, unit }
  if (!isCurrent()) throw new Error('Gateway query cancelled')
  // AI每5分钟采集，20分钟窗口与现有staleAfter一致；系统指标取最近2分钟。
  const from = now - (metric === 'queue' ? 20 : 2) * 60000
  try {
    const response = await request.post('/device/metrics/_agg', {
      thingIds: ids, pointType: definition.pointType,
      metrics: [queryMetric(metric)], from: formatTime(from), to: formatTime(now),
      groupBy: ['thingId'], sorts: [{ alias: definition.alias, order: 'DESC' }], limit: 10,
    }, options)
    if (!isCurrent()) throw new Error('Gateway query cancelled')
    applyGatewayMetrics(gateways, rowsOf(response), [metric])
    return { gateways, unit }
  } catch (error) {
    if (!isCurrent()) throw error
    return { gateways: gateways.map(item => ({ ...item, failedMetrics: [metric] })), unit, partialError: true }
  }
}

/** 只采纳目录范围内在线节点的当前值，聚合窗口内的历史离线值不能冒充当前状态。 */
function applyGatewayMetrics(gateways: GatewayStatus[], rows: Record<string, unknown>[], metrics: readonly GatewayMetric[]) {
  const byId = new Map(gateways.map(item => [item.id, item]))
  for (const row of rows) {
    const gateway = byId.get(textOf(row.thingId))
    if (!gateway?.online) continue
    for (const metric of metrics) {
      const definition = metricDefinitions[metric], value = metricNumber(row[definition.alias])
      if (value !== undefined) gateway.metrics[metric] = { property: definition.pointId, value, unit: definition.unit }
    }
  }
}

/** 复用统一设备列表的运行态批量查询；只接受真实lastReportTime，查询时间和离线时间均不作替代。 */
async function fillLastReportTimes(gateways: GatewayStatus[], isCurrent: () => boolean) {
  const ids = gateways.filter(item => !item.online).map(item => item.id)
  if (!ids.length || !isCurrent()) return
  const response = await request.post('/device/group/device/_runtime-query', {
    pageIndex: 0, pageSize: ids.length, terms: [{ column: 'id', termType: 'in', value: ids }],
  }, options)
  if (!isCurrent()) return
  const times = new Map(rowsOf(response).map(row => [textOf(row.id), metricNumber(row.lastReportTime)]))
  gateways.forEach(gateway => {
    const time = times.get(gateway.id)
    if (time && time > 0 && dayjs(time).isValid()) gateway.lastReportTime = time
  })
}

/** 少量节点同时查所有允许指标：系统三项共用一次请求，复判队列独立点位类型，失败组不清空其他成功组。 */
export async function loadGatewayNodeStatuses(
  directory: OverviewGatewayItem[], metrics: readonly GatewayMetric[], now = Date.now(), isCurrent: () => boolean = () => true,
): Promise<GatewayStatusResult> {
  if (!isCurrent()) throw new Error('Gateway query cancelled')
  const gateways: GatewayStatus[] = directory.map(item => ({ ...item, metrics: {} }))
  const ids = gateways.filter(item => item.online).map(item => item.id)
  const groups = [metrics.filter(metric => metric !== 'queue'), metrics.filter(metric => metric === 'queue')].filter(group => group.length)
  let partialError = false
  await Promise.all([
    ...groups.map(async group => {
      if (!ids.length || !isCurrent()) return
      const definition = metricDefinitions[group[0]]
      try {
        const response = await request.post('/device/metrics/_agg', {
          thingIds: ids, pointType: definition.pointType, metrics: group.map(queryMetric),
          from: formatTime(now - (group[0] === 'queue' ? 20 : 2) * 60000), to: formatTime(now),
          groupBy: ['thingId'], limit: ids.length,
        }, options)
        if (isCurrent()) applyGatewayMetrics(gateways, rowsOf(response), group)
      } catch {
        if (!isCurrent()) return
        partialError = true
        gateways.filter(item => item.online).forEach(item => { item.failedMetrics = [...(item.failedMetrics || []), ...group] })
      }
    }),
    // 最后上报是附加信息，缺失或不支持时保留离线状态，不能使已成功系统指标整卡失败。
    fillLastReportTimes(gateways, isCurrent).catch(() => {}),
  ])
  if (!isCurrent()) throw new Error('Gateway query cancelled')
  return { gateways, unit: '', partialError }
}

/** 文档5.3/5.12：24小时、15分钟桶、LAST快照；保留空桶，不插值或补0。 */
export function normalizeGatewayHistory(response: unknown, alias: string, from: number, to: number): GatewayPoint[] {
  const values = new Map<number, number | null>()
  for (const row of rowsOf(response)) {
    if (typeof row.timestamp !== 'string' && typeof row.timestamp !== 'number') continue
    let time: number
    try { time = typeof row.timestamp === 'number' ? row.timestamp : dayjs.tz(row.timestamp, 'Asia/Shanghai').valueOf() }
    catch { continue }
    if (Number.isFinite(time) && time > from - bucketMs && time < to) {
      values.set(time, metricNumber(row[alias]) ?? null)
    }
  }
  const points: GatewayPoint[] = []
  // 服务端时间桶可能随查询窗口偏移，不能按整点刻度重新取值，否则有效值会全部丢失。
  for (const [time, value] of [...values].sort(([a], [b]) => a - b)) {
    const previous = points.at(-1)
    if (previous) {
      for (let missing = previous.time + bucketMs; missing < time; missing += bucketMs) {
        points.push({ time: missing, value: null })
      }
    }
    points.push({ time, value })
  }
  return points
}

export async function loadGatewayHistory(id: string, metric: GatewayMetric, now = Date.now()): Promise<GatewayPoint[]> {
  const definition = metricDefinitions[metric], from = now - 86400000
  const response = await request.post('/device/metrics/_agg', {
    thingIds: [id], pointType: definition.pointType, metrics: [queryMetric(metric)],
    from: formatTime(from), to: formatTime(now), interval: '15m',
    sorts: [{ alias: 'timestamp', order: 'ASC' }],
  }, options)
  return normalizeGatewayHistory(response, definition.alias, from, now)
}
