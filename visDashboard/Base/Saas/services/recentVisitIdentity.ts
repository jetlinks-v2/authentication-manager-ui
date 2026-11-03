import type { RecentVisit } from './recentVisits'

export interface RecentVisitResource {
  visitId: string
  id: string
  kind: 'device' | 'gateway'
}

const deviceDetailRoutes = new Set([
  'iot-user-device-list/Detail',
  'iot-user/device/list/Detail',
  'device/Instance/Detail',
])

/** 设备与边缘网关使用各自详情路由中的资源身份，其他详情的 id 不作为设备查询。 */
export function resourceFromRecentVisit(visit: RecentVisit, routeName = visit.menuCode): RecentVisitResource | undefined {
  const kind = routeName === 'iot-user-device-list/GatewayDetail' ? 'gateway'
    : deviceDetailRoutes.has(routeName) ? 'device' : undefined
  if (!kind) return undefined
  const params = visit.target.params
  const value = kind === 'gateway' ? params?.gatewayId : params?.deviceId || params?.id
  const id = typeof value === 'string' ? value.trim() : ''
  return id ? { visitId: visit.id, id, kind } : undefined
}

/** 页签与筛选仅保存为最后一次跳转参数，不参与资源或菜单入口的去重。 */
export function recentVisitIdentity(visit: RecentVisit, routeName = visit.menuCode): string {
  const resource = resourceFromRecentVisit(visit, routeName)
  return JSON.stringify(resource ? ['resource', resource.kind, resource.id] : ['menu', routeName])
}
