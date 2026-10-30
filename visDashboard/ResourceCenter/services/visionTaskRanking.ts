import { request } from '@jetlinks-web/core'
import dayjs from 'dayjs'
import { loadGatewayDirectory, metricNumber } from './gatewayStatus'
import { loadVisionTaskDirectory, type VisionTaskDirectory } from './visionTaskDirectory'
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
  sceneName?: string
  algorithmName?: string
  value?: number
  online?: boolean
  detailAvailable: boolean
}
export interface VisionTaskRankingResult {
  rows: VisionTaskRank[]
  metadataFailed: boolean
  limited: boolean
  supported: boolean
  unit: string
  taskCount?: number
  directoryIncomplete?: boolean
}
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

export function normalizeVisionRanking(response: unknown, gateways: { id: string; name: string; online?: boolean }[], metric: VisionRankingMetric): VisionTaskRank[] {
  const byGateway = new Map(gateways.map(item => [item.id, item]))
  const result = new Map<string, VisionTaskRank>()
  for (const row of rowsOf(response)) {
    const gatewayId = textOf(row.thingId), taskId = textOf(row.taskId), value = metricNumber(row.value)
    const gateway = byGateway.get(gatewayId)
    if (!gateway || !taskId || (gateway.online !== false && value === undefined)) continue
    const modelId = textOf(row.modelId), sourceId = textOf(row.sourceId)
    const dimensionKey = textOf(row.dimensionKey), dimensionType = textOf(row.dimensionType)
    if (metric !== 'backlog' ? !modelId || !sourceId : !dimensionKey || !dimensionType) continue
    if (gateway.online !== false && metric === 'discard' && metricNumber(row.validIncrement) === undefined) continue
    const id = JSON.stringify([gatewayId, taskId, modelId, sourceId, dimensionKey, dimensionType])
    result.set(id, { id, gatewayId, gatewayName: gateway.name, taskId, modelId, sourceId, dimensionKey,
      name: taskId, sourceName: '', value: gateway.online === false ? undefined : value,
      online: gateway.online, detailAvailable: false })
  }
  return [...result.values()].sort(compareVisionRows)
}

function compareVisionRows(a: VisionTaskRank, b: VisionTaskRank) {
  return (b.value ?? -1) - (a.value ?? -1)
    || Number(a.online === false) - Number(b.online === false) || a.id.localeCompare(b.id)
}

function applyTaskMetadata(row: VisionTaskRank, task: Record<string, unknown>) {
  const config = recordOf(task.configuration)
  const sources = Array.isArray(config.sources) ? config.sources.map(recordOf) : []
  const source = sources.find(item => textOf(item.id) === row.sourceId)
  row.name = textOf(task.name) || row.taskId
  row.sourceName = textOf(task.cloudChannelName) || textOf(source?.name) || textOf(task.modelName)
  // 场景来自任务配置或对应来源的部署上下文；无来源维度时仅接受唯一场景，不能按算法猜场景。
  const sceneSources = row.sourceId ? (source ? [source] : []) : sources
  const sceneNames = new Set(sceneSources
    .map(item => textOf(item.sceneName) || textOf(recordOf(item.headers).sceneName) || textOf(recordOf(item.others).sceneName))
    .filter(Boolean))
  row.sceneName = textOf(config.sceneName) || (sceneNames.size === 1 ? [...sceneNames][0] : undefined)
  row.algorithmName = textOf(recordOf(task.taskTargetDetail).text) || undefined
  // 详情从边端读取，只开放已确认身份且节点在线的任务，离线历史记录不触发 RPC。
  row.detailAvailable = row.online !== false
}

/** 少量节点合并完整在线任务目录；其余仅补齐入榜名称，最多四路并发。 */
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
  if (!gateways.length) return { rows: [], metadataFailed: false, limited: false, supported: true, unit, taskCount: 0, directoryIncomplete: false }
  // 离线历史仅补充身份，不能占用在线指标的 Top50 名额；两组沿用同一查询时刻。
  const now = Date.now()
  const scopes = [gateways.filter(item => item.online), gateways.filter(item => !item.online)].filter(items => items.length)
  const [responses, directory] = await Promise.all([
    Promise.all(scopes.map(items => request.post('/device/metrics/_agg', buildVisionRankingQuery(metric, items.map(item => item.id), now), options))),
    gateways.length <= 3 ? loadVisionTaskDirectory(gateways, isCurrent) : Promise.resolve<VisionTaskDirectory | undefined>(undefined),
  ])
  if (!isCurrent()) throw new Error('Ranking query cancelled')
  const batches = responses.map(rowsOf)
  const limited = batches.some(rows => rows.length >= VISION_RANKING_LIMIT)
  const rows = normalizeVisionRanking(batches.flat(), gateways, metric)
  if (directory) {
    let metadataFailed = directory.failed
    let taskCount = 0
    for (const gateway of gateways) {
      const tasks = directory.byGateway.get(gateway.id)
      if (!tasks) continue
      taskCount += tasks.length
      const byId = new Map(tasks.map(task => [textOf(task.id), task]))
      const group = rows.filter(row => row.gatewayId === gateway.id)
      for (const row of group) {
        const task = byId.get(row.taskId)
        if (task) applyTaskMetadata(row, task)
        else { metadataFailed = true; directory.incomplete = true }
      }
      const represented = new Set(group.map(row => row.taskId))
      for (const [taskId, task] of byId) {
        if (represented.has(taskId)) continue
        const row: VisionTaskRank = {
          id: JSON.stringify([gateway.id, taskId]), gatewayId: gateway.id, gatewayName: gateway.name,
          taskId, modelId: textOf(task.modelId) || undefined, name: taskId, sourceName: '', online: true, detailAvailable: false,
        }
        applyTaskMetadata(row, task)
        rows.push(row)
      }
    }
    return { rows: rows.sort(compareVisionRows), metadataFailed,
      limited, supported: true, unit,
      taskCount: directory.incomplete ? undefined : taskCount, directoryIncomplete: directory.incomplete }
  }
  const gatewayIds = [...new Set(rows.filter(item => item.online !== false).map(item => item.gatewayId))]
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
          applyTaskMetadata(row, task)
        }
      } catch { metadataFailed = true }
    }
  }))
  if (!isCurrent()) throw new Error('Ranking query cancelled')
  return { rows, metadataFailed, limited, supported: true, unit }
}
