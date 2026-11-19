import type { BusinessApplicationEntity } from '@authentication-manager-ui/api/application-center/businessApplication'
import { buildRoleNavigation, sortRoleGroups } from '../Role/roleScope'
import type { ApplicationRoleGroup, ApplicationRoleItem } from './useApplicationRoleSelection'

interface RoleSelectionNode {
  id: string
  name: string
  children?: RoleSelectionNode[]
  selectable?: boolean
  disabled?: boolean
}

/** 复用角色导航分类，应用归属优先于普通分组；绑定和叶节点始终使用原角色 ID。 */
export function buildRoleSelectionTree(
  roles: ApplicationRoleItem[],
  groups: ApplicationRoleGroup[],
  applications: BusinessApplicationEntity[],
  selectedRoles: ApplicationRoleItem[],
  labels: { global: string; applications: string },
) {
  const byId = new Map(roles.map(role => [role.id, role]))
  const groupByRoleId = new Map<string, string>()
  const visibleGroupIds = new Set(groups.map(group => group.groupId))
  for (const group of groups) {
    for (const role of group.roles || []) {
      const catalogRole = byId.get(role.id)
      if (!catalogRole || (!catalogRole.applicationId && role.applicationId)) byId.set(role.id, role)
      if (!groupByRoleId.has(role.id)) groupByRoleId.set(role.id, group.groupId)
    }
  }

  const applicationRoles = new Map<string, RoleSelectionNode[]>()
  const groupedRoles = new Map<string, RoleSelectionNode[]>()
  const ungroupedRoles: RoleSelectionNode[] = []
  const unnamedApplicationRoles: RoleSelectionNode[] = []
  const namedApplications = applications.filter(application => application.name)
  const applicationIds = new Set(namedApplications.map(application => application.id))
  const addRole = (buckets: Map<string, RoleSelectionNode[]>, key: string, role: RoleSelectionNode) => {
    const bucket = buckets.get(key)
    if (bucket) bucket.push(role)
    else buckets.set(key, [role])
  }
  for (const { id, name, applicationId, groupId } of byId.values()) {
    const role = { id, name }
    if (applicationId) {
      if (applicationIds.has(applicationId)) addRole(applicationRoles, applicationId, role)
      else unnamedApplicationRoles.push(role)
    } else {
      const visibleGroupId = groupId || groupByRoleId.get(id)
      if (visibleGroupId && visibleGroupIds.has(visibleGroupId)) addRole(groupedRoles, visibleGroupId, role)
      else ungroupedRoles.push(role)
    }
  }

  const extraRoles = selectedRoles.filter(role => !byId.has(role.id))
  const extraRoleIds = new Set(extraRoles.map(role => role.id))
  const usedIds = new Set([...byId.keys(), ...extraRoleIds])
  const branch = (key: string, name: string, children: RoleSelectionNode[]): RoleSelectionNode => {
    // TreeSelect 的分支值也必须唯一，不能遮蔽同 ID 的历史角色。
    let id = key
    while (usedIds.has(id)) id = `:${id}`
    usedIds.add(id)
    return { id, name, selectable: false, children }
  }
  const navigation = buildRoleNavigation(sortRoleGroups(groups.map(group => ({
    id: group.groupId, name: group.groupName,
  }))), namedApplications, '', labels)
  const tree = navigation.flatMap(root => {
    const children = (root.children || []).flatMap(node => {
      const scope = node.scope
      const leaves = scope?.kind === 'group' ? groupedRoles.get(scope.groupId)
        : scope?.kind === 'application' ? applicationRoles.get(scope.application.id) : undefined
      return leaves?.length ? [branch(node.key, node.name, leaves)] : []
    })
    children.push(...(root.kind === 'global' ? ungroupedRoles : unnamedApplicationRoles))
    return children.length ? [branch(root.key, root.name, children)] : []
  })
  const extraNodes: RoleSelectionNode[] = extraRoles.map(({ id, name }) => ({ id, name, disabled: true, selectable: false }))
  return {
    tree: [...tree, ...extraNodes],
    extraRoleIds,
  }
}
