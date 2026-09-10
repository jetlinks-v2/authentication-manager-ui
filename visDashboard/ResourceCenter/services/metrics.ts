import { request } from '@jetlinks-web/core'
import { queryOverviewGatewaySummary, queryOverviewIotDeviceSummary, queryOverviewChannelSummary } from '../../../api/overview'
import { countOf } from '../../Base/shared/apiResult'
import type { Metric, ResourceKind } from '../shared'

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
    model: () => count('/visualization/resource/latest/_query', [{ column: 'searchCode', termType: 'in', value: 'visResource:model' }]),
    template: () => count('/visualization/template/_query', [{ column: 'searchCode', value: 'visTemplate:visProject:bigScreen' }]),
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
