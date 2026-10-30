import dayjs from 'dayjs'
import { request } from '@jetlinks-web/core'
import { recordOf, rowsOf, textOf } from '../../Base/shared/apiResult'
import type { Datum, Metric, TimeRange } from '../shared'

/** 时间范围按本地自然日计算，昨天不包含今天，近 N 天包含今天。 */
export function rangeOf(range: TimeRange, now = dayjs()) {
  const days = range === '3d' ? 3 : range === '7d' ? 7 : range === '30d' ? 30 : 1
  const yesterday = range === 'yesterday'
  const hourly = days <= 3
  const from = yesterday ? now.subtract(1, 'day').startOf('day') : now.subtract(days - 1, 'day').startOf('day')
  const to = yesterday ? now.subtract(1, 'day').endOf('day') : now
  return { from: from.valueOf(), to: to.valueOf(), time: hourly ? '1h' : '1d',
    format: hourly ? 'yyyy-MM-dd HH:mm:ss' : 'yyyy-MM-dd', limit: hourly ? days * 24 : days }
}

/** 拒绝缺失或非数值字段，避免异常接口被显示成零。 */
export function numberOf(value: unknown): number {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) || Number(value) < 0) throw new Error('Invalid metric')
  return Number(value)
}

/** 仅为成功响应补齐已发生的时段，当前小时之后没有数据，不能画成已上报零条。 */
export async function loadMessageTrend(range: TimeRange, now = dayjs()) {
  const window = rangeOf(range, now)
  const rows = rowsOf(await request.post('/dashboard/_multi', [{ dashboard: 'device', object: 'message',
    measurement: 'quantity', dimension: 'agg', group: 'resourceMessage', params: window }], { hiddenError: true }))
  const unit = window.time === '1h' ? 'hour' : 'day'
  const format = window.time === '1h' ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD'
  const values = new Map<number, number>()
  for (const row of rows) {
    const data = recordOf(row.data)
    const time = textOf(data.timeString)
    if (!time || !dayjs(time).isValid()) throw new Error('Missing aggregate time')
    const timestamp = dayjs(time).startOf(unit).valueOf()
    values.set(timestamp, (values.get(timestamp) ?? 0) + numberOf(data.value))
  }
  const series: { time: string; value: number }[] = []
  for (let cursor = dayjs(window.from); cursor.valueOf() <= window.to; cursor = cursor.add(1, unit)) {
    series.push({ time: cursor.format(format), value: values.get(cursor.valueOf()) ?? 0 })
  }
  return series
}

/** 后端流量单位为 MB，与物联网卡仪表盘相同；统计和排行榜独立失败。 */
export async function loadNetworkCards(): Promise<{ metrics: Metric[]; ranking: Datum[]; rankingFailed: boolean }> {
  const now = dayjs()
  const windows = [
    { key: 'yesterday', ...rangeOf('yesterday', now) },
    { key: 'month', from: now.startOf('month').valueOf(), to: now.valueOf(), time: '1d', format: 'yyyy-MM-dd', limit: 31 },
    { key: 'year', from: now.startOf('year').valueOf(), to: now.valueOf(), time: '1M', format: 'yyyy-MM', limit: 12 },
  ]
  const [totals, ranked] = await Promise.allSettled([
    request.post('/dashboard/_multi', windows.map(({ key, ...params }) => ({ dashboard: 'flow', object: 'networkCardFlow',
      measurement: 'trend', dimension: 'agg', group: key, params })), { hiddenError: true }),
    request.post('/dashboard/_multi', [{ dashboard: 'flow', object: 'networkCardFlow', measurement: 'rank', dimension: 'agg',
      params: { from: now.startOf('month').valueOf(), to: now.valueOf(), limit: 50 } }], { hiddenError: true }),
  ])
  let metrics: Metric[]
  try {
    if (totals.status === 'rejected') throw totals.reason
    const rows = rowsOf(totals.value)
    metrics = windows.map(({ key }) => ({ key, value: rows.filter(row => row.group === key)
      .reduce((sum, row) => sum + numberOf(recordOf(row.data).value), 0) }))
  } catch { metrics = windows.map(({ key }) => ({ key, failed: true })) }
  try {
    if (ranked.status === 'rejected') throw ranked.reason
    const ranking = rowsOf(ranked.value).map(row => {
      const value = recordOf(recordOf(row.data).value)
      const id = textOf(value.cardId) || textOf(value.id)
      return { id, name: textOf(value.id) || id, value: numberOf(value.sum) }
    }).sort((a, b) => b.value - a.value)
    return { metrics, ranking, rankingFailed: false }
  } catch { return { metrics, ranking: [], rankingFailed: true } }
}
