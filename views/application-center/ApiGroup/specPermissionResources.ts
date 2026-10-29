import type { RawOpenApiSpec } from '@authentication-manager-ui/api/application-center/apiGroupManagement'
import { validSpecPermission } from './groupUtils'

export interface SpecPermissionAction {
  key: string
  actions: string[]
  ids: string[]
}
export interface SpecPermissionResource {
  key: string
  name: string
  appId: string
  permissionId: string
  ids: string[]
  actions: SpecPermissionAction[]
}

export const buildSpecPermissionResources = (specs: RawOpenApiSpec[]): SpecPermissionResource[] => {
  const resources = new Map<string, SpecPermissionResource>()
  const names = new Map<string, Set<string>>()
  const actionGroups = new Map<string, Map<string, SpecPermissionAction>>()
  for (const spec of specs) {
    if (!validSpecPermission(spec)) continue
    const key = JSON.stringify([spec.appId || '', spec.permissionId])
    let resource = resources.get(key)
    if (!resource) {
      resource = { key, name: '', appId: spec.appId || '', permissionId: spec.permissionId!, ids: [], actions: [] }
      resources.set(key, resource)
      names.set(key, new Set())
      actionGroups.set(key, new Map())
    }
    for (const tag of spec.tags || []) if (tag.trim()) names.get(key)!.add(tag)
    resource.ids.push(spec.id)
    // 多动作接口独立呈现为组合，不能因勾选“查询”而隐式授予该接口同时要求的写入动作。
    const actions = [...new Set(spec.actions!)].sort()
    const actionKey = JSON.stringify(actions)
    let action = actionGroups.get(key)!.get(actionKey)
    if (!action) {
      action = { key: actionKey, actions, ids: [] }
      actionGroups.get(key)!.set(actionKey, action)
      resource.actions.push(action)
    }
    action.ids.push(spec.id)
  }
  for (const resource of resources.values()) {
    resource.name = [...names.get(resource.key)!].sort().join(' / ') || resource.permissionId
    resource.actions.sort((a, b) => a.actions.join().localeCompare(b.actions.join()))
  }
  return [...resources.values()].sort((a, b) => a.appId.localeCompare(b.appId) || a.name.localeCompare(b.name))
}
