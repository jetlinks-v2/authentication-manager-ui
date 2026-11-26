import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useApplicationRolePermissions } from '@authentication-manager-ui/components/ApplicationRolePermissions/useApplicationRolePermissions'
import type { ApplicationRoleScope } from '@authentication-manager-ui/components/ApplicationRolePermissions/useApplicationRolePermissions'
import type { ApplicationRole, ApplicationRoleDraft, ApplicationUser } from '../../types'

export type { ApplicationRoleScope } from '@authentication-manager-ui/components/ApplicationRolePermissions/useApplicationRolePermissions'

/** 应用详情保留角色选择与基本资料表单，授权由模块共享 hook 处理。 */
export function useApplicationRoleManagement(
  props: { roles: ApplicationRole[]; users: ApplicationUser[]; scope: ApplicationRoleScope },
  saveRole: (draft: ApplicationRoleDraft, id?: string) => void,
) {
  const { t: $t } = useI18n()
  const activeRoleId = ref('')
  const roleModalOpen = ref(false)
  const editingRoleId = ref<string>()
  const formRef = ref<{ validate: () => Promise<unknown> }>()
  const form = reactive<ApplicationRoleDraft>({ name: '', description: '' })
  const activeRole = computed(() => props.roles.find(item => item.id === activeRoleId.value))
  const memberCount = (roleId: string) => props.users.filter(user => user.roleId === roleId).length
  const rules = computed(() => ({ name: [{ required: true, message: $t('ProjectApplication.role.nameRequired') }] }))
  watch(() => props.roles, roles => {
    if (!roles.some(item => item.id === activeRoleId.value)) activeRoleId.value = roles[0]?.id || ''
  }, { immediate: true, deep: true })
  const permissions = useApplicationRolePermissions(() => ({ scope: props.scope, role: activeRole.value }), 'menus-only')
  const openRole = (role?: ApplicationRole) => {
    editingRoleId.value = role?.id
    Object.assign(form, { name: role?.name || '', description: role?.description || '' })
    roleModalOpen.value = true
  }
  const confirmRole = async () => {
    try { await formRef.value?.validate() } catch { return }
    saveRole({ ...form }, editingRoleId.value)
    roleModalOpen.value = false
  }
  return { activeRoleId, roleModalOpen, editingRoleId, formRef, form, activeRole, memberCount, rules,
    openRole, confirmRole, permissions, ...permissions }
}
