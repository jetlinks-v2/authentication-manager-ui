import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { API_CLIENT_TARGET, TEMPLATE_GRANT_TARGET, queryApiGrants, queryApiGroups, saveApiGrants } from '@authentication-manager-ui/api/application-center/apiApplication'
import type { ApiGroup, ApiGroupGrant, ApiGroupOperation } from '@authentication-manager-ui/api/application-center/apiApplication'
import { applicationError, responseBody } from '../applicationUtils'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { groupMenu, useGroupPermissions } from '../../ApiGroup/useGroupPermissions'
import { groupAssetHint, selectedGroupOperations, updateGroupGrantOperations } from '../../ApiApplication/groupGrantUtils'

const grantableOperation = (operation: ApiGroupOperation) => !!operation.apiSpecIds?.length
  && operation.apiSpecIds.every(id => operation.apiDetail?.some(spec => spec.id === id
    && !!spec.permissionId?.trim() && !!spec.actions?.length && spec.actions.every(action => !!action.trim())))

export const useDirectGrants = (targetId: () => string, targetType: string = API_CLIENT_TARGET) => {
  const { t } = useI18n()
  const menu = useMenuStore()
  const { canQuery: canManageGroups } = useGroupPermissions()
  const groups = ref<ApiGroup[]>([])
  const original = ref<ApiGroupGrant[]>([])
  const selected = ref<Record<string, string[]>>({})
  const changed = ref<string[]>([])
  const pendingChanges = computed(() => {
    const initial = selectedGroupOperations(original.value)
    return changed.value.filter(groupId => {
      const before = initial[groupId] || []
      const after = selected.value[groupId] || []
      return before.length !== after.length || before.some(id => !after.includes(id))
    })
  })
  const loading = ref(false)
  const saving = ref(false)
  const loaded = ref(false)
  const error = ref('')
  let generation = 0
  onBeforeUnmount(() => { generation++ })
  const load = async () => {
    const current = ++generation
    loading.value = true; loaded.value = false; error.value = ''; changed.value = []
    groups.value = []; original.value = []; selected.value = {}
    try {
      const [catalog, grants] = await Promise.all([queryApiGroups({ paging: false, terms: [{ column: 'status', termType: 'eq', value: 'enabled' }] }), queryApiGrants(targetId(), targetType)])
      if (current !== generation) return
      const groupList = responseBody(catalog)
      const grantList = responseBody(grants)
      if (!Array.isArray(groupList) || !groupList.every(group => Array.isArray(group.assetTypes)) || !Array.isArray(grantList)) throw new Error('ThirdPartyApplication.project.invalidResponse')
      groups.value = groupList; original.value = grantList
      selected.value = selectedGroupOperations(grantList)
      loaded.value = true
    } catch (cause) { if (current === generation) error.value = applicationError(cause, t) }
    finally { if (current === generation) loading.value = false }
  }
  const update = (groupId: string, ids: string[]) => {
    if (saving.value || loading.value) return
    const group = groups.value.find(item => item.id === groupId)
    if (!group) return
    const available = new Set(operations(group).filter(item => !item.disabled).map(item => item.id))
    const retained = original.value.filter(item => item.groupId === groupId).flatMap(item => item.operationIds || [])
    if (ids.some(id => !available.has(id) && !retained.includes(id))) {
      error.value = t('ThirdPartyApplication.direct.invalidOperation'); return
    }
    selected.value[groupId] = [...new Set(ids)]
    if (!changed.value.includes(groupId)) changed.value.push(groupId)
  }
  const operations = (group: ApiGroup) => {
    const list = (group.operations || []).map(item => ({ ...item, disabled: !grantableOperation(item) }))
    for (const id of selected.value[group.id] || []) if (!list.some(item => item.id === id)) list.push({ id, name: id, disabled: true })
    return list
  }
  const selectAll = (group: ApiGroup) => {
    // 全选仅增加当前可授权操作；已选的历史不可用操作保留，不隐式撤权。
    const retained = (selected.value[group.id] || []).filter(id => original.value.some(grant => grant.groupId === group.id && grant.operationIds?.includes(id)))
    update(group.id, [...operations(group).filter(item => !item.disabled).map(item => item.id), ...retained])
  }
  const tableColumns = computed(() => [
    { title: t('ThirdPartyApplication.direct.groupColumn'), key: 'group', width: '40%' },
    { title: t('ThirdPartyApplication.direct.operationColumn'), key: 'operations' },
  ])
  const groupRows = computed(() => groups.value.map(group => {
    const operationOptions = operations(group)
    const selectedIds = selected.value[group.id] || []
    const available = operationOptions.filter(operation => !operation.disabled)
    // 历史不可用操作不被全选新增，但仍允许用户取消整组来显式撤销。
    const checked = selectedIds.length > 0 && available.every(operation => selectedIds.includes(operation.id))
    return { ...group, operationOptions, selectedIds, checked,
      indeterminate: selectedIds.length > 0 && !checked,
      selectionDisabled: !available.length && !selectedIds.length,
      hasUnavailableOperations: operationOptions.some(operation => operation.disabled),
    }
  }))
  const tableSelection = computed(() => {
    const rows = groupRows.value.filter(group => !group.selectionDisabled)
    const checked = rows.length > 0 && rows.every(group => group.checked)
    return { checked, indeterminate: !checked && rows.some(group => group.selectedIds.length > 0), disabled: !rows.length }
  })
  const toggleGroup = (group: ApiGroup, checked: boolean) => {
    if (!loaded.value || loading.value || saving.value) return
    if (checked) selectAll(group)
    else update(group.id, [])
  }
  const toggleAll = (checked: boolean) => {
    for (const group of groupRows.value) if (!group.selectionDisabled) toggleGroup(group, checked)
  }
  const openGroupManager = () => { if (canManageGroups.value) menu.jumpPage(groupMenu, {}) }
  const payload = computed(() => {
    // 授权接口是全量替换。未编辑的授权（含目录暂不可见项）和现有资产范围必须保留。
    const editedGroups = targetType === API_CLIENT_TARGET ? pendingChanges.value : changed.value
    const result = original.value.filter(grant => !editedGroups.includes(grant.groupId))
    for (const groupId of editedGroups) {
      const ids = selected.value[groupId] || []
      if (!ids.length) continue
      const previous = original.value.filter(grant => grant.groupId === groupId)
      if (previous.length) result.push(...updateGroupGrantOperations(previous, ids))
      else result.push({ targetType, targetId: targetId(), groupId, operationIds: ids })
    }
    return result
  })
  const hiddenGrants = computed(() => original.value.some(grant => !groups.value.some(group => group.id === grant.groupId)))
  const assetHint = (group: ApiGroup) => groupAssetHint(group, original.value, targetType === TEMPLATE_GRANT_TARGET)
  const save = async (revokeAll = false) => {
    if (saving.value || !loaded.value || loading.value) return
    if (!revokeAll && targetType === API_CLIENT_TARGET && !pendingChanges.value.length) return
    const current = generation
    saving.value = true; error.value = ''
    try {
      await saveApiGrants(targetId(), revokeAll ? [] : payload.value, targetType)
      if (current !== generation) return
      onlyMessage(t('ApiApplication.message.permissionSaved'))
      saving.value = false
      await load()
    } catch (cause) { if (current === generation) error.value = applicationError(cause, t) }
    finally { if (current === generation) saving.value = false }
  }
  watch(targetId, load, { immediate: true })
  return { groups, original, selected, changed, pendingChanges, loading, saving, loaded, error, hiddenGrants, payload,
    tableColumns, groupRows, tableSelection, toggleGroup, toggleAll,
    update, selectAll, operations, assetHint, canManageGroups, openGroupManager, save, load }
}
