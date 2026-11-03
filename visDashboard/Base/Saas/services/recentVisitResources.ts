import { queryOverviewDeviceNames } from '../../../../api/overview'
import type { RecentVisitResource } from './recentVisitIdentity'

interface RecentVisitNameResult {
  names: ReadonlyMap<string, string>
  unavailable: ReadonlySet<string>
}

/** 同屏设备和边缘网关共用设备实例身份，一次请求补齐名称。 */
export async function loadRecentVisitNames(resources: readonly RecentVisitResource[]): Promise<RecentVisitNameResult> {
  const devices = await queryOverviewDeviceNames(resources.map(resource => resource.id))
  const names = new Map<string, string>(), unavailable = new Set<string>()
  for (const resource of resources) {
    // 名称为空的现存设备仍可访问，以设备 ID 展示，不误判为已删除。
    if (devices.has(resource.id)) names.set(resource.visitId, devices.get(resource.id) || resource.id)
    else unavailable.add(resource.visitId)
  }
  return { names, unavailable }
}
