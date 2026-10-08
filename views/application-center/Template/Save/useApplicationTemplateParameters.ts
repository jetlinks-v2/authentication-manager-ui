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

/** 模板 configuration 中声明的单个外链参数，只读回显名称、来源和取值。 */
export interface ApplicationTemplateParameter {
  name: string
  provider: string
  value: string
}

const toParameter = (item: unknown): ApplicationTemplateParameter | undefined => {
  if (!item || typeof item !== 'object') {
    return undefined
  }
  const definition = item as Record<string, unknown>
  const name = typeof definition.name === 'string' ? definition.name : ''
  if (!name) {
    return undefined
  }
  const provider = typeof definition.provider === 'string' ? definition.provider : ''
  const configuration = definition.configuration && typeof definition.configuration === 'object'
    ? definition.configuration as Record<string, unknown>
    : {}
  const raw = provider === 'user' ? configuration.field : configuration.value
  return { name, provider, value: raw == null ? '' : String(raw) }
}

/** 只编辑第三方模板地址，其余 Configuration 原样保存；参数只读回显，不解释或拼接。 */
export const useApplicationTemplateParameters = (
  getDetail: () => BusinessApplicationTemplate,
  persist: (configuration: ApplicationTemplateConfiguration) => Promise<boolean>,
  messages: ParameterMessages,
) => {
  const redirectUri = ref('')
  const saving = ref(false)
  const error = ref('')
  const supported = computed(() => getDetail().provider === 'third-party')
  const parameters = computed<ApplicationTemplateParameter[]>(() => {
    const declared = getDetail().configuration?.externalParameters
    return Array.isArray(declared)
      ? declared
        .map(toParameter)
        .filter((item): item is ApplicationTemplateParameter => item !== undefined)
      : []
  })

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

  return { redirectUri, parameters, supported, saving, error, reset, save }
}
