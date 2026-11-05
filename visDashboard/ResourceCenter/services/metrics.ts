import { queryOverviewGatewaySummary, queryOverviewIotDeviceSummary, queryOverviewChannelSummary } from '../../../api/overview'
import type { Metric } from '../shared'

/** 多指标分别返回失败状态；一个查询失败不会隐藏同卡已成功的指标。 */
export async function settleMetrics(loaders: Record<string, () => Promise<number>>): Promise<Metric[]> {
  return Promise.all(Object.entries(loaders).map(async ([key, load]) => {
    try { return { key, value: await load() } }
    catch { return { key, failed: true } }
  }))
}

/** 数量与在线口径直接复用项目概览服务。 */
export async function loadSummary(kind: 'EdgeNodes' | 'IotDevices' | 'VideoDevices'): Promise<Metric[]> {
  const load = kind === 'EdgeNodes' ? queryOverviewGatewaySummary
    : kind === 'IotDevices' ? queryOverviewIotDeviceSummary : queryOverviewChannelSummary
  const summary = await load()
  return [{ key: 'total', value: summary.total }, { key: 'online', value: summary.online },
    { key: 'offline', value: Math.max(0, summary.total - summary.online) }]
}
