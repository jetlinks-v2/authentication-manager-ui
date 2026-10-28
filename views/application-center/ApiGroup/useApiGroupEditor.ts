import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { createManagedGroup, getManagedGroup, queryLinkedSpecs, updateManagedGroup } from '@authentication-manager-ui/api/application-center/apiGroupManagement'
import type { ApiGroupWrite, ManagedApiGroup, ManagedApiOperation, RawOpenApiSpec } from '@authentication-manager-ui/api/application-center/apiGroupManagement'
import { copyOperations, groupDraft, groupError, groupPayload, groupValue, newGroupDraft, validSpecPermission } from './groupUtils'
import { groupMenu, useGroupPermissions } from './useGroupPermissions'
import type { SpecSelection } from './useSpecPicker'

export type GroupTextField = 'name' | 'description'
export interface OperationEditorContext {
  activeId: string
  permission: string
  readonly: boolean
  busy: boolean
  canSelectSpecs: boolean
}
export const useApiGroupEditor = () => {
  const { t } = useI18n()
  const route = useRoute()
  const menu = useMenuStore()
  const permissions = useGroupPermissions()
  const id = computed(() => typeof route.query.id === 'string' ? route.query.id : '')
  const group = ref<ManagedApiGroup>()
  const draft = ref<ApiGroupWrite>(newGroupDraft())
  const specs = ref<Record<string, RawOpenApiSpec>>({})
  const loading = ref(false)
  const saving = ref(false)
  const ready = ref(false)
  const error = ref('')
  const specError = ref('')
  const activeId = ref('')
  const pickerTarget = ref<string>()
  const newItem = reactive({ id: '', name: '', description: '' })
  const textState = reactive<Record<GroupTextField, { saving: boolean; error: string }>>({
    name: { saving: false, error: '' }, description: { saving: false, error: '' },
  })
  const textSaving = computed(() => textState.name.saving || textState.description.saving)
  const operations = computed(() => group.value ? group.value.operations || [] : draft.value.operations)
  const canSave = computed(() => id.value ? permissions.canUpdate.value : permissions.canCreate.value)
  const editable = computed(() => canSave.value && ready.value && !loading.value && !saving.value)
  const busy = computed(() => saving.value || textSaving.value)
  const linkedIds = computed(() => [...new Set(operations.value.flatMap(item => item.apiSpecIds || []))])
  const unavailable = computed(() => permissions.canSelectSpecs.value
    ? linkedIds.value.filter(specId => !validSpecPermission(specs.value[specId])) : [])
  const statusOptions = computed(() => ['enabled', 'disabled'].map(value => ({ value, label: t('ApiGroupManagement.state.' + value) })))
  const operationContext = computed<OperationEditorContext>(() => ({
    activeId: activeId.value, permission: groupMenu + (id.value ? ':update' : ':add'),
    readonly: !canSave.value, busy: busy.value || loading.value,
    canSelectSpecs: permissions.canSelectSpecs.value,
  }))
  const picker = computed(() => {
    const creating = pickerTarget.value === ''
    const item = operations.value.find(value => value.id === pickerTarget.value)
    return {
      open: pickerTarget.value !== undefined,
      selectedIds: item?.apiSpecIds || [], knownSpecs: Object.values(specs.value),
      context: {
        creating, saving: saving.value, error: error.value,
        title: creating ? t('ApiGroupManagement.operation.add') : t('ApiGroupManagement.spec.manageFor', { name: item?.name || item?.id || '' }),
        confirmText: t(creating ? 'ApiGroupManagement.operation.create' : 'ApiGroupManagement.spec.saveSelection'),
        disabled: !canSave.value || !permissions.canSelectSpecs.value || (creating && !newItem.id.trim()),
        confirmImpact: !creating && !!id.value,
      },
    }
  })
  let generation = 0
  onBeforeUnmount(() => { generation++ })
  const loadSpecs = async (current: number) => {
    if (!linkedIds.value.length || !permissions.canSelectSpecs.value) return
    try {
      const linked = await queryLinkedSpecs(linkedIds.value)
      if (!Array.isArray(linked)) throw new Error('ApiGroupManagement.invalidResponse')
      if (current === generation) specs.value = Object.fromEntries(linked.map(spec => [spec.id, spec]))
    } catch (cause) { if (current === generation) specError.value = t('ApiGroupManagement.specLoadFailed') + ' ' + groupError(cause, t) }
  }
  const load = async () => {
    const current = ++generation
    loading.value = true; ready.value = false; saving.value = false; error.value = ''; specError.value = ''
    group.value = undefined; draft.value = newGroupDraft(); specs.value = {}; pickerTarget.value = undefined; activeId.value = ''
    for (const field of ['name', 'description'] as const) Object.assign(textState[field], { saving: false, error: '' })
    try {
      if (id.value) {
        if (!permissions.canQuery.value) throw new Error('ApiGroupManagement.noQueryPermission')
        const value = await getManagedGroup(id.value)
        if (current !== generation) return
        if (!value?.id || value.id !== id.value || !Array.isArray(value.assetTypes) || !['enabled', 'disabled'].includes(groupValue(value.status) || '')) throw new Error('ApiGroupManagement.invalidResponse')
        group.value = value; draft.value = groupDraft(value); activeId.value = value.operations?.[0]?.id || ''
      } else if (!permissions.canCreate.value) throw new Error('ApiGroupManagement.noSavePermission')
      ready.value = true
      await loadSpecs(current)
    } catch (cause) { if (current === generation) error.value = groupError(cause, t) }
    finally { if (current === generation) loading.value = false }
  }
  const saveText = async (field: GroupTextField, value: string) => {
    if (!group.value || !permissions.canUpdate.value || saving.value || textState[field].saving) return
    const next = value.trim()
    draft.value[field] = next
    const state = textState[field]
    state.error = field === 'name' && !next ? t('ApiGroupManagement.nameRequired')
      : field === 'name' && next.length > 64 ? t('ApiGroupManagement.nameTooLong') : ''
    if (state.error || next === (group.value[field] || '')) return
    const current = generation
    const groupId = group.value.id
    state.saving = true
    try {
      // 行内保存只提交当前字段，名称与说明同时修改时不会相互覆盖。
      await updateManagedGroup(groupId, { [field]: next })
      if (current !== generation || !group.value) return
      group.value[field] = next
      onlyMessage(t('ApiGroupManagement.fieldSaved', { field: t('ApiGroupManagement.' + field) }))
    } catch (cause) { if (current === generation) state.error = groupError(cause, t) }
    finally { if (current === generation) state.saving = false }
  }
  const persistPatch = async (payload: Partial<ApiGroupWrite>, successKey: string, refreshAssets = false) => {
    if (!group.value || busy.value) return false
    const current = generation
    const groupId = group.value.id
    saving.value = true; error.value = ''
    try {
      await updateManagedGroup(groupId, payload)
      if (current !== generation || !group.value) return false
      Object.assign(group.value, payload)
      if (refreshAssets) await refreshAssetTypes(current)
      if (current !== generation) return false
      onlyMessage(t(successKey))
      return true
    } catch (cause) { if (current === generation) error.value = groupError(cause, t); return false }
    finally { if (current === generation) saving.value = false }
  }
  const refreshAssetTypes = async (current: number) => {
    const groupId = group.value?.id
    if (!groupId) return
    try {
      // 关联变更后重新读取服务端推导的资产归属；读失败不否定已完成的保存。
      const value = await getManagedGroup(groupId)
      if (!Array.isArray(value?.assetTypes)) throw new Error('ApiGroupManagement.invalidResponse')
      if (current === generation && group.value) { group.value.assetTypes = value.assetTypes; specError.value = '' }
    } catch (cause) { if (current === generation) specError.value = t('ApiGroupManagement.assetRefreshFailed') + ' ' + groupError(cause, t) }
  }
  const saveOperations = async (next: ManagedApiOperation[], successKey: string, refreshAssets = false) => {
    if (!id.value) { draft.value.operations = next; return true }
    return persistPatch({ operations: next }, successKey, refreshAssets)
  }
  const selectOperation = (operationId: string) => { if (!busy.value) activeId.value = operationId }
  const addOperation = () => {
    if (!editable.value || busy.value || !permissions.canSelectSpecs.value) return
    Object.assign(newItem, { id: '', name: '', description: '' })
    error.value = ''; pickerTarget.value = ''
  }
  const updateOperation = async (operationId: string, field: GroupTextField, value: string) => {
    if (!editable.value || busy.value) return
    const item = operations.value.find(entry => entry.id === operationId)
    const nextValue = value.trim()
    if (!item || nextValue === (item[field] || '')) return
    const next = copyOperations(operations.value).map(entry => entry.id === operationId ? { ...entry, [field]: nextValue } : entry)
    await saveOperations(next, 'ApiGroupManagement.operation.saved')
  }
  const removeOperation = async (operationId: string) => {
    if (!editable.value || busy.value) return
    const next = copyOperations(operations.value).filter(entry => entry.id !== operationId)
    if (await saveOperations(next, 'ApiGroupManagement.operation.removed', true)) {
      if (activeId.value === operationId) activeId.value = next[0]?.id || ''
    }
  }
  const selectSpecs = (operationId: string) => {
    if (!editable.value || busy.value || !permissions.canSelectSpecs.value) return
    error.value = ''; pickerTarget.value = operationId
  }
  const closePicker = () => { if (!saving.value) pickerTarget.value = undefined }
  const acceptSelection = async (selection: SpecSelection) => {
    if (!editable.value || busy.value || !permissions.canSelectSpecs.value || pickerTarget.value === undefined) return
    const creating = pickerTarget.value === ''
    const item: ManagedApiOperation | undefined = creating ? { ...newItem, id: newItem.id.trim(), name: newItem.name.trim(), description: newItem.description.trim(), apiSpecIds: [] }
      : operations.value.find(entry => entry.id === pickerTarget.value)
    if (!item) return
    error.value = !item.id ? t('ApiGroupManagement.operation.idRequired')
      : creating && operations.value.some(entry => entry.id === item.id) ? t('ApiGroupManagement.operation.idDuplicate')
        : creating && !selection.ids.length ? t('ApiGroupManagement.operation.specsRequired') : ''
    if (error.value) return
    const known = { ...specs.value, ...Object.fromEntries(selection.specs.map(spec => [spec.id, spec])) }
    if (selection.ids.some(specId => !item.apiSpecIds.includes(specId) && !validSpecPermission(known[specId]))) {
      error.value = t('ApiGroupManagement.spec.invalidSelection'); return
    }
    const nextItem: ManagedApiOperation = { ...item, apiSpecIds: [...new Set(selection.ids)] }
    const next = copyOperations(creating ? [...operations.value, nextItem] : operations.value.map(entry => entry.id === item.id ? nextItem : entry))
    if (await saveOperations(next, 'ApiGroupManagement.operation.saved', true)) {
      specs.value = known; activeId.value = item.id; pickerTarget.value = undefined
    }
  }
  const toggle = async () => {
    if (!permissions.canChangeStatus.value || !group.value || busy.value) return
    const status = groupValue(group.value.status) === 'enabled' ? 'disabled' : 'enabled'
    if (await persistPatch({ status }, 'ApiGroupManagement.statusSaved')) draft.value.status = status
  }
  const createGroup = async () => {
    if (!editable.value || id.value) return
    const name = draft.value.name.trim()
    error.value = !name ? t('ApiGroupManagement.nameRequired') : name.length > 64 ? t('ApiGroupManagement.nameTooLong') : ''
    if (error.value) return
    const current = generation
    saving.value = true
    try {
      const created = await createManagedGroup(groupPayload(draft.value, new Set()))
      if (!created?.id) throw new Error('ApiGroupManagement.invalidResponse')
      if (current !== generation) return
      onlyMessage(t('ApiGroupManagement.created'))
      menu.jumpPage(groupMenu + '/Save', { query: { id: created.id } })
    } catch (cause) { if (current === generation) error.value = groupError(cause, t) }
    finally { if (current === generation) saving.value = false }
  }
  const back = () => menu.jumpPage(groupMenu, {})
  watch(id, load, { immediate: true })
  return { ...permissions, groupMenu, id, group, draft, operations, newItem, loading, saving, ready, error, specError, canSave, editable,
    busy, textState, statusOptions, unavailable, specs, operationContext, picker,
    load, saveText, selectOperation, addOperation, updateOperation, removeOperation, selectSpecs, closePicker, acceptSelection, toggle, createGroup, back }
}
