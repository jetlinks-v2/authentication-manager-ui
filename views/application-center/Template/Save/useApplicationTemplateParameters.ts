import { computed, ref, watch } from 'vue'
import type {
  ApplicationTemplateConfiguration,
  BusinessApplicationTemplate,
} from '@authentication-manager-ui/api/application-center/applicationTemplate'
import { isHttpExternalApplicationUrl } from '../../ProjectApplication/applicationConfiguration'

interface ParameterMessages {
  saveFailed: string
  redirectUriRequired: string
  redirectUriInvalid: string
}

/** 只编辑第三方模板地址，其余 Configuration 原样保存，不解释或拼接参数。 */
export const useApplicationTemplateParameters = (
  getDetail: () => BusinessApplicationTemplate,
  persist: (configuration: ApplicationTemplateConfiguration) => Promise<boolean>,
  messages: ParameterMessages,
) => {
  const redirectUri = ref('')
  const saving = ref(false)
  const error = ref('')
  const supported = computed(() => getDetail().provider === 'third-party')

  const reset = () => {
    redirectUri.value = String(getDetail().configuration?.redirectUri || '').trim()
    error.value = ''
  }

  const save = async () => {
    error.value = ''
    if (!redirectUri.value.trim()) {
      error.value = messages.redirectUriRequired
      return false
    }
    if (!isHttpExternalApplicationUrl(redirectUri.value)) {
      error.value = messages.redirectUriInvalid
      return false
    }
    saving.value = true
    try {
      return await persist({ ...getDetail().configuration, redirectUri: redirectUri.value.trim() })
    } catch {
      error.value = messages.saveFailed
      return false
    } finally {
      saving.value = false
    }
  }

  watch(() => getDetail().configuration, reset, { immediate: true })

  return { redirectUri, supported, saving, error, reset, save }
}
