import { request } from '@jetlinks-web/core'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { queryOverviewGatewayPage, type OverviewGatewayItem } from '../../../api/overview'
import { rowsOf } from '../../Base/shared/apiResult'

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
}
export interface GatewayPoint { time: number; value: number | null }
export interface GatewayStatusResult { gateways: GatewayStatus[]; unit: string }
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

async function loadGatewayDirectory(): Promise<OverviewGatewayItem[]> {
  const gateways: OverviewGatewayItem[] = []
  let pageIndex = 0
  while (true) {
    const page = await queryOverviewGatewayPage(100, pageIndex++)
    gateways.push(...page.data)
    if (gateways.length >= page.total) break
    if (!page.data.length) throw new Error('Incomplete gateway page')
  }
  return [...new Map(gateways.map(item => [item.id, item])).values()]
}

/** 文档6.1：单指标LAST，网关分组，服务端排序并取Top10，不传interval或任务标签。 */
export async function loadGatewayStatuses(metric: GatewayMetric, now = Date.now()): Promise<GatewayStatusResult> {
  const directory = await loadGatewayDirectory()
  const definition = metricDefinitions[metric]
  const unit = definition.unit
  if (!directory.length) return { gateways: [], unit }
  // AI每5分钟采集，20分钟窗口与现有staleAfter一致；系统指标取最近2分钟。
  const from = now - (metric === 'queue' ? 20 : 2) * 60000
  const response = await request.post('/device/metrics/_agg', {
    thingIds: directory.map(item => item.id), pointType: definition.pointType,
    metrics: [queryMetric(metric)], from: formatTime(from), to: formatTime(now),
    groupBy: ['thingId'], sorts: [{ alias: definition.alias, order: 'DESC' }], limit: 10,
  }, options)
  const byId = new Map(directory.map(item => [item.id, item]))
  const gateways = rowsOf(response).flatMap(row => {
    const gateway = byId.get(String(row.thingId)), value = metricNumber(row[definition.alias])
    return gateway && value !== undefined ? [{ ...gateway, metrics: {
      [metric]: { property: definition.pointId, value, unit },
    } }] : []
  })
  return { gateways, unit }
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
