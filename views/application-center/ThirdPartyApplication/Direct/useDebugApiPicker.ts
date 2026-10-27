import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ConditionFilterTerm } from '@jetlinks-web-core/components/ConditionFilter'
import { buildSpecPermissionResources } from '../../ApiGroup/specPermissionResources'
import { useLocalTextFilter } from '../../ApiGroup/useLocalTextFilter'
import type { DebugApi } from './accessDebugUtils'

interface ControllerGroup { key: string; name: string; appId: string; ids: string[] }
interface ApiRow { id: string; controller: ControllerGroup; api: DebugApi }

export const useDebugApiPicker = (context: {
  apis: DebugApi[]; modelValue?: string; disabled?: boolean
}, onSelect: (id: string) => void) => {
  const { t } = useI18n()
  const terms = ref<ConditionFilterTerm[]>([])
  const page = ref(1)
  const opened = ref(false)
  const toggleRef = ref<{ $el: HTMLButtonElement }>()
  const apiById = computed(() => new Map(context.apis.map(api => [api.id, api])))
  const currentApi = computed(() => context.modelValue ? apiById.value.get(context.modelValue) : undefined)
  const expanded = computed(() => opened.value || !currentApi.value)
  const controllers = computed<ControllerGroup[]>(() => {
    const groups: ControllerGroup[] = buildSpecPermissionResources(context.apis)
    const classified = new Set(groups.flatMap(group => group.ids))
    const remaining = context.apis.filter(api => !classified.has(api.id))
    if (remaining.length) groups.push({
      key: 'unclassified', name: t('ThirdPartyApplication.debug.ungroupedApis'), appId: '', ids: remaining.map(api => api.id),
    })
    return groups
  })
  const searchable = computed<ApiRow[]>(() => controllers.value.flatMap(controller => controller.ids.map(id => ({ id, controller, api: apiById.value.get(id)! }))))
  const { filterFields, filtered: rows, search: filter } = useLocalTextFilter(() => searchable.value, () => [
    { title: t('ThirdPartyApplication.debug.searchAll'), dataIndex: 'keyword' },
    { title: 'Controller', dataIndex: 'controller' },
    { title: t('ApiGroupManagement.spec.summary'), dataIndex: 'summary' },
    { title: t('ApiGroupManagement.spec.path'), dataIndex: 'path' },
    { title: t('ApiGroupManagement.spec.method'), dataIndex: 'method' },
    { title: t('ApiGroupManagement.spec.appId'), dataIndex: 'appId' },
  ], (row, column) => column === 'keyword' ? [row.controller.name, row.api.label, row.api.appId]
    : column === 'controller' ? row.controller.name : row.api[column as keyof DebugApi])
  const columns = computed(() => [
    { key: 'name', title: t('ApiGroupManagement.spec.summary'), width: '30%' },
    { key: 'endpoint', title: t('ThirdPartyApplication.debug.methodPath'), width: '50%' },
    { key: 'controller', title: 'Controller', width: '20%' },
  ])
  const pagination = computed(() => ({
    current: page.value, pageSize: 8, total: rows.value.length, showSizeChanger: false,
    hideOnSinglePage: true, size: 'small' as const, disabled: context.disabled,
  }))
  const changePage = (value: { current?: number }) => { page.value = value.current || 1 }
  const rowClassName = (row: ApiRow) => row.id === context.modelValue ? 'ant-table-row-selected' : ''
  const search = (value: ConditionFilterTerm[]) => {
    terms.value = value; filter(value)
  }
  const toggle = () => { if (!context.disabled) opened.value = !expanded.value }
  const select = async (id: string) => {
    if (context.disabled || !apiById.value.has(id)) return
    onSelect(id)
    // 收起列表时保留筛选与分页，键盘焦点返回切换按钮，不落到隐藏的接口名称上。
    opened.value = false
    await nextTick()
    toggleRef.value?.$el.focus()
  }
  watch(rows, () => { page.value = 1 })
  return { terms, filterFields, currentApi, expanded, toggleRef, rows, columns,
    pagination, rowClassName, changePage, search, toggle, select }
}
