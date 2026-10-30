import { request } from '@jetlinks-web/core'
import { recordOf, resultOf, textOf } from './apiResult'
import { HOME_TARGETS } from './navigation'
import type { HomeRow } from './types'

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

/** SaaS 概览按已用量取前五项；独立配额组件保持按使用率排序。 */
export const loadQuotaRows = async (order: 'usage' | 'utilization' = 'utilization'): Promise<HomeRow[]> => {
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
  // 不限量也参与用量排序；未知值置后，真实零值不能被当作未获取。
  if (order === 'usage') return [...selected.values()]
    .sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
    .slice(0, 5)
  return [...selected.values()]
    .filter(row => row.label && ((row.limit !== null && row.limit !== undefined && row.limit >= -1) || (row.value ?? 0) > 0))
    .sort((a, b) => {
      const ratio = (row: HomeRow) => typeof row.limit === 'number' && row.limit > 0 ? (row.value ?? 0) / row.limit : 0
      return ratio(b) - ratio(a) || Number(a.limit === -1) - Number(b.limit === -1) || (b.value ?? 0) - (a.value ?? 0)
    })
    .slice(0, 5)
}
