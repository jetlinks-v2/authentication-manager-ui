import type { DashboardModules } from '../../useDashboardModules'
import { request } from '@jetlinks-web/core'

export type ResourceCapabilities = Pick<DashboardModules, 'collection' | 'networkCards'>

/** 资源仪表盘按服务声明判断边缘能力，查询失败不能当作未安装。 */
export async function hasResourceEdgeService(): Promise<boolean> {
  const response: { success: boolean; result?: { id: string }[] } = await request.get(
    '/command-supports/services', undefined, { applicationScope: false, hiddenError: true },
  )
  if (!response.success || !Array.isArray(response.result)) throw new Error('Edge capability unavailable')
  return response.result.some(service => service.id === 'agentService' || service.id.startsWith('agentService:'))
}
