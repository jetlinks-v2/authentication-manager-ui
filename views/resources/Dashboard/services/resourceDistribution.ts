import type { ResourceDistributionBar } from '../resourceSupplemental.types'

interface DistributionDatum {
  id: string
  name: string
  color: string
  value?: number
  failed?: boolean
}

/** 条形相对最大项缩放，百分比按真实总数计算；缺失或失败显示为未知。 */
export function buildDistributionBars(
  rows: readonly DistributionDatum[], total: number | undefined,
  formatValue: (value: number) => string, formatPercent: (value: number) => string,
): ResourceDistributionBar[] {
  const valid = (row: DistributionDatum): row is DistributionDatum & { value: number } =>
    !row.failed && typeof row.value === 'number' && Number.isFinite(row.value) && row.value >= 0
  const maximum = Math.max(0, ...rows.filter(valid).map(row => row.value))
  const totalValid = typeof total === 'number' && Number.isFinite(total) && total >= 0
  return rows.map(row => {
    const known = valid(row)
    const percent = known && totalValid && (total > 0 || row.value === 0)
      ? total > 0 ? row.value / total * 100 : 0 : undefined
    return { id: row.id, name: row.name, color: row.color, failed: !known,
      valueText: known ? formatValue(row.value) : '—',
      percentText: percent === undefined ? '—' : formatPercent(percent),
      barPercent: known && maximum && row.value ? Math.max(2, Math.round(row.value / maximum * 100)) : 0,
    }
  })
}
