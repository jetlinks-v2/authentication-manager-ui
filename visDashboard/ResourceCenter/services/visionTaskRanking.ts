import { request } from '@jetlinks-web/core'
import dayjs from 'dayjs'
import { loadGatewayDirectory, metricNumber } from './gatewayStatus'
import { recordOf, rowsOf, textOf } from '../../Base/shared/apiResult'

export const visionRankingMetrics = ['latency', 'discard', 'backlog'] as const
export type VisionRankingMetric = typeof visionRankingMetrics[number]
export interface VisionTaskRank {
  id: string
  gatewayId: string
  gatewayName: string
  taskId: string
  modelId?: string
  sourceId?: string
  dimensionKey?: string
  name: string
  sourceName: string
  value: number
  detailAvailable: boolean
}
export interface VisionTaskRankingResult { rows: VisionTaskRank[]; metadataFailed: boolean; limited: boolean; supported: boolean; unit: string }
export const VISION_RANKING_LIMIT = 50
const options = { hiddenError: true, timeout: 15000 }
export const visionMetricDefinitions = {
  latency: { pointType: 'edge-ai-task', pointId: 'edge.ai.cv.task.inference.latency.avg', metricType: 'GAUGE' },
  discard: { pointType: 'edge-ai-task', pointId: 'edge.ai.cv.task.slot_reject.total', metricType: 'CUMULATIVE_COUNTER' },
  backlog: { pointType: 'edge-ai-gateway', pointId: 'edge.ai.review.dimension.pending', metricType: 'GAUGE' },
} as const
const metricLabels = (metric: VisionRankingMetric) => metric === 'backlog'
  ? ['taskId', 'dimensionKey', 'dimensionType'] : ['taskId', 'modelId', 'sourceId']

/** 点位及标签来自 runtime/{iot-service,all-in-one}/application-device-metric.yml。
 * 保留模型/来源或复判维度，不能把多个来源的 LAST 当成整个任务平均值。
 * 丢弃采用文档确认的区间次数，不展示百分比；SUM 已由服务端差分，不再次差分。
 */
export function buildVisionRankingQuery(metric: VisionRankingMetric, thingIds: string[], now = Date.now()) {
  if (!thingIds.length || thingIds.some(id => !id.trim())) throw new Error('Missing gateway scope')
  const labels = metricLabels(metric), definition = visionMetricDefinitions[metric]
  return {
    thingIds,
    pointType: definition.pointType,
    metrics: [
      { pointId: definition.pointId, aggregation: metric === 'discard' ? 'SUM' : 'LAST', alias: 'value' },
      // SUM 空桶可能补0，MIN(增量)为空时不得当成真实零丢弃。
      ...(metric === 'discard' ? [{ pointId: definition.pointId, aggregation: 'MIN', alias: 'validIncrement' }] : []),
    ],
    // 五分钟采集、二十分钟 staleAfter；只取窗口内最近快照，不宣称实时值。
    from: dayjs(now - 20 * 60000).tz('Asia/Shanghai').format('YYYY-MM-DDTHH:mm:ss'),
    to: dayjs(now).tz('Asia/Shanghai').format('YYYY-MM-DDTHH:mm:ss'),
    groupBy: ['thingId'],
    labelFilters: labels.map(key => ({ key, operator: 'EXISTS', values: [] })),
    labelGroupBy: labels.map(key => ({ key, alias: key })),
    sorts: [{ alias: 'value', order: 'DESC' }], limit: VISION_RANKING_LIMIT,
  }
}

