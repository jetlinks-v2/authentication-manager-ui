import { getMe_api, type AuthorizationDimension } from '@jetlinks-web-core/api/auth'

export interface CurrentProjectSummary {
  id: string
  code?: string
  name?: string
  expireTime?: number
}

interface ProjectDimension extends AuthorizationDimension {
  id?: string
  name?: string
}

/** 认证租户维度由 TenantDimensionSupport 填充真实项目名，不使用可配置的品牌标题。 */
export async function getCurrentProjectSummary(projectId?: string, signal?: AbortSignal): Promise<CurrentProjectSummary> {
  const response = await getMe_api({ applicationScope: false, hiddenError: true, signal })
  const dimensions: ProjectDimension[] = response.result?.dimensions
  if (response.success === false || response.status >= 400 || !Array.isArray(dimensions)) {
    throw new Error('Invalid current project authorization')
  }
  const projects = dimensions.filter(item => (typeof item.type === 'string' ? item.type : item.type?.id) === 'tenant')
  // 多项目身份必须匹配入口缓存中的真实 ID；没有对应关系时不猜第一个项目。
  const project = projectId ? projects.find(item => item.id === projectId) : projects.length === 1 ? projects[0] : undefined
  if (!project || typeof project.id !== 'string' || !project.id.trim()) throw new Error('Current project is unavailable')
  const name = typeof project.name === 'string' ? project.name.trim() : ''
  return {
    id: project.id.trim(),
    name: name && name !== project.id ? name : undefined,
  }
}
