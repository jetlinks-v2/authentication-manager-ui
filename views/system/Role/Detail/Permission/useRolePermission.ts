import { computed, onScopeDispose, ref, watch } from 'vue'
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
  const permissionTreeRef = ref<{ canSave: boolean; onSave: () => Promise<MenuAssetPermissionSnapshot | undefined> }>()
  let generation = 0
  watch(() => route.params.id, () => { generation++ }, { flush: 'sync' })
  onScopeDispose(() => { generation++ })
  const permissions = useApplicationRolePermissions(() => props.application
    ? { scope: props.application.scope, role: props.application.role }
    : { scope: { applicationId: '', templateId: '', isExternal: false } })
  const loading = computed(() => globalSaving.value || permissions.savingPermissions.value)
  const canSave = computed(() => props.application ? permissions.initialized.value : !!permissionTreeRef.value?.canSave && !globalSaving.value)
  const clickSave = async () => {
    if (props.application) { await permissions.savePermissions(); return }
    if (globalSaving.value) return
    const roleId = String(route.params.id)
    const current = generation
    globalSaving.value = true
    try {
      const snapshot = await permissionTreeRef.value?.onSave()
      if (!snapshot || current !== generation) return
      const response = await updatePermissionTree_api(roleId, snapshot)
      if (response.success && current === generation) onlyMessage(t('Permission.index.071527-2'))
    } finally { globalSaving.value = false }
  }
  return { permissionTreeRef, permissions, loading, canSave, clickSave, isNoCommunity, goBack: () => router.go(-1) }
}
