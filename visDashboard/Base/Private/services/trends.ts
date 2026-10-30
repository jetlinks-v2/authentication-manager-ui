import { request } from '@jetlinks-web/core'
import dayjs from 'dayjs'
import { loadMessageTrend } from '../../../ResourceCenter/services/trends'
import { getPrivateOverviewAccess } from './access'
import { mapPrivateTrend, privateWindow } from './query'
import type { PrivateTrend, PrivateTrendMetric, PrivateTrendPoint, PrivateTrendRange, PrivateTrendSeries } from '../types'

/** 识别事件与正式事件页保持相同设备资产权限和排除复判的统计口径。 */
export async function loadPrivateEventTrend(range: PrivateTrendRange | 'yesterday', now: number): Promise<PrivateTrendPoint[]> {
  const window = privateWindow(range, now)
  const response = await request.post('/ai/task/history/aggregation/_count', {
    from: window.from, to: window.to, interval: window.interval,
    format: window.interval === '1h' ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd',
    groupBy: [], filter: { terms: [{ column: 'taskType', termType: 'not', value: 'reviewHandle' }] },
  }, { hiddenError: true, params: { assetType: 'device' } })
  return mapPrivateTrend(response, window)
}

/** 消息趋势复用资源仪表盘，裁掉今天尚未发生的时间，不按总量编造曲线。 */
async function messagePoints(range: PrivateTrendRange | 'yesterday', now: number): Promise<PrivateTrendPoint[]> {
  const window = privateWindow(range, now)
  return (await loadMessageTrend(range)).map(point => ({ timestamp: dayjs(point.time).valueOf(), value: point.value }))
    .filter(point => point.timestamp >= window.from && point.timestamp <= window.to)
}

/** 今天与昨天独立失败；近七日单独查询，保持真实时间点与合计一致。 */
export async function loadPrivateTrend(metric: PrivateTrendMetric, range: PrivateTrendRange): Promise<PrivateTrend> {
  const now = Date.now()
  const access = getPrivateOverviewAccess()
  if (!access[metric]) return { metric, range, series: [], updatedAt: now }
  const periods = range === 'today' ? ['today', 'yesterday'] as const : ['7d'] as const
  const series = await Promise.all(periods.map(async (period): Promise<PrivateTrendSeries> => {
    try {
      const points = await (metric === 'message' ? messagePoints(period, now) : loadPrivateEventTrend(period, now))
      return { id: period, labelKey: `privateOverview.${period}`, points, total: points.reduce((total, point) => total + point.value, 0) }
    } catch { return { id: period, labelKey: `privateOverview.${period}`, points: [], failed: true } }
  }))
  return { metric, range, series, updatedAt: now }
}
