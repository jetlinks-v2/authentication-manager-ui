import { computed, watch } from 'vue'
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
  const { filterFields, filtered, search } = useLocalTextFilter(() => source.resources, () => [
    { title: t('ApiGroupManagement.spec.resource'), dataIndex: 'name' },
    { title: t('ApiGroupManagement.spec.appId'), dataIndex: 'appId' },
    { title: t('ApiGroupManagement.spec.permissionId'), dataIndex: 'permissionId' },
  ], (row, column) => row[column as keyof SpecPermissionResource])
  const { page, pageSize, slicePage, pagination } = useSpecTablePagination(() => filtered.value.length)
  const columns = computed(() => [
    { title: t('ApiGroupManagement.spec.resource'), key: 'resource', width: '44%' },
    { title: t('ApiGroupManagement.spec.actions'), key: 'actions' },
  ])
  const selected = computed(() => new Set(source.selectedIds))
  const selectionState = (ids: string[]) => {
    const count = ids.filter(id => selected.value.has(id)).length
    return { checked: ids.length > 0 && count === ids.length, indeterminate: count > 0 && count < ids.length }
  }
  const visible = computed(() => source.readonly ? filtered.value : slicePage(filtered.value))
  const rows = computed(() => visible.value.map(resource => ({ ...resource, ...selectionState(resource.ids),
    resourceMeta: resource.appId ? `${resource.appId} · ${resource.permissionId}` : resource.permissionId,
    actions: resource.actions.map(action => ({
      ...action,
      ...selectionState(action.ids),
      label: action.actions.map(actionLabel).join(' + '),
    })),
  })))
  const pageIds = computed(() => visible.value.flatMap(resource => resource.ids))
  const pageSelection = computed(() => selectionState(pageIds.value))
  const readonlyPagination = computed(() => ({
    current: page.value, pageSize: pageSize.value, showSizeChanger: false, hideOnSinglePage: true,
    onChange: (current: number) => { page.value = current },
  }))
  watch(filtered, () => { page.value = 1 })
  return { filterFields, search, columns, rows, pagination, readonlyPagination, pageIds, pageSelection }
}
