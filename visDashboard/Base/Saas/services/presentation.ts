import dayjs from 'dayjs'
import type { HomeRow } from '../../shared/types'

/** 展示统计请求固定的截止时刻，不用渲染时钟冒充数据刷新。 */
export function todayWindowEnd(rows: HomeRow[]): string | undefined {
  const date = rows.find(row => row.date)?.date
  return date && dayjs(date).isValid() ? dayjs(date).format('HH:mm') : undefined
}

/** 部分失败明确指出受影响的统计，其他有效数据继续可见。 */
export function failedMetricLabels(rows: HomeRow[], translate: (key: string) => string): string {
  return rows.filter(row => row.failed).map(row => row.label
    || (row.labelKey ? translate(`packages.ProjectHome.${row.labelKey}`) : row.id)).join('、')
}