export function normalizeVisionRanking(response: unknown, gateways: { id: string; name: string }[], metric: VisionRankingMetric): VisionTaskRank[] {
  const names = new Map(gateways.map(item => [item.id, item.name]))
  const result = new Map<string, VisionTaskRank>()
  for (const row of rowsOf(response)) {
    const gatewayId = textOf(row.thingId), taskId = textOf(row.taskId), value = metricNumber(row.value)
    if (!names.has(gatewayId) || !taskId || value === undefined) continue
    const modelId = textOf(row.modelId), sourceId = textOf(row.sourceId)
    const dimensionKey = textOf(row.dimensionKey), dimensionType = textOf(row.dimensionType)
    if (metric !== 'backlog' ? !modelId || !sourceId : !dimensionKey || !dimensionType) continue
    if (metric === 'discard' && metricNumber(row.validIncrement) === undefined) continue
    const id = JSON.stringify([gatewayId, taskId, modelId, sourceId, dimensionKey, dimensionType])
    result.set(id, { id, gatewayId, gatewayName: names.get(gatewayId)!, taskId, modelId, sourceId, dimensionKey,
      name: taskId, sourceName: '', value, detailAvailable: false })
  }
  return [...result.values()].sort((a, b) => b.value - a.value || a.id.localeCompare(b.id))
}

/** 只补齐入榜任务的名称，按网关批量读取，最多四路并发；不逐任务调用 MBean。 */
export async function loadVisionTaskRanking(metric: VisionRankingMetric, isCurrent: () => boolean = () => true): Promise<VisionTaskRankingResult> {
  if (!isCurrent()) throw new Error('Ranking query cancelled')
  const definition = visionMetricDefinitions[metric]
  const catalog = rowsOf(await request.get('/device/metrics/_supported', {}, options))
  if (!isCurrent()) throw new Error('Ranking query cancelled')
  const supported = catalog.find(item => item.pointType === definition.pointType && item.pointId === definition.pointId && item.metricType === definition.metricType)
  const labels = Array.isArray(supported?.labelKeys) ? supported.labelKeys.map(item => textOf(recordOf(item).id)) : []
  const groups = Array.isArray(supported?.groupByKeys) ? supported.groupByKeys.map(item => textOf(recordOf(item).id)) : []
  if (!supported || !metricLabels(metric).every(key => labels.includes(key)) || !groups.includes('thingId')) {
    return { rows: [], metadataFailed: false, limited: false, supported: false, unit: '' }
  }
  const unit = textOf(supported.unit)
  const gateways = await loadGatewayDirectory(isCurrent)
  if (!isCurrent()) throw new Error('Ranking query cancelled')
  if (!gateways.length) return { rows: [], metadataFailed: false, limited: false, supported: true, unit }
  const response = await request.post('/device/metrics/_agg', buildVisionRankingQuery(metric, gateways.map(item => item.id)), options)
  const rows = normalizeVisionRanking(response, gateways, metric)
  const gatewayIds = [...new Set(rows.map(item => item.gatewayId))]
  let cursor = 0, metadataFailed = false
  await Promise.all(Array.from({ length: Math.min(4, gatewayIds.length) }, async () => {
    while (cursor < gatewayIds.length && isCurrent()) {
      const gatewayId = gatewayIds[cursor++]
      const group = rows.filter(item => item.gatewayId === gatewayId)
      try {
        // 与 AI 模块 queryGatewayEdgeTaskDetails 使用同一 CRUD 查询接口及边端任务 ID。
        const tasks = rowsOf(await request.post(`/edge/device/${encodeURIComponent(gatewayId)}/_/ai/task/edge/detail/_query/no-paging`, {
          paging: false, terms: [{ column: 'id', termType: 'in', value: [...new Set(group.map(item => item.taskId))] }],
        }, options))
        if (!isCurrent()) return
        const byId = new Map(tasks.map(task => [textOf(task.id), task]))
        for (const row of group) {
          const task = byId.get(row.taskId)
          if (!task) { metadataFailed = true; continue }
          const config = recordOf(task.configuration)
          const source = Array.isArray(config.sources) ? config.sources.map(recordOf).find(item => textOf(item.id) === row.sourceId) : undefined
          row.name = textOf(task.name) || row.taskId
          row.sourceName = textOf(task.cloudChannelName) || textOf(source?.name) || textOf(task.modelName)
          row.detailAvailable = true
        }
      } catch { metadataFailed = true }
    }
  }))
  return { rows, metadataFailed, limited: rowsOf(response).length >= VISION_RANKING_LIMIT, supported: true, unit }
}
