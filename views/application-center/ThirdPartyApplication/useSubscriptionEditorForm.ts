import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SlantedTabKey, SlantedTabOption } from '@jetlinks-web-core/components/SlantedTabs'
import type { ApplicationSubscription, SubscriptionChannel, SubscriptionConfiguration } from '@authentication-manager-ui/api/application-center/applicationSubscription'
import { channelLabel, copyConfiguration, copyScopes, scopesForEvents, subscriptionPayload } from './subscriptionForm'

interface EditorSource {
  open: boolean
  subscription?: ApplicationSubscription
  channels: SubscriptionChannel[]
}
export interface HeaderRow { name: string; value: string }
export interface HttpHookForm { endpoint: string; method: string; headers: HeaderRow[] }
export const useSubscriptionEditorForm = (source: () => EditorSource, changed: () => void) => {
  const { t } = useI18n()
  const activeTab = ref<SlantedTabKey>('configuration')
  const documentEventId = ref<string>()
  const tabOptions = computed<SlantedTabOption[]>(() => [
    { key: 'configuration', label: t('ThirdPartyApplication.subscription.configurationTab') },
    { key: 'documentation', label: t('ThirdPartyApplication.subscription.documentationTab') },
  ])
  const showEventDocument = (eventId: string) => {
    documentEventId.value = eventId
    activeTab.value = 'documentation'
  }
  const form = reactive<SubscriptionConfiguration>({ name: '', description: '', scopes: [], channelConfiguration: {} })
  const selectedEventIds = ref<string[]>([])
  const http = reactive<HttpHookForm>({ endpoint: '', method: 'POST', headers: [] })
  const resetHttp = (configuration: Record<string, unknown> = {}) => {
    http.endpoint = typeof configuration.endpoint === 'string' ? configuration.endpoint : ''
    http.method = typeof configuration.method === 'string' ? configuration.method : 'POST'
    const headers = configuration.headers as Record<string, string> | undefined
    http.headers = Object.entries(headers || {}).map(([name, value]) => ({ name, value }))
  }
  watch(() => [source().open, source().subscription] as const, ([open, subscription]) => {
    if (!open) return
    activeTab.value = 'configuration'
    documentEventId.value = undefined
    form.name = subscription?.name || ''
    form.description = subscription?.description || ''
    form.scopes = subscription ? copyScopes(subscription.scopes) : [{ eventTypes: [], configuration: {} }]
    selectedEventIds.value = [...new Set(form.scopes.flatMap(scope => scope.eventTypes))]
    form.channelProvider = subscription?.channelProvider
    form.channelConfiguration = copyConfiguration(subscription?.channelConfiguration)
    resetHttp(form.channelConfiguration)
  }, { immediate: true })
  watch([form, http, selectedEventIds], changed, { deep: true })
  const channelAvailable = computed(() => source().channels.some(item => item.id === form.channelProvider))
  const channelOptions = computed(() => {
    const options = source().channels.map(item => ({ value: item.id, label: channelLabel(item.id, t) }))
    if (form.channelProvider && !channelAvailable.value) options.push({ value: form.channelProvider,
      label: form.channelProvider + ' · ' + t('ApiApplication.subscription.unavailable') })
    return options
  })
  const changeChannel = (id?: string) => {
    if (id !== form.channelProvider) { form.channelConfiguration = {}; resetHttp() }
    form.channelProvider = id
  }
  const formError = computed(() => {
    if (form.channelProvider !== 'http-hook') return ''
    const names = new Set<string>()
    for (const header of http.headers) {
      const name = header.name.trim()
      if (!name && !header.value) continue
      if (!name) return t('ThirdPartyApplication.subscription.headerNameRequired')
      // 转为对象会覆盖同名请求头，先提示用户修正，不能静默丢掉其中一行。
      if (names.has(name)) return t('ThirdPartyApplication.subscription.duplicateHeader')
      names.add(name)
    }
    return ''
  })
  const payload = () => subscriptionPayload({ ...form,
    scopes: scopesForEvents(form.scopes, selectedEventIds.value),
    channelConfiguration: form.channelProvider === 'http-hook' ? {
      endpoint: http.endpoint.trim(), method: http.method,
      headers: Object.fromEntries(http.headers.filter(header => header.name.trim())
        .map(header => [header.name.trim(), header.value])),
    } : form.channelConfiguration,
  })
  return { form, http, formError, payload, selectedEventIds, channelOptions, channelAvailable, changeChannel,
    activeTab, documentEventId, tabOptions, showEventDocument }
}
