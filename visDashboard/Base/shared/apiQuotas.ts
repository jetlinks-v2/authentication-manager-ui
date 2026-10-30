import { request } from '@jetlinks-web/core'
import { recordOf, resultOf, textOf } from './apiResult'
import { HOME_TARGETS } from './navigation'
import type { HomeRow } from './types'

// 对应 owning metrics：InternalResourceMetric、MediaChannelEntityQuotaLimiter、
// FileDiskQuotaLimiter、DeviceMessageQuotaMetric。只选已返回的真实业务指标，不补虚构额度。
const CORE_QUOTA_ORDER = [
  'device:entityQuota',
  'mediaCenter:mediaChannelQuota',
  'file:distUsage',
  'device:message_quota',
] as const

/** 布尔、空串、非数值和无效负值保持未知，不能变成正常的零用量/零额度。 */
function quotaNumber(value: unknown, allowUnlimited = false): number | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined
  if (typeof value === 'string' && !value.trim()) return undefined
  const number = Number(value)
  return Number.isFinite(number) && (number >= 0 || (allowUnlimited && number === -1)) ? number : undefined
}

/** 真正的空集合可以展示空态；畸形成功响应必须进入错误态，不能冒充尚未开通。 */
function quotaResources(response: unknown): Record<string, unknown>[] {
  const result = resultOf(response)
  const source = recordOf(result)
  const list = Array.isArray(result) ? result : source.data ?? source.limits
  if (!Array.isArray(list) || list.some(item => !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new Error('Invalid quota resource collection')
  }
  return list.map(item => {
    const resource = recordOf(item)
    if (!textOf(resource.id).trim() || !Array.isArray(resource.metrics)) throw new Error('Invalid quota resource')
    return resource
  })
}

/** SaaS 概览可选择稳定业务指标；独立配额组件保持原有按使用率取前五项的语义。 */
export const loadQuotaRows = async (coreOnly = false): Promise<HomeRow[]> => {
  // 保留项目会话与租户域名，不能为绕过错误切换成全局查询。
  const resources = quotaResources(await request.get('/tenant/me/limits', {}, { hiddenError: true }))
  const selected = new Map<string, HomeRow>()
  for (const resource of resources) {
    const resourceId = textOf(resource.id)
    for (const item of resource.metrics as unknown[]) {
      const metric = recordOf(item), definition = recordOf(metric.metric), limitInfo = recordOf(metric.limit)
      const metricId = textOf(definition.id)
      if (!metricId) throw new Error('Invalid quota metric')
      const id = `${resourceId}:${metricId}`
      const value = quotaNumber(metric.usage)
      selected.set(id, {
        id,
        label: metricId === 'entityQuota' ? textOf(resource.name || resourceId) : textOf(definition.name || metricId),
        description: metricId === 'entityQuota' ? textOf(definition.name) : textOf(definition.description || resource.name),
        value,
        failed: value === undefined,
        limit: quotaNumber(limitInfo.limit, true) ?? null,
        unit: textOf(definition.unit || limitInfo.unit),
        target: HOME_TARGETS.usage,
      })
    }
  }
  if (coreOnly) return CORE_QUOTA_ORDER.flatMap(key => selected.has(key) ? [selected.get(key)!] : [])
  return [...selected.values()]
    .filter(row => row.label && ((row.limit !== null && row.limit !== undefined && row.limit >= -1) || (row.value ?? 0) > 0))
    .sort((a, b) => {
      const ratio = (row: HomeRow) => typeof row.limit === 'number' && row.limit > 0 ? (row.value ?? 0) / row.limit : 0
      return ratio(b) - ratio(a) || Number(a.limit === -1) - Number(b.limit === -1) || (b.value ?? 0) - (a.value ?? 0)
    })
    .slice(0, 5)
}
