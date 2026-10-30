import { request } from '@jetlinks-web/core'
import dayjs from 'dayjs'
import { countOf, rowsOf, recordOf } from '../../shared/apiResult'
import type { PrivateTrendPoint, PrivateTrendRange } from '../types'

export interface PrivateTerm { column: string; termType?: string; value: unknown }

/** 只使用业务页面已有的分页查询契约获取总量，不猜测配置对象的 count 端点。 */
export async function queryPrivateCount(path: string, terms: PrivateTerm[] = []): Promise<number> {
  return countOf(await request.post(path, { pageIndex: 0, pageSize: 1, terms }, { hiddenError: true }))
}

/** 同一加载批次的自然日边界，今天截止刷新时刻，昨天为完整自然日。 */
export function privateWindow(range: PrivateTrendRange | 'yesterday', now = Date.now()) {
  const end = dayjs(now)
  if (range === 'yesterday') {
    const day = end.subtract(1, 'day')
    return { from: day.startOf('day').valueOf(), to: day.endOf('day').valueOf(), interval: '1h' as const }
  }
  return { from: end.subtract(range === '7d' ? 6 : 0, 'day').startOf('day').valueOf(), to: now, interval: range === '7d' ? '1d' as const : '1h' as const }
}

/** 聚合只接受合法时间和数量；成功响应缺少的桶补零，失败响应不进入此转换。 */
export function mapPrivateTrend(response: unknown, window: ReturnType<typeof privateWindow>): PrivateTrendPoint[] {
  const unit = window.interval === '1h' ? 'hour' : 'day'
  const values = new Map<number, number>()
  for (const item of rowsOf(response)) {
    const row = Object.keys(recordOf(item.value)).length ? recordOf(item.value) : item
    const raw = row.time ?? row.timestamp
    if (raw == null || raw === '') throw new Error('Missing aggregate time')
    const time = typeof raw === 'number' || /^\d{13}$/.test(String(raw)) ? dayjs(Number(raw)) : dayjs(String(raw))
    if (!time.isValid()) throw new Error('Invalid aggregate time')
    const timestamp = time.startOf(unit).valueOf()
    const value = countOf(row.count ?? row.total ?? row.alarmCount)
    values.set(timestamp, (values.get(timestamp) ?? 0) + value)
  }
  const result: PrivateTrendPoint[] = []
  for (let cursor = dayjs(window.from).startOf(unit); cursor.valueOf() <= window.to; cursor = cursor.add(1, unit)) {
    result.push({ timestamp: cursor.valueOf(), value: values.get(cursor.valueOf()) ?? 0 })
  }
  return result
}
