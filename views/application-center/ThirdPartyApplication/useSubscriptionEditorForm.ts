import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ApplicationSubscription, SubscriptionChannel, SubscriptionConfiguration, SubscriptionEvent, SubscriptionScope } from '@authentication-manager-ui/api/application-center/applicationSubscription'
import { channelLabel, copyConfiguration, copyScopes, subscriptionPayload } from './subscriptionForm'

interface EditorSource {
  open: boolean
  subscription?: ApplicationSubscription
  events: SubscriptionEvent[]
  channels: SubscriptionChannel[]
}
export interface HeaderRow { name: string; value: string }
export interface HttpHookForm { endpoint: string; method: string; headers: HeaderRow[] }
export const useSubscriptionEditorForm = (source: () => EditorSource, changed: () => void) => {
  const { t } = useI18n()
  const form = reactive<SubscriptionConfiguration>({ name: '', description: '', scopes: [], channelConfiguration: {} })
  const http = reactive<HttpHookForm>({ endpoint: '', method: 'POST', headers: [] })
  const resetHttp = (configuration: Record<string, unknown> = {}) => {
    http.endpoint = typeof configuration.endpoint === 'string' ? configuration.endpoint : ''
    http.method = typeof configuration.method === 'string' ? configuration.method : 'POST'
    const headers = configuration.headers as Record<string, string> | undefined
    http.headers = Object.entries(headers || {}).map(([name, value]) => ({ name, value }))
  }
  watch(() => [source().open, source().subscription] as const, ([open, subscription]) => {
    if (!open) return
    form.name = subscription?.name || ''
    form.description = subscription?.description || ''
    form.scopes = subscription ? copyScopes(subscription.scopes) : [{ eventTypes: [], configuration: {} }]
    form.channelProvider = subscription?.channelProvider
    form.channelConfiguration = copyConfiguration(subscription?.channelConfiguration)
    resetHttp(form.channelConfiguration)
  }, { immediate: true })
  watch([form, http], changed, { deep: true })
  const channelAvailable = computed(() => source().channels.some(item => item.id === form.channelProvider))
  const channelOptions = computed(() => {
    const options = source().channels.map(item => ({ value: item.id, label: channelLabel(item.id, t) }))
    if (form.channelProvider && !channelAvailable.value) options.push({ value: form.channelProvider,
      label: form.channelProvider + ' · ' + t('ApiApplication.subscription.unavailable') })
    return options
  })
  const eventOptions = (scope: SubscriptionScope) => {
    const options = source().events.map(event => ({ value: event.id, label: event.name || event.id, disabled: false }))
    for (const id of scope.eventTypes) if (!options.some(option => option.value === id)) options.push({
      value: id, label: id + ' · ' + t('ApiApplication.subscription.unavailable'), disabled: false,
    })
    return options
  }
  const addScope = () => { form.scopes.push({ eventTypes: [], configuration: {} }) }
  const removeScope = (index: number) => { form.scopes.splice(index, 1) }
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
    channelConfiguration: form.channelProvider === 'http-hook' ? {
      endpoint: http.endpoint.trim(), method: http.method,
      headers: Object.fromEntries(http.headers.filter(header => header.name.trim())
        .map(header => [header.name.trim(), header.value])),
    } : form.channelConfiguration,
  })
  return { form, http, formError, payload, eventOptions, channelOptions, channelAvailable, addScope, removeScope, changeChannel }
}
