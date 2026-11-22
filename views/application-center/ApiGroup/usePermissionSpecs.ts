import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SpecPermissionResource } from './specPermissionResources'
import { useLocalTextFilter } from './useLocalTextFilter'
import { useSpecActionLabel } from './useSpecActionLabel'
import { useSpecTablePagination } from './useSpecTablePagination'

interface PermissionSpecsSource {
  resources: SpecPermissionResource[]
  selectedIds: string[]
  readonly: boolean
}

export const usePermissionSpecs = (source: PermissionSpecsSource) => {
  const { t } = useI18n()
  const actionLabel = useSpecActionLabel()
  const page = ref(1)
  const pickerPagination = useSpecTablePagination()
  const pageSize = ref(source.readonly ? 12 : pickerPagination.defaultPageSize)
  const { filterFields, filtered, search } = useLocalTextFilter(() => source.resources, () => [
    { title: t('ApiGroupManagement.spec.resource'), dataIndex: 'name' },
    { title: t('ApiGroupManagement.spec.appId'), dataIndex: 'appId' },
    { title: t('ApiGroupManagement.spec.permissionId'), dataIndex: 'permissionId' },
  ], (row, column) => row[column as keyof SpecPermissionResource])
  const columns = computed(() => [
    { title: t('ApiGroupManagement.spec.resource'), key: 'resource', width: '44%' },
    { title: t('ApiGroupManagement.spec.actions'), key: 'actions' },
  ])
  const selected = computed(() => new Set(source.selectedIds))
  const selectionState = (ids: string[]) => {
    const count = ids.filter(id => selected.value.has(id)).length
    return { checked: ids.length > 0 && count === ids.length, indeterminate: count > 0 && count < ids.length }
  }
  const rows = computed(() => filtered.value.map(resource => ({ ...resource, ...selectionState(resource.ids),
    resourceMeta: resource.appId ? `${resource.appId} · ${resource.permissionId}` : resource.permissionId,
    actions: resource.actions.map(action => ({
      ...action,
      ...selectionState(action.ids),
      label: action.actions.map(actionLabel).join(' + '),
    })),
  })))
  const pageIds = computed(() => filtered.value
    .slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
    .flatMap(resource => resource.ids))
  const pageSelection = computed(() => selectionState(pageIds.value))
  const pagination = computed(() => ({
    ...(source.readonly ? { showSizeChanger: false, hideOnSinglePage: true } : pickerPagination),
    current: page.value, pageSize: pageSize.value,
    onChange: (current: number, size: number) => {
      page.value = size === pageSize.value ? current : 1
      pageSize.value = size
    },
  }))
  watch(filtered, () => { page.value = 1 })
  return { filterFields, search, columns, rows, pagination, pageIds, pageSelection }
}
