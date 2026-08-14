import { computed, reactive, ref } from 'vue'
import { Modal } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  deleteApplicationTemplate,
  queryApplicationTemplates,
  updateApplicationTemplateStatus,
} from '@authentication-manager-ui/api/application-center/applicationTemplate'

export interface ApplicationTemplateSearchModel {
  name: string
  code: string
  state?: string
}

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
  const permission = 'application-center/Template'
  const tableRef = ref<Record<string, any>>({})
  const tableLoading = ref(false)
  const createDialogOpen = ref(false)
  const searchModel = reactive<ApplicationTemplateSearchModel>({
    name: '',
    code: '',
    state: undefined,
  })

  const refresh = () => tableRef.value?.reload?.()
  const setSearchModel = (model: ApplicationTemplateSearchModel) => {
    searchModel.name = String(model.name || '').trim()
    searchModel.code = String(model.code || '').trim()
    searchModel.state = model.state || undefined
  }
  const stateOptions = computed(() => [
    { label: $t('ApplicationTemplate.common.enabled'), value: 'enabled' },
    { label: $t('ApplicationTemplate.common.disabled'), value: 'disabled' },
  ])

  const columns = computed(() => [
    {
      title: $t('ApplicationTemplate.field.name'),
      dataIndex: 'name', key: 'name', ellipsis: true, scopedSlots: true,
    },
    {
      title: $t('ApplicationTemplate.field.code'),
      dataIndex: 'code', key: 'code', ellipsis: true,
    },
    {
      title: $t('ApplicationTemplate.field.description'),
      dataIndex: 'description', key: 'description', ellipsis: true,
    },
    {
      title: $t('ApplicationTemplate.field.state'),
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
      const value = searchModel[key].trim()
      if (value) terms.push({ column: key, termType: 'like', value })
    })
    if (searchModel.state) terms.push({ column: 'state', termType: 'eq', value: searchModel.state })
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
    menuStore.jumpPage('application-center/Template/Save', { query: { id: row.id } })
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
    search: (model: ApplicationTemplateSearchModel) => {
      setSearchModel(model)
      refresh()
    },
    resetSearch: () => {
      setSearchModel({ name: '', code: '', state: undefined })
      refresh()
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
    tableRef,
    tableLoading,
    createDialogOpen,
    searchModel,
    stateOptions,
    columns,
    defaultParams,
    tableParams,
    requestTable,
    normalizeState: stateValue,
    table,
  }
}
