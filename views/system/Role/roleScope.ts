import type { BusinessApplicationEntity, QueryPayload } from '@authentication-manager-ui/api/application-center/businessApplication'

export type RoleScope =
  | { kind: 'global' }
  | { kind: 'group'; groupId: string }
  | { kind: 'application'; application: BusinessApplicationEntity }

export interface RoleGroup {
  id: string
  name: string
  i18nName?: string
  isNew?: boolean
}

export interface RoleNavigationNode {
  key: string
  name: string
  kind: RoleScope['kind'] | 'application-root'
  scope?: RoleScope
  group?: RoleGroup
  children?: RoleNavigationNode[]
  selectable?: boolean
  isLeaf?: boolean
}

export const roleScopeKey = (scope: RoleScope): string => scope.kind === 'application'
  ? `application:${scope.application.id}`
  : scope.kind === 'group' ? `group:${scope.groupId}` : 'global_role'

/** 导航节点与业务 ID 分离；应用根仅展开，应用叶子不携带分组操作。 */
export function buildRoleNavigation(
  groups: RoleGroup[], applications: BusinessApplicationEntity[], search: string,
  labels: { global: string; applications: string },
): RoleNavigationNode[] {
  const keyword = search.trim().toLocaleLowerCase()
  const matches = (name: string) => name.toLocaleLowerCase().includes(keyword)
  const groupNodes: RoleNavigationNode[] = groups
    .filter(group => group.isNew || matches(group.i18nName || group.name))
    .map(group => ({ key: `group:${group.id}`, kind: 'group', name: group.i18nName || group.name,
      scope: { kind: 'group', groupId: group.id }, group, isLeaf: true }))
  const applicationNodes: RoleNavigationNode[] = applications.filter(app => matches(app.name))
    .map(application => ({ key: `application:${application.id}`, kind: 'application', name: application.name,
      scope: { kind: 'application', application }, isLeaf: true }))
  return [
    ...(!keyword || groupNodes.length ? [{ key: 'global_role', kind: 'global' as const,
      name: labels.global, scope: { kind: 'global' as const }, children: groupNodes }] : []),
    ...(!keyword || applicationNodes.length ? [{ key: 'application_roles', kind: 'application-root' as const,
      name: labels.applications, selectable: false, children: applicationNodes }] : []),
  ]
}

/** 用户 OR 搜索必须包在独立条件组中，避免匹配到其他应用或全局角色。 */
export function buildRoleQuery(scope: RoleScope, filter: QueryPayload = {}): QueryPayload {
  const terms: NonNullable<QueryPayload['terms']> = scope.kind === 'application'
    ? [{ column: 'applicationId', termType: 'eq', value: scope.application.id }]
    : [{ column: 'applicationId', termType: 'isnull', value: 1 }]
  if (scope.kind === 'group') terms.push({ column: 'groupId', termType: 'eq', value: scope.groupId })
  if (filter.terms?.length) terms.push({ type: 'and', terms: filter.terms })
  return { terms }
}
