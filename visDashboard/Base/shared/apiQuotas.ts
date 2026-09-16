import { request } from '@jetlinks-web/core'
import { recordOf, resultOf, textOf } from './apiResult'
import { HOME_TARGETS } from './navigation'
import type { HomeRow } from './types'
const arrayOf = (value: unknown): unknown[] => Array.isArray(value) ? value : []
export const loadQuotaRows = async (): Promise<HomeRow[]> => {
  const response = await request.get('/tenant/me/limits', {}, { projectContext: false, hiddenError: true })
  const source = resultOf(response)
  const resources = Array.isArray(source) ? source : arrayOf(recordOf(source).data || recordOf(source).limits)
  return resources.flatMap((item, resourceIndex) => {
    const resource = recordOf(item)
    const resourceName = textOf(resource.name || resource.label || resource.id)
    return arrayOf(resource.metrics).map((metricItem, metricIndex) => {
      const metric = recordOf(metricItem), definition = recordOf(metric.metric), limitInfo = recordOf(metric.limit)
      const usage = Number(metric.usage)
      const rawLimit = limitInfo.limit
      const parsedLimit = rawLimit === null || rawLimit === undefined ? null : Number(rawLimit)
      const metricId = textOf(definition.id || metricIndex)
      return {
        id: `${textOf(resource.id || resourceIndex)}:${metricId}`,
        label: metricId === 'entityQuota' ? resourceName : textOf(definition.name || definition.id || resourceName),
        description: metricId === 'entityQuota' ? textOf(definition.name) : (textOf(definition.description) || resourceName),
        value: Number.isFinite(usage) ? Math.max(0, usage) : 0,
        limit: parsedLimit !== null && Number.isFinite(parsedLimit) ? parsedLimit : null,
        unit: textOf(definition.unit || limitInfo.unit),
        target: HOME_TARGETS.usage,
      }
    })
  })
    // 仅展示真正开通或已有使用量的核心额度，避免把并发、速率等技术指标铺满首页。
    .filter(row => row.label && ((row.limit !== null && row.limit >= 0) || (row.value || 0) > 0))
    .sort((a, b) => {
      const aRatio = a.limit && a.limit > 0 ? (a.value || 0) / a.limit : 0
      const bRatio = b.limit && b.limit > 0 ? (b.value || 0) / b.limit : 0
      return bRatio - aRatio || Number(a.limit === -1) - Number(b.limit === -1) || (b.value || 0) - (a.value || 0)
    })
    .slice(0, 4)
}
