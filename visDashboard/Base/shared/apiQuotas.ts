import { request } from '@jetlinks-web/core'
import { getProjectIdFromLocation, getProjectStorage } from '@jetlinks-web-core/utils'
import { recordOf, resultOf, rowsOf, textOf } from './apiResult'
import { HOME_TARGETS } from './navigation'
import type { HomeRow } from './types'
const arrayOf = (value: unknown): unknown[] => Array.isArray(value) ? value : []
export const currentProjectId = async () => {
  const code = getProjectIdFromLocation()
  const storedId = getProjectStorage(code)?.id
  if (storedId) return storedId
  // 直接打开运行端时会话可能仅含 token；通过控制端正式项目列表解析同一项目。
  const projects = rowsOf(await request.get('/console/project', {}, { projectContext: false, hiddenError: true }))
  const matches = projects.filter(project => project.code === code)
  if (matches.length !== 1 || !textOf(matches[0].id)) throw new Error('Project context missing')
  return textOf(matches[0].id)
}
export const loadQuotaRows = async (): Promise<HomeRow[]> => {
  const projectId = await currentProjectId()
  const options = { projectContext: false, hiddenError: true }
  const services = arrayOf(resultOf(await request.get(`/console/project/${encodeURIComponent(projectId)}/services`, {}, options)))
  if (!services.length) return []
  const ids = services.map(item => textOf(recordOf(recordOf(item).service).id || recordOf(item).serviceId || recordOf(item).id)).filter(Boolean)
  const params = new URLSearchParams()
  ids.forEach(id => params.append('serviceIds', id))
  const runtimes = arrayOf(resultOf(await request.get(`/console/project/${encodeURIComponent(projectId)}/service/runtime?${params}`, {}, options)))
  const lookup = new Map(runtimes.map(item => [textOf(recordOf(item).serviceId), recordOf(item)]))
  return services.flatMap(item => {
    const source = recordOf(item), service = recordOf(source.service)
    const serviceId = textOf(service.id || source.serviceId || source.id)
    const runtime = lookup.get(serviceId)
    const resources = arrayOf(runtime?.resources).length ? arrayOf(runtime?.resources) : arrayOf(source.resources)
    return resources.flatMap(resource => {
      const res = recordOf(resource)
      return arrayOf(res.metrics).map(metric => {
        const sourceMetric = recordOf(metric), definition = recordOf(sourceMetric.metric), limitInfo = recordOf(sourceMetric.limit)
        const rawLimit = limitInfo.limit ?? limitInfo.value
        const limit = rawLimit === undefined || rawLimit === null ? null : Number(rawLimit)
        const usage = Number(sourceMetric.usage)
        return {
          id: `${serviceId}:${textOf(res.id)}:${textOf(definition.id || sourceMetric.metricId)}`,
          label: [textOf(service.name), textOf(res.name), textOf(definition.name || sourceMetric.metricId)].filter(Boolean).join(' · '),
          value: Number.isFinite(usage) ? Math.max(0, usage) : undefined,
          limit: Number.isFinite(limit) ? limit : null,
          unit: textOf(limitInfo.unit || definition.unit), target: HOME_TARGETS.usage,
        }
      })
    })
  })
}
