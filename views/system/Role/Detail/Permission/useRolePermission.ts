import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { isNoCommunity } from '@jetlinks-web-core/utils/utils'
import type { MenuAssetPermissionSnapshot } from '@jetlinks-web-core/hooks'
import { updatePermissionTree_api } from '@authentication-manager-ui/api/system/role'
import { useApplicationRolePermissions } from '@authentication-manager-ui/components/ApplicationRolePermissions/useApplicationRolePermissions'
import type { ApplicationRoleDetail } from '../useRoleDetail'

/** 同一权限页按角色归属保存；应用沿用专用授权接口，全局保留原有授权快照。 */
export function useRolePermission(props: { application?: ApplicationRoleDetail }) {
  const route = useRoute()
  const router = useRouter()
  const { t } = useI18n()
  const globalSaving = ref(false)
  const permissionTreeRef = ref<{ onSave: () => MenuAssetPermissionSnapshot | undefined }>()
  const permissions = useApplicationRolePermissions(() => props.application
    ? { scope: props.application.scope, role: props.application.role }
    : { scope: { applicationId: '', templateId: '', isExternal: false } })
  const loading = computed(() => globalSaving.value || permissions.savingPermissions.value)
  const canSave = computed(() => !props.application || permissions.initialized.value)
  const clickSave = async () => {
    if (props.application) { await permissions.savePermissions(); return }
    if (globalSaving.value) return
    const snapshot = permissionTreeRef.value?.onSave()
    if (!snapshot) return
    globalSaving.value = true
    try {
      const response = await updatePermissionTree_api(String(route.params.id), snapshot)
      if (response.success) onlyMessage(t('Permission.index.071527-2'))
    } finally { globalSaving.value = false }
  }
  return { permissionTreeRef, permissions, loading, canSave, clickSave, isNoCommunity, goBack: () => router.go(-1) }
}
