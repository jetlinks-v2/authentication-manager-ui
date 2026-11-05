import dayjs from 'dayjs'
import { request } from '@jetlinks-web/core'
import { recordOf, rowsOf, textOf } from '../../Base/shared/apiResult'
import type { TimeRange } from '../shared'

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
