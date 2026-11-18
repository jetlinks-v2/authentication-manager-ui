import { computed, onScopeDispose, ref } from 'vue'
import { queryRole_api } from '@authentication-manager-ui/api/system/user'
import { getRoleList } from '@jetlinks-web-core/api/system/user'
import { queryBusinessApplications } from '@authentication-manager-ui/api/application-center/businessApplication'

export interface ApplicationRoleItem {
  id: string
  name: string
  applicationId?: string
}

export interface ApplicationRoleGroup {
  groupId: string
  groupName: string
  roles?: ApplicationRoleItem[]
}

interface RoleQueryResponse<T> {
  success?: boolean
  result?: T[]
}

/**
 * 用户管理共用角色目录与应用名称；展示名称不改变角色 ID 或应用成员关系。
 */
export const useApplicationRoleSelection = () => {
  const rawRoles = ref<ApplicationRoleItem[]>([])
  const rawGroups = ref<ApplicationRoleGroup[]>([])
  const applicationNames = ref(new Map<string, string>())
  const loading = ref(false)
  const unavailable = ref(false)
  let optionRequest: Promise<ApplicationRoleItem[]> | undefined
  let disposed = false
  onScopeDispose(() => { disposed = true })

  const roleById = computed(() => new Map([
    ...rawGroups.value.flatMap(group => group.roles || []),
    ...rawRoles.value,
  ].map(role => [role.id, role])))

  /** 用户详情可能只返回 ID 和名称，应用归属从可见角色目录补齐；名称缺失时保留角色名。 */
  const formatRoleName = (role: { id: string; name?: string; applicationId?: string }) => {
    const currentRole = roleById.value.get(role.id)
    const name = currentRole?.name || role.name || role.id
    const applicationId = currentRole?.applicationId ?? role.applicationId
    const applicationName = applicationId ? applicationNames.value.get(applicationId) : undefined
    return applicationName ? `${applicationName}-${name}` : name
  }
  const withDisplayName = (role: ApplicationRoleItem): ApplicationRoleItem => ({
    ...role,
    name: formatRoleName(role),
  })
  const roles = computed(() => rawRoles.value.map(withDisplayName))
  const roleGroups = computed(() => rawGroups.value.map(group => ({
    ...group,
    roles: (group.roles || []).map(withDisplayName),
  })))
  const query = {
    paging: false,
    sorts: [{ name: 'createTime', order: 'desc' }, { name: 'id', order: 'desc' }],
  }

  /** 列表与筛选共用本页请求；应用名称仅补充展示，读取失败不能锁定可分配的角色。 */
  const loadRoleOptions = (): Promise<ApplicationRoleItem[]> => {
    if (optionRequest) return optionRequest
    unavailable.value = false
    optionRequest = (async () => {
      const [roleResult, applicationResult] = await Promise.allSettled([
        queryRole_api(query) as Promise<RoleQueryResponse<ApplicationRoleItem>>,
        queryBusinessApplications(query),
      ])
      if (roleResult.status === 'rejected') throw roleResult.reason
      const response = roleResult.value
      if (response.success === false || !Array.isArray(response.result)) {
        throw new Error('Role options unavailable')
      }
      if (disposed) return []
      rawRoles.value = response.result
      // 名称接口可能因权限或网络不可用，不复用旧名称，也不丢弃本次成功读取的角色。
      const applications = applicationResult.status === 'fulfilled'
        && applicationResult.value.success !== false
        && Array.isArray(applicationResult.value.result)
        ? applicationResult.value.result : []
      applicationNames.value = new Map(applications.map(application => [application.id, application.name]))
      return roles.value
    })().catch(error => {
      if (!disposed) unavailable.value = true
      throw error
    }).finally(() => { optionRequest = undefined })
    return optionRequest
  }

  const getRoleOptions = async () => (await loadRoleOptions()).map(role => ({
    label: role.name,
    value: role.id,
  }))

  const load = async () => {
    loading.value = true
    unavailable.value = false
    try {
      const [, groupResponse] = await Promise.all([
        loadRoleOptions(),
        getRoleList(query) as Promise<RoleQueryResponse<ApplicationRoleGroup>>,
      ])
      if (groupResponse.success === false || !Array.isArray(groupResponse.result)) {
        throw new Error('Role groups unavailable')
      }
      if (!disposed) rawGroups.value = groupResponse.result
    } catch (error) {
      if (!disposed) unavailable.value = true
      throw error
    } finally {
      if (!disposed) loading.value = false
    }
  }

  return {
    roles,
    roleGroups,
    formatRoleName,
    loadRoleOptions,
    getRoleOptions,
    loading,
    unavailable,
    load,
  }
}
