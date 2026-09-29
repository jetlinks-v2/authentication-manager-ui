import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import type { Subscription } from 'rxjs'
import {
  getAccountBindings, startAccountBinding,
  type AccountBindingApplication,
} from '../../api/accountBinding'
import { groupAccountBindings, type BindingMethod } from './model'

export function useAccountBinding() {
  const { t } = useI18n()
  const applications = ref<AccountBindingApplication[]>([])
  const loading = ref(false)
  const loadFailed = ref(false)
  const selectedMethod = ref<BindingMethod>()
  const selectedApplication = ref<AccountBindingApplication>()
  const authorizationUrl = ref('')
  const bindingState = ref<'loading' | 'active' | 'checking' | 'failed' | 'expired'>('loading')
  const bindingError = ref('')
  let subscription: Subscription | undefined
  let attempt = 0
  const groups = computed(() => groupAccountBindings(applications.value))
  const choices = computed(() => groups.value.find(group => group.method === selectedMethod.value)?.applications || [])

  async function load() {
    loading.value = true
    loadFailed.value = false
    try {
      const response = await getAccountBindings()
      applications.value = response.result
      return true
    } catch {
      loadFailed.value = true
      return false
    } finally {
      loading.value = false
    }
  }

  function stop() {
    attempt += 1
    subscription?.unsubscribe()
    subscription = undefined
    authorizationUrl.value = ''
  }

  function close() {
    stop()
    selectedMethod.value = undefined
    selectedApplication.value = undefined
  }

  function fail(message = t('AccountBinding.failed')) {
    authorizationUrl.value = ''
    bindingError.value = message
    bindingState.value = 'failed'
  }

  async function confirmBinding(appId: string, currentAttempt: number) {
    // 授权返回成功后仍以当前账号的绑定记录为准，不消费登录 token。
    const refreshed = await load()
    if (currentAttempt !== attempt) return
    if (!refreshed) {
      fail(t('AccountBinding.loadFailed'))
    } else if (applications.value.some(item => item.id === appId && item.bound)) {
      onlyMessage(t('AccountBinding.success'), 'success')
      close()
    } else {
      fail()
    }
  }

  function bind(application: AccountBindingApplication) {
    if (application.bound) return
    stop()
    selectedApplication.value = application
    bindingState.value = 'loading'
    bindingError.value = ''
    const currentAttempt = attempt
    subscription = startAccountBinding(application.id).subscribe({
      next(event) {
        if (currentAttempt !== attempt) return
        if (event.type === 'init') {
          authorizationUrl.value = event.result
          bindingState.value = 'active'
        } else if (event.type === 'success') {
          authorizationUrl.value = ''
          if (!event.result.bound) {
            fail()
            return
          }
          bindingState.value = 'checking'
          void confirmBinding(application.id, currentAttempt)
        } else if (event.type === 'failed') {
          fail(event.message)
        }
      },
      error() {
        if (currentAttempt === attempt) fail()
      },
      complete() {
        if (currentAttempt === attempt && ['loading', 'active'].includes(bindingState.value)) {
          authorizationUrl.value = ''
          bindingState.value = 'expired'
        }
      },
    })
  }

  function open(method: BindingMethod) {
    selectedMethod.value = method
    selectedApplication.value = undefined
    if (choices.value.length === 1) bind(choices.value[0])
  }

  function back() {
    stop()
    selectedApplication.value = undefined
  }

  onMounted(load)
  onBeforeUnmount(stop)

  return {
    groups, choices, loading, loadFailed, selectedMethod, selectedApplication,
    authorizationUrl, bindingState, bindingError, load, open, bind, back, close,
  }
}
