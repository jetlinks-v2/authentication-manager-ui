import { ref } from 'vue'
import { queryRole_api } from '@authentication-manager-ui/api/system/user'
import { getRoleList } from '@jetlinks-web-core/api/system/user'

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
  result?: T[]
}

/**
 * 加载只能在所属应用内维护的角色，供系统用户编辑页禁止跨应用分配。
 */
export const useApplicationRoleSelection = () => {
  const applicationRoleIds = ref<string[]>([])
  const roleGroups = ref<ApplicationRoleGroup[]>([])
  const loading = ref(false)
  const unavailable = ref(false)

  const load = async () => {
    loading.value = true
    unavailable.value = false
    try {
      const query = {
        paging: false,
        sorts: [{ name: 'createTime', order: 'desc' }],
      }
      const [roleResponse, groupResponse] = await Promise.all([
        queryRole_api(query) as Promise<RoleQueryResponse<ApplicationRoleItem>>,
        getRoleList(query) as Promise<RoleQueryResponse<ApplicationRoleGroup>>,
      ])
      applicationRoleIds.value = (roleResponse.result || [])
        .filter(role => Boolean(role.applicationId))
        .map(role => role.id)
      roleGroups.value = groupResponse.result || []
    } catch (error) {
      unavailable.value = true
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    applicationRoleIds,
    roleGroups,
    loading,
    unavailable,
    load,
  }
}
