import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Modal } from 'ant-design-vue'
import { onlyMessage } from '@jetlinks-web/utils'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { createManagedGroup, getManagedGroup, queryLinkedSpecs, updateManagedGroup } from '@authentication-manager-ui/api/application-center/apiGroupManagement'
import type { ApiGroupWrite, ManagedApiGroup, ManagedApiOperation, RawOpenApiSpec } from '@authentication-manager-ui/api/application-center/apiGroupManagement'
import { groupDraft, groupError, groupPayload, groupValue, newGroupDraft, operationsChanged, validSpecPermission } from './groupUtils'
import { groupMenu, useGroupPermissions } from './useGroupPermissions'
import type { SpecSelection } from './useSpecPicker'

export interface OperationEditorContext {
  rows: { key: number; locked: boolean }[]
  readonly: boolean
  canSelectSpecs: boolean
}
export const useApiGroupEditor = () => {
  const { t } = useI18n()
  const route = useRoute()
  const menu = useMenuStore()
  const permissions = useGroupPermissions()
  const id = computed(() => typeof route.query.id === 'string' ? route.query.id : '')
  const original = ref<ManagedApiGroup>()
  const draft = ref<ApiGroupWrite>(newGroupDraft())
  const rows = ref<OperationEditorContext['rows']>([])
  const specs = ref<Record<string, RawOpenApiSpec>>({})
  const loading = ref(false)
  const saving = ref(false)
  const ready = ref(false)
  const error = ref('')
  const specError = ref('')
  const pickerIndex = ref<number>()
  let generation = 0
  let nextKey = 0
  onBeforeUnmount(() => { generation++ })
  const canSave = computed(() => id.value ? permissions.canUpdate.value : permissions.canCreate.value)
  const editable = computed(() => canSave.value && ready.value && !loading.value && !saving.value)
  const stableIds = computed(() => new Set((original.value?.operations || []).map(operation => operation.id)))
  const linkedIds = computed(() => [...new Set(draft.value.operations.flatMap(operation => operation.apiSpecIds))])
  const unavailable = computed(() => linkedIds.value.filter(specId => !validSpecPermission(specs.value[specId])))
  const linkedAssetTypes = computed(() => {
    const savedIds = new Set(original.value?.operations?.flatMap(operation => operation.apiSpecIds || []) || [])
    // 未调整关联时使用服务端权威归属；仅修改名称或无接口查询权限，不应把资产显示为空。
    if (original.value && savedIds.size === linkedIds.value.length && linkedIds.value.every(specId => savedIds.has(specId))) return original.value.assetTypes
    return [...new Set(linkedIds.value.flatMap(specId => validSpecPermission(specs.value[specId]) && specs.value[specId].assetType ? [specs.value[specId].assetType!] : []))].sort()
  })
  const statusOptions = computed(() => ['enabled', 'disabled'].map(value => ({ value, label: t('ApiGroupManagement.state.' + value) })))
  const operationContext = computed<OperationEditorContext>(() => ({ rows: rows.value, readonly: !editable.value, canSelectSpecs: permissions.canSelectSpecs.value }))
  const picker = computed(() => ({ open: pickerIndex.value !== undefined,
    selectedIds: pickerIndex.value === undefined ? [] : draft.value.operations[pickerIndex.value]?.apiSpecIds || [],
    knownSpecs: Object.values(specs.value),
  }))
  const loadSpecs = async (current: number) => {
    const ids = linkedIds.value
    if (!ids.length || !permissions.canSelectSpecs.value) return
    try {
      const linked = await queryLinkedSpecs(ids)
      if (!Array.isArray(linked)) throw new Error('ApiGroupManagement.invalidResponse')
      if (current === generation) specs.value = Object.fromEntries(linked.map(spec => [spec.id, spec]))
    } catch (cause) { if (current === generation) specError.value = t('ApiGroupManagement.specLoadFailed') + ' ' + groupError(cause, t) }
  }
  const load = async () => {
    const current = ++generation
    loading.value = true; ready.value = false; saving.value = false; error.value = ''; specError.value = ''
    original.value = undefined; draft.value = newGroupDraft(); rows.value = []; specs.value = {}; pickerIndex.value = undefined
    try {
      if (id.value) {
        if (!permissions.canQuery.value) throw new Error('ApiGroupManagement.noQueryPermission')
        const group = await getManagedGroup(id.value)
        if (current !== generation) return
        if (!group?.id || group.id !== id.value || !Array.isArray(group.assetTypes) || !['enabled', 'disabled'].includes(groupValue(group.status) || '')) throw new Error('ApiGroupManagement.invalidResponse')
        original.value = group; draft.value = groupDraft(group)
        rows.value = draft.value.operations.map(() => ({ key: nextKey++, locked: true }))
      } else if (!permissions.canCreate.value) throw new Error('ApiGroupManagement.noSavePermission')
      ready.value = true
      await loadSpecs(current)
    } catch (cause) { if (current === generation) error.value = groupError(cause, t) }
    finally { if (current === generation) loading.value = false }
  }
  watch(id, load, { immediate: true })
  const addOperation = () => {
    if (!editable.value) return
    draft.value.operations.push({ id: '', name: '', description: '', apiSpecIds: [] })
    rows.value.push({ key: nextKey++, locked: false })
  }
  const updateOperation = (index: number, patch: Partial<Pick<ManagedApiOperation, 'id' | 'name' | 'description'>>) => {
    if (!editable.value) return
    const operation = draft.value.operations[index]
    if (!operation || (rows.value[index].locked && patch.id !== undefined)) return
    Object.assign(operation, patch)
  }
  const removeOperation = (index: number) => {
    if (!editable.value) return
    draft.value.operations.splice(index, 1); rows.value.splice(index, 1)
  }
  const selectSpecs = (index: number) => { if (editable.value && permissions.canSelectSpecs.value) pickerIndex.value = index }
  const closePicker = () => { pickerIndex.value = undefined }
  const acceptSelection = (selection: SpecSelection) => {
    if (!editable.value || !permissions.canSelectSpecs.value || pickerIndex.value === undefined) return
    const operation = draft.value.operations[pickerIndex.value]
    if (!operation) return
    for (const spec of selection.specs) specs.value[spec.id] = spec
    operation.apiSpecIds = [...new Set(selection.ids)]
    closePicker()
  }
  const validate = () => {
    if (!draft.value.name?.trim()) return t('ApiGroupManagement.nameRequired')
    if (draft.value.name.trim().length > 64) return t('ApiGroupManagement.nameTooLong')
    if (!['enabled', 'disabled'].includes(draft.value.status)) return t('ApiGroupManagement.statusRequired')
    const used = new Set<string>()
    for (const [index, operation] of draft.value.operations.entries()) {
      const operationId = operation.id.trim()
      const label = t('ApiGroupManagement.operation.position', { index: index + 1 })
      if (!operationId) return label + ': ' + t('ApiGroupManagement.operation.idRequired')
      if (used.has(operationId)) return label + ': ' + t('ApiGroupManagement.operation.idDuplicate')
      used.add(operationId)
      if (!operation.apiSpecIds.length) return label + ': ' + t('ApiGroupManagement.operation.specsRequired')
      const retainedIds = original.value?.operations?.find(saved => saved.id === operation.id)?.apiSpecIds || []
      if (operation.apiSpecIds.some(specId => !retainedIds.includes(specId) && !validSpecPermission(specs.value[specId]))) return label + ': ' + t('ApiGroupManagement.spec.invalidSelection')
    }
    return ''
  }
  const persist = async (current: number, groupId: string, payload: ApiGroupWrite) => {
    if (current !== generation) return
    try {
      if (groupId) await updateManagedGroup(groupId, payload)
      else {
        const created = await createManagedGroup(payload)
        if (!created?.id) throw new Error('ApiGroupManagement.invalidResponse')
        if (current !== generation) return
        onlyMessage(t('ApiGroupManagement.saved'))
        menu.jumpPage(groupMenu + '/Save', { query: { id: created.id } })
        return
      }
      if (current !== generation) return
      original.value = { id: groupId, ...payload }; draft.value = groupDraft(original.value)
      rows.value = rows.value.map(row => ({ ...row, locked: true }))
      onlyMessage(t('ApiGroupManagement.saved'))
    } catch (cause) { if (current === generation) error.value = groupError(cause, t) }
    finally { if (current === generation) saving.value = false }
  }
  const save = () => {
    if (!editable.value) return
    error.value = validate()
    if (error.value) return
    const current = generation
    const payload = groupPayload(draft.value, stableIds.value)
    const groupId = id.value
    const affectsGrants = original.value && (
      operationsChanged(original.value, payload)
      || (groupValue(original.value.status) === 'enabled' && payload.status === 'disabled')
    )
    saving.value = true
    if (affectsGrants) Modal.confirm({ title: t('ApiGroupManagement.impactTitle'), content: t('ApiGroupManagement.saveImpactConfirm'),
      okText: t('ApiGroupManagement.save'), cancelText: t('ApiGroupManagement.cancel'),
      onOk: () => persist(current, groupId, payload), onCancel: () => { if (current === generation) saving.value = false },
    })
    else void persist(current, groupId, payload)
  }
  const back = () => menu.jumpPage(groupMenu, {})
  return { ...permissions, groupMenu, id, draft, loading, saving, ready, error, specError, canSave, editable,
    statusOptions, unavailable, linkedAssetTypes, specs, operationContext, picker,
    addOperation, updateOperation, removeOperation, selectSpecs, closePicker, acceptSelection, save, back }
}
