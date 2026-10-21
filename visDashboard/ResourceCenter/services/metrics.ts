import { request } from '@jetlinks-web/core'
import i18n from '@jetlinks-web-core/locales'
import { queryOverviewGatewaySummary, queryOverviewIotDeviceSummary, queryOverviewChannelSummary } from '../../../api/overview'
import { countOf, rowsOf, textOf } from '../../Base/shared/apiResult'
import type { Metric, ResourceKind, AlgorithmCoverageItem } from '../shared'
import { loadCoverageChannelCount } from '../../Base/shared/apiAlgorithms'
import { getDashboardModules } from '../../useDashboardModules'

/** 多指标分别返回失败状态；一个查询失败不会隐藏同卡已成功的指标。 */
export async function settleMetrics(loaders: Record<string, () => Promise<number>>): Promise<Metric[]> {
  return Promise.all(Object.entries(loaders).map(async ([key, load]) => {
    try { return { key, value: await load() } }
    catch { return { key, failed: true } }
  }))
}

/** 数量与在线口径直接复用项目概览服务。 */
export async function loadSummary(kind: ResourceKind): Promise<Metric[]> {
  const load = kind === 'EdgeNodes' ? queryOverviewGatewaySummary
    : kind === 'IotDevices' ? queryOverviewIotDeviceSummary : queryOverviewChannelSummary
  const summary = await load()
  return [{ key: 'total', value: summary.total }, { key: 'online', value: summary.online },
    { key: 'offline', value: Math.max(0, summary.total - summary.online) }]
}

/** 可视化资源按当前项目资源页的 searchCode 和 projectType 分类查询。 */
export function loadVisualization() {
  const count = async (path: string, terms: object[]) => countOf(await request.post(path, { pageIndex: 0, pageSize: 1, terms }, { hiddenError: true }))
  return settleMetrics({
    screen: () => count('/visualization/project/_query', [{ column: 'projectType', value: 'bigScreen' }]),
    image: () => count('/visualization/resource/latest/_query', [{ column: 'searchCode', termType: 'in', value: 'visResource:image' }]),
    component: () => count('/visualization/resource/latest/_query', [{ column: 'searchCode', termType: 'in', value: 'visResource:component' }]),
    ...(getDashboardModules().model ? { model: () => count('/visualization/resource/latest/_query', [{ column: 'searchCode', termType: 'in', value: 'visResource:model' }]) } : {}),
    template: () => count('/visualization/template/dimension/_query', [{ column: 'searchCode', value: 'visTemplate:visProject:bigScreen' }]),
  })
}

/** 异常口径与采集仪表盘一致：runningState 不等于 running。 */
export function loadCollection() {
  const count = async (type: string, abnormal = false) => countOf(await request.post(`/data-collect/${type}/_count`, {
    terms: abnormal ? [{ column: 'runningState', termType: 'not', value: 'running' }] : [],
  }, { hiddenError: true }))
  return settleMetrics({ channel: () => count('channel'), channelError: () => count('channel', true),
    collector: () => count('collector'), collectorError: () => count('collector', true) })
}

/** 算法卡与设备算法配置使用同一网关通道范围，查询失败时不生成未配置数量。 */
export async function loadAlgorithmCoverage(): Promise<AlgorithmCoverageItem[]> {
  const [countsResponse, coveredCount, channelsResponse] = await Promise.all([
    request.get('/ai/edge/task/coverage/scene/_counts', {}, { hiddenError: true }),
    loadCoverageChannelCount(),
    request.post('/media/channel/_query/no-paging', {
      paging: false,
      terms: [{ column: 'provider', termType: 'eq', value: 'agent-media-device-gateway' }],
    }, { hiddenError: true }),
  ])

  const channels = new Set(rowsOf(channelsResponse).map(row => {
    const deviceId = textOf(row.deviceId), channelId = textOf(row.channelId)
    if (!deviceId || !channelId) throw new Error('Incomplete algorithm channel')
    return JSON.stringify([deviceId, channelId])
  }))

  const rows = rowsOf(countsResponse)
  const items: AlgorithmCoverageItem[] = rows.map((row, index) => {
    const sceneId = textOf(row.sceneId)
    const sceneName = textOf(row.sceneName)
    const taskTarget = row.taskTarget
    let targetText = ''
    let targetValue = ''
    if (taskTarget && typeof taskTarget === 'object') {
      const targetObj = taskTarget as Record<string, unknown>
      targetText = textOf(targetObj.text || targetObj.value)
      targetValue = textOf(targetObj.value || targetObj.text)
    } else if (taskTarget) {
      targetText = textOf(taskTarget)
      targetValue = textOf(taskTarget)
    }
    const name = targetText || sceneName || targetValue || `Algorithm-${index + 1}`
    const title = sceneName && targetText && sceneName !== targetText
      ? `${sceneName} - ${targetText}`
      : (targetText || sceneName || name)
    const channelCount = Number(row.channelCount ?? 0)
    const gatewayCount = Number(row.gatewayCount ?? 0)
    const value = Number.isFinite(channelCount) && channelCount >= 0
      ? channelCount
      : (Number.isFinite(gatewayCount) && gatewayCount >= 0 ? gatewayCount : 0)
    const id = textOf(row.id) || `${sceneId}_${targetValue || targetText || index}`

    return {
      id,
      name,
      title,
      value,
      sceneId,
      sceneName,
      taskTarget: taskTarget as AlgorithmCoverageItem['taskTarget'],
      gatewayCount,
      channelCount,
    }
  })

  // 分算法数量存在通道交集，不能以最大值或求和替代去重覆盖总数。
  const unconfiguredCount = Math.max(0, channels.size - coveredCount)
  if (unconfiguredCount > 0) {
    items.push({
      id: 'unconfigured',
      name: i18n.global.t('resourceDashboard.algorithm.unconfigured'),
      title: i18n.global.t('resourceDashboard.algorithm.unconfigured'),
      value: unconfiguredCount,
      unconfigured: true,
    })
  }

  return items
}
