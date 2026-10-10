import { onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  createSubscription, deleteSubscription, disableSubscription, enableSubscription,
  getSubscription, querySubscriptionChannels, querySubscriptionEvents, querySubscriptions,
  updateSubscription, validateSubscription,
} from '@authentication-manager-ui/api/application-center/applicationSubscription'
import type { QueryPayload } from '@authentication-manager-ui/api/application-center/apiApplication'
import type { ApplicationSubscription, SubscriptionChannel, SubscriptionConfiguration, SubscriptionEvent, SubscriptionValidation } from '@authentication-manager-ui/api/application-center/applicationSubscription'
import { applicationError, responseBody } from './applicationUtils'
import { subscriptionPayload } from './subscriptionForm'

export const useSubscriptions = () => {
  const { t } = useI18n()
  let disposed = false
  let catalogRequest = 0
  onBeforeUnmount(() => { disposed = true; catalogRequest++ })
  const events = ref<SubscriptionEvent[]>([])
  const channels = ref<SubscriptionChannel[]>([])
  const catalogLoading = ref(false)
  const catalogError = ref('')
  const listError = ref('')
  const operationError = ref('')
  const saving = ref(false)
  const validation = ref<SubscriptionValidation>()
  const clearFeedback = () => { operationError.value = ''; validation.value = undefined }
  const loadCatalog = async (applicationId: string) => {
    const current = ++catalogRequest
    catalogLoading.value = true; catalogError.value = ''; events.value = []; channels.value = []
    const [eventResponse, channelResponse] = await Promise.allSettled([
      querySubscriptionEvents(applicationId), querySubscriptionChannels(applicationId),
    ])
    if (disposed || current !== catalogRequest) return
    const errors: string[] = []
    if (eventResponse.status === 'fulfilled') {
      const value = responseBody<SubscriptionEvent[]>(eventResponse.value)
      if (Array.isArray(value)) events.value = value
      else errors.push(t('ThirdPartyApplication.subscription.invalidResponse'))
    } else errors.push(applicationError(eventResponse.reason, t))
    if (channelResponse.status === 'fulfilled') {
      const value = responseBody<SubscriptionChannel[]>(channelResponse.value)
      if (Array.isArray(value)) channels.value = value
      else errors.push(t('ThirdPartyApplication.subscription.invalidResponse'))
    } else errors.push(applicationError(channelResponse.reason, t))
    // 单个目录失败明确展示；不虚构目录，也不丢掉另一接口实际返回的选项。
    catalogError.value = errors.join('; ')
    catalogLoading.value = false
  }
  const query = async (applicationId: string, params: QueryPayload) => {
    listError.value = ''
    try { return await querySubscriptions(applicationId, params) }
    catch (cause) { if (!disposed) listError.value = applicationError(cause, t); throw cause }
  }
  const check = async (applicationId: string, data: SubscriptionConfiguration) => {
    if (saving.value || disposed) return
    saving.value = true; clearFeedback()
    try {
      const response = await validateSubscription(applicationId, subscriptionPayload(data))
      if (!disposed) validation.value = responseBody<SubscriptionValidation>(response)
    } catch (cause) { if (!disposed) operationError.value = applicationError(cause, t) }
    finally { if (!disposed) saving.value = false }
  }
  const run = async (request: () => Promise<unknown>, message: string) => {
    if (saving.value || disposed) return false
    saving.value = true; clearFeedback()
    try {
      await request()
      if (disposed) return false
      onlyMessage(t(message))
      return true
    } catch (cause) { if (!disposed) operationError.value = applicationError(cause, t); return false }
    finally { if (!disposed) saving.value = false }
  }
  const save = (applicationId: string, data: SubscriptionConfiguration, id?: string) => {
    const body = subscriptionPayload(data)
    return run(() => id ? updateSubscription(applicationId, id, body) : createSubscription(applicationId, body),
      id ? 'ApiApplication.subscription.updated' : 'ApiApplication.subscription.created')
  }
  const changeState = (applicationId: string, subscription: ApplicationSubscription) => run(() =>
    subscription.state === 'enabled' ? disableSubscription(applicationId, subscription.id) : enableSubscription(applicationId, subscription.id),
    'ApiApplication.subscription.stateUpdated')
  const remove = (applicationId: string, id: string) => run(() => deleteSubscription(applicationId, id), 'ApiApplication.subscription.deleted')
  const detail = async (applicationId: string, id: string) => {
    operationError.value = ''
    try {
      const response = await getSubscription(applicationId, id)
      return disposed ? undefined : responseBody<ApplicationSubscription>(response)
    } catch (cause) { if (!disposed) operationError.value = applicationError(cause, t) }
  }
  return { events, channels, catalogLoading, catalogError, listError, operationError, saving, validation,
    clearFeedback, loadCatalog, query, check, save, changeState, remove, detail }
}
