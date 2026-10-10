import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ConditionFilterChangePayload, ConditionFilterField } from '@jetlinks-web-core/components/ConditionFilter'
import type { ApiApplication, QueryPayload } from '@authentication-manager-ui/api/application-center/apiApplication'
import type { ApplicationSubscription, SubscriptionConfiguration } from '@authentication-manager-ui/api/application-center/applicationSubscription'
import { apiState } from './applicationUtils'
import { channelLabel } from './subscriptionForm'
import { executionStateKey } from './subscriptionState'
import { useSubscriptions } from './useSubscriptions'

export const useSubscriptionPanel = (application: () => ApiApplication) => {
  const { t } = useI18n()
  const api = useSubscriptions()
  const tableRef = ref<{ reload: () => void }>()
  const filters = ref<{ terms: Array<Record<string, unknown>> }>({ terms: [] })
  const editorOpen = ref(false)
  const detailOpen = ref(false)
  const detailLoading = ref(false)
  const editing = ref<ApplicationSubscription>()
  const selected = ref<ApplicationSubscription>()
  const applicationEnabled = computed(() => apiState(application()) === 'enabled')
  let disposed = false
  onBeforeUnmount(() => { disposed = true })
  const reload = () => { if (!disposed) tableRef.value?.reload() }
  const refresh = () => { void api.loadCatalog(application().id); reload() }
  const requestPage = (params: QueryPayload) => api.query(application().id, {
    ...params, terms: params.terms || filters.value.terms,
  })
  const handleSearch = ({ filter }: ConditionFilterChangePayload) => {
    filters.value = { terms: filter.terms as Array<Record<string, unknown>> }
    reload()
  }
  const filterColumns = computed<ConditionFilterField[]>(() => [
    { dataIndex: 'name', title: t('ApiApplication.subscription.name'), search: { type: 'string', defaultTermType: 'like' } },
    { dataIndex: 'state', title: t('ApiApplication.subscription.state'), search: { type: 'select', options: [
      { label: t('ApiApplication.status.enabled'), value: 'enabled' }, { label: t('ApiApplication.status.disabled'), value: 'disabled' },
    ] } },
  ])
  const columns = computed(() => [
    { title: t('ApiApplication.subscription.name'), dataIndex: 'name', key: 'name', scopedSlots: true, width: 210 },
    { title: t('ThirdPartyApplication.subscription.scopes'), key: 'scopes', scopedSlots: true, width: 110 },
    { title: t('ApiApplication.subscription.events'), key: 'eventTypes', scopedSlots: true, width: 95 },
    { title: t('ApiApplication.subscription.channel'), dataIndex: 'channelProvider', key: 'channelProvider', scopedSlots: true, width: 150 },
    { title: t('ApiApplication.subscription.executionState'), key: 'executionState', scopedSlots: true, width: 145 },
    { title: t('ApiApplication.subscription.state'), dataIndex: 'state', key: 'state', scopedSlots: true, width: 100 },
    { title: t('ApiApplication.subscription.validation'), key: 'validation', scopedSlots: true, width: 110 },
    { title: t('ApiApplication.subscription.createTime'), dataIndex: 'createTime', key: 'createTime', scopedSlots: true, width: 170 },
    { title: t('ApiApplication.subscription.actions'), key: 'action', scopedSlots: true, fixed: 'right', width: 260 },
  ])
  const eventName = (id: string) => api.events.value.find(item => item.id === id)?.name || id
  const channelName = (id?: string) => channelLabel(id, t)
  const executionLabel = (state?: string) => t(executionStateKey(state))
  const openEditor = (row?: ApplicationSubscription) => {
    if (api.saving.value) return
    editing.value = row; api.clearFeedback(); editorOpen.value = true
  }
  const openDetail = async (row: ApplicationSubscription) => {
    selected.value = undefined; detailOpen.value = true; detailLoading.value = true
    try {
      const value = await api.detail(application().id, row.id)
      if (!disposed) selected.value = value
    } finally { if (!disposed) detailLoading.value = false }
  }
  const save = async (data: SubscriptionConfiguration) => {
    if (!await api.save(application().id, data, editing.value?.id)) return
    editorOpen.value = false; reload()
  }
  const check = (data: SubscriptionConfiguration) => api.check(application().id, data)
  const toggle = async (row: ApplicationSubscription) => {
    if (row.state !== 'enabled' && !applicationEnabled.value) return
    if (await api.changeState(application().id, row)) reload()
  }
  const remove = async (row: ApplicationSubscription) => {
    if (await api.remove(application().id, row.id)) reload()
  }
  watch(() => application().id, id => {
    filters.value = { terms: [] }
    void api.loadCatalog(id)
  }, { immediate: true })
  return { ...api, tableRef, filters, editorOpen, detailOpen, detailLoading, editing, selected, applicationEnabled,
    filterColumns, columns, refresh, requestPage, handleSearch, eventName, channelName, executionLabel, openEditor, openDetail, save, check, toggle, remove }
}
