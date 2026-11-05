import type { PrivateOverviewAccess } from './access'

export type PrivateMetricId = 'product' | 'gateway' | 'devices' | 'video' | 'screen' | 'message' | 'ai'

/** 指标不足三项时，按产品、边缘节点顺序补齐；仍不足时不展示整行。 */
export function selectPrivateMetricIds(access: PrivateOverviewAccess, enforceMinimum = true): PrivateMetricId[] {
  const ids: PrivateMetricId[] = [
    ...(!access.video && access.product ? ['product' as const] : []),
    ...(access.iot ? ['devices' as const] : []), ...(access.video ? ['video' as const] : []),
    ...(access.screen ? ['screen' as const] : []), ...(access.message ? ['message' as const] : []),
    ...(access.ai ? ['ai' as const] : []),
  ]
  const additional: PrivateMetricId[] = [
    ...(access.product && !ids.includes('product') ? ['product' as const] : []),
    ...(access.edge ? ['gateway' as const] : []),
  ]
  if (!enforceMinimum) return ids
  if (ids.length < 3) ids.unshift(...additional.slice(0, 3 - ids.length))
  return ids.length >= 3 ? ids : []
}
