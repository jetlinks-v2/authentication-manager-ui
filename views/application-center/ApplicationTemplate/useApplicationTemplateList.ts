import { computed, h, reactive, ref } from 'vue'
import { Modal } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { onlyMessage } from '@jetlinks-web/utils'
import HeaderSearchTrigger from './components/HeaderSearchTrigger.vue'
import {
  APPLICATION_TEMPLATE_TAG_TARGET_TYPE,
  deleteApplicationTemplate,
  queryApplicationTemplates,
  updateApplicationTemplateStatus,
} from '@authentication-manager-ui/api/application-center/applicationTemplate'

const stateValue = (value: unknown) => {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>
    return String(item.value || item.text || 'enabled')
  }
  return 'enabled'
}

export const useApplicationTemplateList = () => {
  const { t: $t } = useI18n()
  const menuStore = useMenuStore()
  const permission = 'application-center/ApplicationTemplate'
  const selectedTagIds = ref<string[]>([])
  const tableRef = ref<Record<string, any>>({})
  const tableLoading = ref(false)
  const createDialogOpen = ref(false)
  const columnFilters = reactive({
    name: '',
    code: '',
    state: undefined as string | undefined,
  })

  const refresh = () => tableRef.value?.reload?.()
  const setColumnFilter = (key: keyof typeof columnFilters, value?: string) => {
    const nextValue = value ?? ''
    if ((columnFilters[key] || '') === nextValue) return
    if (key === 'state') columnFilters.state = nextValue || undefined
    else columnFilters[key] = nextValue
    refresh()
  }
  const renderHeaderSearch = (
    key: keyof typeof columnFilters,
    label: string,
    placeholder: string,
    type: 'input' | 'select' = 'input',
    options: Array<{ label: string; value: string }> = [],
  ) => () => h(HeaderSearchTrigger, {
    label,
    value: columnFilters[key],
    placeholder,
    type,
    options,
    onConfirm: (value?: string) => setColumnFilter(key, value),
    onReset: () => setColumnFilter(key),
  })

  const columns = computed(() => [
    {
      title: renderHeaderSearch('name', $t('ApplicationTemplate.field.name'), $t('ApplicationTemplate.field.namePlaceholder')),
      dataIndex: 'name', key: 'name', ellipsis: true, scopedSlots: true,
    },
    {
      title: renderHeaderSearch('code', $t('ApplicationTemplate.field.code'), $t('ApplicationTemplate.field.codePlaceholder')),
      dataIndex: 'code', key: 'code', ellipsis: true,
    },
    {
      title: $t('ApplicationTemplate.field.description'),
      dataIndex: 'description', key: 'description', ellipsis: true,
    },
    {
      title: renderHeaderSearch(
        'state',
        $t('ApplicationTemplate.field.state'),
        $t('ApplicationTemplate.field.statePlaceholder'),
        'select',
        [
          { label: $t('ApplicationTemplate.common.enabled'), value: 'enabled' },
          { label: $t('ApplicationTemplate.common.disabled'), value: 'disabled' },
        ],
      ),
      dataIndex: 'state', key: 'state', width: 100, scopedSlots: true,
    },
    {
      title: $t('ApplicationTemplate.common.action'),
      dataIndex: 'action', key: 'action', width: 150, scopedSlots: true,
    },
  ])
  const defaultParams = {
    sorts: [
      { name: 'sortIndex', order: 'asc' },
      { name: 'createTime', order: 'desc' },
    ],
  }
  const tableParams = computed(() => {
    const terms: Array<Record<string, unknown>> = []
    ;(['name', 'code'] as const).forEach(key => {
      const value = columnFilters[key].trim()
      if (value) terms.push({ column: key, termType: 'like', value })
    })
    if (columnFilters.state) terms.push({ column: 'state', termType: 'eq', value: columnFilters.state })
    if (selectedTagIds.value.length) {
      terms.push({
        column: 'id$common-tag-bind',
        value: [
          { column: 'targetType', termType: 'eq', value: APPLICATION_TEMPLATE_TAG_TARGET_TYPE },
          { column: 'tagId$common-tag-child', value: [...selectedTagIds.value] },
        ],
      })
    }
    return { terms }
  })

  const requestTable = async (params: Record<string, unknown>) => {
    tableLoading.value = true
    try {
      return await queryApplicationTemplates(params)
    } finally {
      tableLoading.value = false
    }
  }

  const viewDetail = (row: { id: string }) =>
    menuStore.jumpPage('application-center/ApplicationTemplate/Save', { query: { id: row.id } })
  const changeStatus = (row: Record<string, any>, checked: boolean) => {
    if (row._switchChecked === undefined) row._switchChecked = stateValue(row.state) === 'enabled'
    const oldChecked = row._switchChecked
    row._switchChecked = checked
    Modal.confirm({
      title: $t('ApplicationTemplate.message.confirmChangeStatus', [
        $t(checked ? 'ApplicationTemplate.common.enable' : 'ApplicationTemplate.common.disable'),
      ]),
      onOk: async () => {
        row._statusLoading = true
        try {
          await updateApplicationTemplateStatus(row.id, checked ? 'enabled' : 'disabled')
          row.state = checked ? 'enabled' : 'disabled'
          onlyMessage($t('ApplicationTemplate.message.success'))
          refresh()
        } catch {
          row._switchChecked = oldChecked
        } finally {
          row._statusLoading = false
        }
      },
      onCancel: () => { row._switchChecked = oldChecked },
    })
  }

  const table = {
    openCreateDialog: () => { createDialogOpen.value = true },
    viewDetail,
    handleCreated: (id: string) => {
      createDialogOpen.value = false
      refresh()
      viewDetail({ id })
    },
    changeStatus,
    clickDel: (id: string) => Modal.confirm({
      title: $t('ApplicationTemplate.message.confirmDelete'),
      onOk: async () => {
        await deleteApplicationTemplate(id)
        onlyMessage($t('ApplicationTemplate.message.success'))
        refresh()
      },
    }),
    refresh,
  }

  return {
    permission,
    selectedTagIds,
    tableRef,
    tableLoading,
    createDialogOpen,
    columns,
    defaultParams,
    tableParams,
    requestTable,
    normalizeState: stateValue,
    table,
  }
}
