import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useMenuAssetPermissionEditor } from '@jetlinks-web-core/hooks'
import type { AssetAccessPolicy, AssetTypeName, MenuPermissionNode } from '@jetlinks-web-core/hooks'
import { isNoCommunity } from '@jetlinks-web-core/utils/utils'
import {
  getPermissionDetail_api as getRolePermissionDetail,
  updatePermissionTree_api as saveRolePermission,
} from '@authentication-manager-ui/api/system/role'
import { getAssetsType as queryAssetTypes } from '@authentication-manager-ui/api/system/menu'
import {
  getCurrentUserMenuTree,
} from '@authentication-manager-ui/api/application-center/applicationTemplate'
import {
  normalizeAssetTypeNames,
  unwrapResult,
} from '../../../Template/Save/menu-config.shared'
import {
  buildApplicationRoleMenuQuery,
  resolveApplicationRolePermissionScope,
} from '../../applicationRolePermissionScope'
import type { ApplicationRole, ApplicationRoleDraft, ApplicationUser } from '../../types'
import { getBusinessApplicationMenus } from '@authentication-manager-ui/api/application-center/businessApplication'

interface GrantDetail {
  menus?: MenuPermissionNode[]
  assetAccesses?: AssetAccessPolicy[]
}

export interface ApplicationRoleScope { applicationId: string; templateId: string; isExternal: boolean }

export function useApplicationRoleManagement(
  props: { roles: ApplicationRole[]; users: ApplicationUser[]; scope: ApplicationRoleScope },
  saveRole: (draft: ApplicationRoleDraft, id?: string) => void
) {
  const { t: $t } = useI18n()
  const activeRoleId = ref('')
  const roleModalOpen = ref(false)
  const editingRoleId = ref<string>()
  const formRef = ref()
  const form = reactive<ApplicationRoleDraft>({ name: '', description: '' })
  const permissionLoading = ref(false)
  const permissionError = ref(false)
  const savingPermissions = ref(false)
  const initialized = ref(false)
  const editor = useMenuAssetPermissionEditor({ defaultSupportIds: ['creator'] })

  const activeRole = computed(() => props.roles.find(item => item.id === activeRoleId.value))
  const memberCount = (roleId: string) => props.users.filter(user => user.roleId === roleId).length
  const columns = computed(() => [
    { title: $t('ProjectApplication.role.menu'), dataIndex: 'menu', key: 'menu', width: '38%' },
    { title: $t('ProjectApplication.role.operationPermissions'), dataIndex: 'action', key: 'action' },
  ])
  const rules = computed(() => ({ name: [{ required: true, message: $t('ProjectApplication.role.nameRequired') }] }))
  let loadSequence = 0

  const clearPermissions = () => {
    initialized.value = false
    permissionLoading.value = false
    editor.reset({ menus: [], assetTypes: [] })
  }

  const assertSuccess = <T,>(response: any, fallback: T): T => {
    if (response?.success === false) throw new Error(response.message)
    return unwrapResult(response, fallback)
  }

  const loadAssetTypes = async (): Promise<AssetTypeName[]> => {
    if (!isNoCommunity) return []
    const response = await queryAssetTypes()
    if (response?.success === false) throw new Error(response.message)
    return normalizeAssetTypeNames(response)
  }

  const loadPermissions = async () => {
    const sequence = ++loadSequence
    if (props.scope.isExternal || !activeRoleId.value || !props.scope.applicationId) {
      clearPermissions()
      return
    }
    initialized.value = false
    permissionLoading.value = true
    permissionError.value = false
    try {
      const [availableResponse, menuResponse, detailResponse, assetTypes] = await Promise.all([
        getBusinessApplicationMenus(props.scope.applicationId),
        getCurrentUserMenuTree(buildApplicationRoleMenuQuery(props.scope.isExternal)),
        getRolePermissionDetail(activeRoleId.value),
        loadAssetTypes(),
      ])
      if (sequence !== loadSequence) return

      const availableDetail = assertSuccess<GrantDetail>(availableResponse, {})
      const roleDetail = assertSuccess<GrantDetail>(detailResponse, {})
      const permissionScope = resolveApplicationRolePermissionScope({
        isExternal: props.scope.isExternal,
        currentUserMenus: assertSuccess<MenuPermissionNode[]>(menuResponse, []),
        availableMenus: Array.isArray(availableDetail.menus) ? availableDetail.menus : [],
        roleMenus: Array.isArray(roleDetail.menus) ? roleDetail.menus : [],
        templateAssetAccesses: Array.isArray(availableDetail.assetAccesses) ? availableDetail.assetAccesses : [],
        roleAssetAccesses: Array.isArray(roleDetail.assetAccesses) ? roleDetail.assetAccesses : [],
      })

      // 回显前按最终候选菜单裁剪，避免再次提交超出当前操作者可授范围的资产权限。
      editor.reset({
        menus: permissionScope.menus,
        grantedMenus: permissionScope.grantedMenus,
        assetAccesses: permissionScope.assetAccesses,
        assetTypes,
      })
      initialized.value = true
    } catch {
      if (sequence === loadSequence) { clearPermissions(); permissionError.value = true }
    } finally {
      if (sequence === loadSequence) permissionLoading.value = false
    }
  }

  watch(() => props.roles, roles => {
    if (!roles.some(item => item.id === activeRoleId.value)) activeRoleId.value = roles[0]?.id || ''
  }, { immediate: true, deep: true })
  watch([
    activeRoleId,
    () => props.scope.applicationId,
    () => props.scope.isExternal,
  ], loadPermissions, { immediate: true, deep: true })

  const savePermissions = async () => {
    if (props.scope.isExternal || !initialized.value || !activeRoleId.value) return
    savingPermissions.value = true
    try {
      await saveRolePermission(activeRoleId.value, editor.getSnapshot())
      onlyMessage($t('ProjectApplication.role.permissionSuccess', { name: activeRole.value?.name || '' }))
    } catch {
      // The shared request layer reports the backend error.
    } finally {
      savingPermissions.value = false
    }
  }

  const openRole = (role?: ApplicationRole) => {
    editingRoleId.value = role?.id
    Object.assign(form, { name: role?.name || '', description: role?.description || '' })
    roleModalOpen.value = true
  }

  const confirmRole = async () => {
    try {
      await formRef.value?.validate()
    } catch {
      return
    }
    saveRole({ ...form }, editingRoleId.value)
    roleModalOpen.value = false
  }

  return { activeRoleId, roleModalOpen, editingRoleId, formRef, form, permissionLoading, permissionError,
    savingPermissions, initialized, editor, activeRole, memberCount, columns, rules, savePermissions,
    openRole, confirmRole, loadPermissions }
}
