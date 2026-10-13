import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getCallbackAuthenticationTypes, type ApplicationCallbackConfiguration, type CallbackAuthenticationType } from '@authentication-manager-ui/api/application-center/businessApplicationCallback'
import { resultOf } from './applicationModel'
import { callbackOfDraft, connectionDraftOf, connectionValidationKey } from './applicationCallbackConfiguration'

/** 创建与详情复用连接草稿；密钥从不进入应用 store 或持久化存储。 */
export const useApplicationConnectionForm = (active: () => boolean, allowToggle: () => boolean) => {
  const { t } = useI18n()
  const draft = reactive(connectionDraftOf())
  const baseline = ref(connectionDraftOf())
  const secretConfigured = ref(false)
  const authenticationTypes = ref<CallbackAuthenticationType[]>([])
  const loading = ref(false)
  const error = ref('')
  const validationError = ref('')
  let sequence = 0
  const supported = computed(() => draft.authenticationType === 'oauth2' && authenticationTypes.value.some(item => item.type === 'oauth2'))
  const dirty = computed(() => Object.keys(draft).some(key => {
    const field = key as keyof typeof draft
    return draft[field] !== baseline.value[field]
  }))
  const reset = (callback?: ApplicationCallbackConfiguration) => {
    Object.assign(draft, connectionDraftOf(callback))
    baseline.value = connectionDraftOf(callback)
    secretConfigured.value = !!callback?.authentication.secretConfigured
    validationError.value = ''
  }
  const clearSecret = () => { draft.clientSecret = '' }
  const loadTypes = async () => {
    if (!active()) return
    const current = ++sequence
    loading.value = true
    error.value = ''
    try {
      const result = resultOf<CallbackAuthenticationType[]>(await getCallbackAuthenticationTypes())
      if (current === sequence) authenticationTypes.value = result
    } catch {
      if (current === sequence) error.value = t('ApplicationConnection.loadFailed')
    } finally {
      if (current === sequence) loading.value = false
    }
  }
  watch(active, enabled => {
    ++sequence
    loading.value = false
    if (enabled) void loadTypes()
    else { clearSecret(); error.value = ''; authenticationTypes.value = [] }
  }, { immediate: true })
  watch(draft, () => { validationError.value = '' })
  onBeforeUnmount(() => { ++sequence; clearSecret() })
  const validate = () => {
    const key = connectionValidationKey(draft, secretConfigured.value)
    validationError.value = key ? t('ApplicationConnection.' + key) : ''
    return !key && (!draft.enabled || supported.value)
  }
  const payload = () => callbackOfDraft(draft)
  const view = computed(() => ({
    loading: loading.value, error: error.value, validationError: validationError.value,
    secretConfigured: secretConfigured.value, allowToggle: allowToggle(), supported: supported.value,
    typeOptions: authenticationTypes.value.map(item => ({ value: item.type, label: item.name, disabled: item.type !== 'oauth2' })),
  }))
  return { draft, view, loading, error, supported, dirty, reset, clearSecret, validate, payload, loadTypes }
}

export type ApplicationConnectionFormView = ReturnType<typeof useApplicationConnectionForm>['view']['value']
