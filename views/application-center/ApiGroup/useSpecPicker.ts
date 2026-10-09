import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import type { QueryPayload } from '@authentication-manager-ui/api/application-center/apiApplication'
import { groupBody, queryRawSpecs } from '@authentication-manager-ui/api/application-center/apiGroupManagement'
import type { RawOpenApiSpec } from '@authentication-manager-ui/api/application-center/apiGroupManagement'
import { groupError, validSpecPermission } from './groupUtils'
interface PickerSource { open: boolean; selectedIds: string[]; knownSpecs: RawOpenApiSpec[] }
export interface SpecSelection { ids: string[]; specs: RawOpenApiSpec[] }
export const useSpecPicker = (source: () => PickerSource) => {
  const { t } = useI18n()
  const selectedIds = ref<string[]>([])
  const known = ref<Record<string, RawOpenApiSpec>>({})
  const params = ref<QueryPayload>({ terms: [] })
  const error = ref('')
  const catalogEmpty = ref(false)
  let generation = 0
  let initialIds = new Set<string>()
  onBeforeUnmount(() => { generation++ })
  watch(() => source().open, open => {
    generation++; error.value = ''; catalogEmpty.value = false; params.value = { terms: [] }
    if (open) {
      initialIds = new Set(source().selectedIds)
      selectedIds.value = [...initialIds]
      known.value = Object.fromEntries(source().knownSpecs.map(spec => [spec.id, spec]))
    }
  }, { immediate: true })
  const columns = computed(() => [
    { title: t('ApiGroupManagement.spec.method'), key: 'method', dataIndex: 'method', width: 90 },
    { title: t('ApiGroupManagement.spec.path'), key: 'path', dataIndex: 'path', width: 250, search: { type: 'string', defaultTermType: 'like' } },
    { title: t('ApiGroupManagement.spec.summary'), key: 'summary', dataIndex: 'summary', ellipsis: true, width: 200, search: { type: 'string', defaultTermType: 'like' } },
    { title: t('ApiGroupManagement.spec.appId'), key: 'appId', dataIndex: 'appId', width: 140, search: { type: 'string', defaultTermType: 'eq' } },
    { title: t('ApiGroupManagement.spec.permissionId'), key: 'permissionId', dataIndex: 'permissionId', width: 150, search: { type: 'string', defaultTermType: 'like' } },
    { title: t('ApiGroupManagement.spec.actions'), key: 'actions', dataIndex: 'actions', scopedSlots: true, width: 150 },
    { title: t('ApiGroupManagement.spec.assetType'), key: 'assetType', dataIndex: 'assetType', width: 120 },
    { title: t('ApiGroupManagement.spec.grantable'), key: 'grantable', dataIndex: 'grantable', scopedSlots: true, width: 100 },
  ])
  const requestPage = async (query: QueryPayload) => {
    const current = generation
    try {
      const response = await queryRawSpecs(query)
      const page = groupBody(response)
      if (!Array.isArray(page.data)) throw new Error('ApiGroupManagement.invalidResponse')
      if (current === generation) {
        error.value = ''
        if (!query.terms?.length) catalogEmpty.value = page.total === 0
        else if (page.data.length) catalogEmpty.value = false
        for (const spec of page.data) known.value[spec.id] = spec
      }
      return response
    } catch (cause) { if (current === generation) error.value = groupError(cause, t); throw cause }
  }
  const handleSearch = ({ filter }: ConditionFilterChangePayload) => { params.value = { terms: filter.terms as QueryPayload['terms'] } }
  const toggle = (row: RawOpenApiSpec, checked: boolean) => {
    if (checked && !validSpecPermission(row)) return
    selectedIds.value = checked ? [...new Set([...selectedIds.value, row.id])] : selectedIds.value.filter(id => id !== row.id)
  }
  const rowSelection = computed(() => ({
    selectedRowKeys: selectedIds.value, preserveSelectedRowKeys: true,
    onSelect: toggle,
    onSelectAll: (checked: boolean, _rows: RawOpenApiSpec[], changedRows: RawOpenApiSpec[]) => { for (const row of changedRows) toggle(row, checked) },
    getCheckboxProps: (row: RawOpenApiSpec) => ({ disabled: !validSpecPermission(row) }),
  }))
  const remove = (id: string) => { selectedIds.value = selectedIds.value.filter(value => value !== id) }
  const unavailable = computed(() => selectedIds.value.filter(id => !validSpecPermission(known.value[id])))
  const validSelection = computed(() => !!selectedIds.value.length && selectedIds.value.every(id => initialIds.has(id) || validSpecPermission(known.value[id])))
  const selection = (): SpecSelection => ({ ids: [...selectedIds.value],
    specs: selectedIds.value.flatMap(id => known.value[id] ? [known.value[id]] : []),
  })
  return { columns, params, error, catalogEmpty, selectedIds, known, unavailable, validSelection, rowSelection, requestPage, handleSearch, remove, selection }
}
