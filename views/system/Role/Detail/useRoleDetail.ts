import { computed, onScopeDispose, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getRoleDetails_api } from '@authentication-manager-ui/api/system/role'
import { getBusinessApplication } from '@authentication-manager-ui/api/application-center/businessApplication'
import type { BusinessApplicationEntity, BusinessApplicationRoleEntity } from '@authentication-manager-ui/api/application-center/businessApplication'
import { getApplicationTemplate } from '@authentication-manager-ui/api/application-center/applicationTemplate'
import type { ApplicationRoleScope } from '@authentication-manager-ui/components/ApplicationRolePermissions/useApplicationRolePermissions'

export interface ApplicationRoleDetail {
  role: BusinessApplicationRoleEntity
  application: BusinessApplicationEntity
  scope: ApplicationRoleScope
}

type RoleDetail = { kind: 'global'; role: BusinessApplicationRoleEntity }
  | { kind: 'application'; context: ApplicationRoleDetail }

/** 从角色真实归属加载详情；刷新页面或直接访问时也不会把应用角色当作全局角色授权。 */
export function useRoleDetail() {
  const route = useRoute()
  const { t } = useI18n()
  const detail = ref<RoleDetail>()
  const loading = ref(false)
  const error = ref(false)
  const activeKey = ref('permission')
  let sequence = 0
  onScopeDispose(() => { sequence++ })
  const application = computed(() => detail.value?.kind === 'application' ? detail.value.context : undefined)
  const tabs = computed(() => [
    { key: 'permission', label: t('Detail.index.386725-0') },
    ...(detail.value?.kind === 'global' ? [{ key: 'user', label: t('Detail.index.386725-1') }] : []),
  ])

  const load = async () => {
    const current = ++sequence
    const roleId = String(route.params.id || '')
    detail.value = undefined
    activeKey.value = 'permission'
    loading.value = true
    error.value = false
    try {
      const response = await getRoleDetails_api(roleId)
      if (current !== sequence) return
      const role: BusinessApplicationRoleEntity = response.result
      if (response.success === false || !role?.id) throw new Error('Role unavailable')
      if (!role.applicationId) { detail.value = { kind: 'global', role }; return }
      const appResponse = await getBusinessApplication(role.applicationId)
      if (current !== sequence) return
      const app = appResponse.result
      if (appResponse.success === false || !app?.templateId) throw new Error('Application unavailable')
      const templateResponse = await getApplicationTemplate(app.templateId)
      if (current !== sequence) return
      if (templateResponse.success === false || !templateResponse.result?.id) throw new Error('Template unavailable')
      detail.value = { kind: 'application', context: { role, application: app,
        scope: { applicationId: app.id, templateId: app.templateId, isExternal: templateResponse.result.provider === 'third-party' } } }
    } catch {
      if (current === sequence) error.value = true
    } finally {
      if (current === sequence) loading.value = false
    }
  }
  watch(() => route.params.id, load, { immediate: true, flush: 'sync' })
  return { detail, application, loading, error, activeKey, tabs, load }
}
