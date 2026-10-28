import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ConditionFilterChangePayload, ConditionFilterTerm } from '@jetlinks-web-core/components/ConditionFilter'
import type { QueryPayload } from '@authentication-manager-ui/api/application-center/apiApplication'
import { groupBody, queryRawSpecs, querySpecCatalog } from '@authentication-manager-ui/api/application-center/apiGroupManagement'
import type { RawOpenApiSpec } from '@authentication-manager-ui/api/application-center/apiGroupManagement'
import { groupError, validSpecPermission } from './groupUtils'
import { buildSpecPermissionResources } from './specPermissionResources'
import { specTextFields, useLocalTextFilter } from './useLocalTextFilter'
export interface SpecPickerContext {
  creating: boolean
  saving: boolean
  error: string
  title: string
  confirmText: string
  disabled: boolean
  confirmImpact: boolean
}
interface PickerSource { open: boolean; selectedIds: string[]; knownSpecs: RawOpenApiSpec[]; disabled: boolean }
export interface SpecSelection { ids: string[]; specs: RawOpenApiSpec[] }
export const useSpecPicker = (source: () => PickerSource) => {
  const { t } = useI18n()
  const selectedIds = ref<string[]>([])
  const known = ref<Record<string, RawOpenApiSpec>>({})
  const params = ref<QueryPayload>({ terms: [] })
  const error = ref('')
  const catalogError = ref('')
  const catalogLoading = ref(false)
  const catalogReady = ref(false)
  const catalog = ref<RawOpenApiSpec[]>([])
  const mode = ref('permissions')
  const selectedPage = ref(1)
  const selectedPageSize = ref(12)
  let generation = 0
  let initialIds = new Set<string>()
  const { filterFields: selectedFilterFields, filtered: selectedRows, search: applySelectedSearch, reset: resetSelected } = useLocalTextFilter(
    () => selectedIds.value, () => specTextFields(t),
    (id, column) => column === 'id' ? id : known.value[id]?.[column as keyof RawOpenApiSpec],
  )
  const searchSelected = (terms: ConditionFilterTerm[]) => { selectedPage.value = 1; applySelectedSearch(terms) }
  const selectedRecords = computed(() => selectedRows.value.map(id => ({ id, spec: known.value[id] })))
  const selectedPagination = computed(() => ({
    current: selectedPage.value, pageSize: selectedPageSize.value, showSizeChanger: true, pageSizeOptions: ['12', '24', '48', '96'],
    onChange: (current: number, size: number) => {
      selectedPage.value = size === selectedPageSize.value ? current : 1
      selectedPageSize.value = size
    },
  }))
  watch(() => selectedRows.value.length, total => {
    selectedPage.value = Math.min(selectedPage.value, Math.max(1, Math.ceil(total / selectedPageSize.value)))
  })
  const loadCatalog = async () => {
    const current = generation
    catalogLoading.value = true; catalogError.value = ''; catalogReady.value = false
    try {
      const specs = await querySpecCatalog()
      if (!Array.isArray(specs)) throw new Error('ApiGroupManagement.invalidResponse')
      if (current !== generation) return
      catalog.value = specs
      for (const spec of specs) known.value[spec.id] = spec
      catalogReady.value = true
    } catch (cause) { if (current === generation) catalogError.value = groupError(cause, t) }
    finally { if (current === generation) catalogLoading.value = false }
  }
  onBeforeUnmount(() => { generation++ })
  watch(() => source().open, open => {
    generation++; error.value = ''; catalogError.value = ''; catalogReady.value = false
    catalog.value = []; catalogLoading.value = false; mode.value = 'permissions'; params.value = { terms: [] }; resetSelected()
    selectedPage.value = 1; selectedPageSize.value = 12
    if (open) {
      initialIds = new Set(source().selectedIds)
      selectedIds.value = [...initialIds]
      known.value = Object.fromEntries(source().knownSpecs.map(spec => [spec.id, spec]))
      void loadCatalog()
    }
  }, { immediate: true })
  const resources = computed(() => buildSpecPermissionResources(catalog.value))
  const columns = computed(() => [
    { title: t('ApiGroupManagement.spec.summary'), key: 'identity', dataIndex: 'summary', scopedSlots: true, width: '28%' },
    { title: t('ApiGroupManagement.spec.endpoint'), key: 'endpoint', dataIndex: 'path', scopedSlots: true },
    { title: t('ApiGroupManagement.spec.appId'), key: 'appId', dataIndex: 'appId', scopedSlots: true, width: 240 },
    { title: t('ApiGroupManagement.spec.details'), key: 'details', dataIndex: 'details', scopedSlots: true, width: 80 },
  ])
  const selectedColumns = computed(() => [
    ...columns.value.map(({ title, key, width }) => ({ title, key, width })),
    { title: t('ApiGroupManagement.spec.remove'), key: 'remove', width: 80 },
  ])
  const filterColumns = computed(() => [
    { title: t('ApiGroupManagement.spec.summary'), dataIndex: 'summary', search: { type: 'string', defaultTermType: 'like' } },
    { title: t('ApiGroupManagement.spec.path'), dataIndex: 'path', search: { type: 'string', defaultTermType: 'like' } },
    { title: t('ApiGroupManagement.spec.method'), dataIndex: 'method', search: { type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map(value => ({ label: value, value })) } },
    { title: t('ApiGroupManagement.spec.appId'), dataIndex: 'appId', search: { type: 'string', defaultTermType: 'eq' } },
    { title: t('ApiGroupManagement.spec.permissionId'), dataIndex: 'permissionId', search: { type: 'string', defaultTermType: 'eq' } },
  ])
  const requestPage = async (query: QueryPayload) => {
    const current = generation
    try {
      const response = await queryRawSpecs(query)
      const page = groupBody(response)
      if (!Array.isArray(page.data)) throw new Error('ApiGroupManagement.invalidResponse')
      if (current === generation) {
        error.value = ''
        for (const spec of page.data) known.value[spec.id] = spec
      }
      return response
    } catch (cause) { if (current === generation) error.value = groupError(cause, t); throw cause }
  }
  const handleSearch = ({ filter }: ConditionFilterChangePayload) => { params.value = { terms: filter.terms as QueryPayload['terms'] } }
  const toggleIds = (ids: string[], checked: boolean) => {
    if (source().disabled) return
    const changedIds = new Set(ids.filter(id => !checked || validSpecPermission(known.value[id])))
    selectedIds.value = checked ? [...new Set([...selectedIds.value, ...changedIds])] : selectedIds.value.filter(id => !changedIds.has(id))
  }
  const rowSelection = computed(() => ({
    selectedRowKeys: selectedIds.value, preserveSelectedRowKeys: true, columnWidth: 44,
    onSelect: (row: RawOpenApiSpec, checked: boolean) => toggleIds([row.id], checked),
    onSelectAll: (checked: boolean, _rows: RawOpenApiSpec[], changedRows: RawOpenApiSpec[]) => toggleIds(changedRows.map(row => row.id), checked),
    getCheckboxProps: (row: RawOpenApiSpec) => ({ disabled: source().disabled || !validSpecPermission(row) }),
  }))
  const remove = (id: string) => toggleIds([id], false)
  const unavailable = computed(() => selectedIds.value.filter(id => !validSpecPermission(known.value[id])))
  const validSelection = computed(() => selectedIds.value.every(id => initialIds.has(id) || validSpecPermission(known.value[id])))
  const changed = computed(() => initialIds.size !== selectedIds.value.length || selectedIds.value.some(id => !initialIds.has(id)))
  const selection = (): SpecSelection => ({ ids: [...selectedIds.value],
    specs: selectedIds.value.flatMap(id => known.value[id] ? [known.value[id]] : []),
  })
  return { columns, filterColumns, params, error, selectedIds, selectedFilterFields, selectedColumns, selectedRecords, selectedPagination, searchSelected,
    mode, resources, catalogLoading, catalogReady, catalogError, loadCatalog, toggleIds,
    unavailable, validSelection, changed, rowSelection, requestPage, handleSearch, remove, selection }
}
