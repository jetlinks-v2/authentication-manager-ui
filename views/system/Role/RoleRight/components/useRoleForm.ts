import { computed, onMounted, onScopeDispose, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { queryRoleGroup, saveRole_api, updateRole_api } from '@authentication-manager-ui/api/system/role'
import { createBusinessApplicationRole, updateBusinessApplicationRole } from '@authentication-manager-ui/api/application-center/businessApplication'
import type { BusinessApplicationRoleEntity } from '@authentication-manager-ui/api/application-center/businessApplication'
import type { RoleGroup, RoleScope } from '../../roleScope'

export interface RoleFormContext {
  scope: RoleScope
  mode: 'add' | 'edit'
  current?: BusinessApplicationRoleEntity
}

/** 表单只维护基本资料；应用归属仅在创建时提交，编辑不修改行对象或应用归属。 */
export function useRoleForm(context: RoleFormContext, saved: (id: string) => void) {
  const { t } = useI18n()
  const isApplication = computed(() => context.scope.kind === 'application')
  const form = ref({
    name: context.current?.name || '',
    description: context.current?.description || '',
    groupId: context.current?.groupId || (context.scope.kind === 'group' ? context.scope.groupId : undefined),
  })
  const formRef = ref<{ validate: () => Promise<unknown> }>()
  const groupOptions = ref<{ label: string; value: string }[]>([])
  const groupLoading = ref(false)
  const groupError = ref(false)
  const saveError = ref(false)
  const loading = ref(false)
  let disposed = false
  onScopeDispose(() => { disposed = true })

  const loadGroups = async () => {
    if (isApplication.value) return
    groupLoading.value = true
    groupError.value = false
    try {
      const response = await queryRoleGroup({ paging: false, sorts: [{ name: 'createTime', order: 'desc' }] })
      if (response.success === false) throw new Error(response.message)
      if (!disposed) groupOptions.value = (response.result || []).map((group: RoleGroup) => ({ label: group.name, value: group.id }))
    } catch {
      if (!disposed) groupError.value = true
    } finally {
      if (!disposed) groupLoading.value = false
    }
  }

  const confirm = async () => {
    if (loading.value || groupLoading.value || groupError.value || disposed || !formRef.value) return
    loading.value = true
    saveError.value = false
    try {
      try { await formRef.value.validate() } catch { return }
      if (disposed) return
      const { name, description, groupId } = form.value
      const data = { name, description, ...(isApplication.value ? {} : { groupId }) }
      const response = context.mode === 'edit'
        ? await (isApplication.value ? updateBusinessApplicationRole : updateRole_api)({ ...data, id: context.current!.id })
        : await (context.scope.kind === 'application'
          ? createBusinessApplicationRole(context.scope.application.id, data)
          : saveRole_api(data))
      if (response.success === false) throw new Error(response.message)
      if (disposed) return
      onlyMessage(t('components.AddDialog.956922-10'))
      saved(context.current?.id || response.result?.id || '')
    } catch {
      if (!disposed) saveError.value = true
    } finally {
      if (!disposed) loading.value = false
    }
  }
  onMounted(loadGroups)
  return { isApplication, form, formRef, groupOptions, groupLoading, groupError, saveError, loading, loadGroups, confirm }
}
