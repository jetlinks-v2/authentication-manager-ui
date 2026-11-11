import type { HomeRow } from '../../shared/types'

export interface SaasUserSummary {
  welcome: string
  details: string[]
  updatedAt?: string
}

export interface SaasHelpDocument {
  id: string
  title: string
}

/** 最近访问最多六项，按与组件容器断点一致的列数预留默认卡片高度。 */
export function recentOverviewHeight(width: number): number {
  const columns = width >= 1024 ? 6 : width >= 640 ? 3 : width >= 360 ? 2 : 1
  const rows = Math.ceil(6 / columns)
  return 80 + rows * 56 + (rows - 1) * 8
}

/** 未知和无效读数显示破折号，真实零值仍展示为 0。 */
export function formatOverviewNumber(value?: number | null, locale = 'zh-CN'): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString(locale)
    : '—'
}

/** 只有明确的正额度才能计算比例；零额度、不限和未知额度均不伪造百分比。 */
export function quotaPercent(row: HomeRow): number | undefined {
  if (row.failed || typeof row.value !== 'number' || !Number.isFinite(row.value)
    || typeof row.limit !== 'number' || !Number.isFinite(row.limit) || row.limit <= 0) return undefined
  return Math.round(row.value / row.limit * 100)
}

/** 进度条封顶，文本保留超额比例，避免超额使用被表现为恰好用满。 */
export function quotaProgress(row: HomeRow): number {
  return Math.min(100, Math.max(0, quotaPercent(row) ?? 0))
}
