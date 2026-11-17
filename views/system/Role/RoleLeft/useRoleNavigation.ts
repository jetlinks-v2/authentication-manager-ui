import { computed, nextTick, onMounted, onScopeDispose, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage, randomString } from '@jetlinks-web/utils'
import { queryRoleGroup, saveRoleGroup, deleteRoleGroup } from '@authentication-manager-ui/api/system/role'
import { queryBusinessApplications } from '@authentication-manager-ui/api/application-center/businessApplication'
import type { BusinessApplicationEntity } from '@authentication-manager-ui/api/application-center/businessApplication'
import { buildRoleNavigation, roleScopeKey } from '../roleScope'
import type { RoleGroup, RoleNavigationNode, RoleScope } from '../roleScope'

/** 分别加载分组与应用，任一来源失败不清空另一来源；选择范围由页面持有。 */
export function useRoleNavigation(props: { scope: RoleScope }, select: (scope: RoleScope) => void) {
  const { t } = useI18n()
  const groups = ref<RoleGroup[]>([])
  const applications = ref<BusinessApplicationEntity[]>([])
  const groupLoading = ref(false)
  const applicationLoading = ref(false)
  const groupError = ref(false)
  const applicationError = ref(false)
  const searchValue = ref('')
  const expandedKeys = ref<string[]>(['global_role', 'application_roles'])
  const editingId = ref('')
  const editName = ref('')
  const saving = ref(false)
  const inputRef = ref<{ focus: () => void }>()
  let groupSequence = 0
  let applicationSequence = 0
  let disposed = false
  onScopeDispose(() => { disposed = true; groupSequence++; applicationSequence++ })

  const selectedKeys = computed(() => [roleScopeKey(props.scope)])
  const canCreateGroup = computed(() => props.scope.kind !== 'application')
  const treeData = computed(() => buildRoleNavigation(groups.value, applications.value, searchValue.value, {
    global: t('RoleLeft.index.507330-5'), applications: t('ProjectApplication.role.title'),
  }))

  const loadGroups = async () => {
    const sequence = ++groupSequence
    groupLoading.value = true
    groupError.value = false
    try {
      const response = await queryRoleGroup({ paging: false, sorts: [{ name: 'createTime', order: 'desc' }] })
      if (response.success === false) throw new Error(response.message)
      if (sequence !== groupSequence) return
      groups.value = (response.result || []).sort((a: RoleGroup, b: RoleGroup) =>
        a.id === 'default_group' ? -1 : b.id === 'default_group' ? 1 : 0)
      const scope = props.scope
      if (scope.kind === 'group' && !groups.value.some(group => group.id === scope.groupId)) {
        select({ kind: 'global' })
      }
    } catch {
      if (sequence === groupSequence) groupError.value = true
    } finally {
      if (sequence === groupSequence) groupLoading.value = false
    }
  }

  const loadApplications = async () => {
    const sequence = ++applicationSequence
    applicationLoading.value = true
    applicationError.value = false
    try {
      const response = await queryBusinessApplications({ paging: false, sorts: [{ name: 'createTime', order: 'desc' }] })
      if (response.success === false) throw new Error('Application query failed')
      if (sequence !== applicationSequence) return
      applications.value = response.result || []
      const scope = props.scope
      if (scope.kind === 'application' && !applications.value.some(app => app.id === scope.application.id)) select({ kind: 'global' })
    } catch {
      if (sequence === applicationSequence) applicationError.value = true
    } finally {
      if (sequence === applicationSequence) applicationLoading.value = false
    }
  }

  const selectNode = (node: RoleNavigationNode) => {
    if (editingId.value || saving.value) return
    if (node.scope) select(node.scope)
  }

  const onSelect = (_keys: unknown, info: { node: { key?: string | number } }) => {
    const nodes = treeData.value.flatMap(node => [node, ...(node.children || [])])
    const node = nodes.find(item => item.key === info.node.key)
    if (node) selectNode(node)
  }
  const toggleApplicationRoot = () => {
    expandedKeys.value = expandedKeys.value.includes('application_roles')
      ? expandedKeys.value.filter(key => key !== 'application_roles')
      : [...expandedKeys.value, 'application_roles']
  }

  const focusEditor = () => nextTick(() => inputRef.value?.focus())
  const addGroup = () => {
    if (!canCreateGroup.value || editingId.value || groupError.value || groupLoading.value) return
    if (!expandedKeys.value.includes('global_role')) expandedKeys.value.push('global_role')
    const id = randomString()
    groups.value.splice(1, 0, { id, name: '', isNew: true })
    editingId.value = id
    editName.value = ''
    void focusEditor()
  }

  const editGroup = (group: RoleGroup) => {
    if (group.id === 'default_group' || editingId.value) return
    editingId.value = group.id
    editName.value = group.name
    void focusEditor()
  }

  const cancelEdit = () => {
    if (saving.value) return
    groups.value = groups.value.filter(group => group.id !== editingId.value || !group.isNew)
    editingId.value = ''
  }

  const saveGroup = async (group: RoleGroup) => {
    if (saving.value || editingId.value !== group.id || group.id === 'default_group') return
    if (!editName.value.trim()) { cancelEdit(); return }
    saving.value = true
    try {
      const response = await saveRoleGroup({ id: group.id, name: editName.value.trim() })
      if (response.success === false) throw new Error(response.message)
      if (disposed) return
      editingId.value = ''
      onlyMessage(t('RoleLeft.index.507330-6'))
      await loadGroups()
    } catch {
      if (!disposed) onlyMessage(t('RoleLeft.index.507330-7'), 'error')
    } finally {
      saving.value = false
    }
  }

  const removeGroup = async (group: RoleGroup) => {
    if (group.id === 'default_group') return
    const response = await deleteRoleGroup(group.id)
    if (response.success === false) return
    if (disposed) return
    onlyMessage(t('RoleLeft.index.507330-6'))
    await loadGroups()
  }

  const expandSearchResults = () => {
    if (searchValue.value.trim()) expandedKeys.value = ['global_role', 'application_roles']
  }
  onMounted(() => { void loadGroups(); void loadApplications() })
  return { treeData, selectedKeys, expandedKeys, canCreateGroup, groupLoading, applicationLoading,
    groupError, applicationError, searchValue, editingId, editName, saving, inputRef,
    loadGroups, loadApplications, selectNode, onSelect, toggleApplicationRoot, addGroup, editGroup, cancelEdit, saveGroup, removeGroup, expandSearchResults }
}
