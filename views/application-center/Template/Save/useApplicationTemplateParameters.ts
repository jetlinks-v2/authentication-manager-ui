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
  invalidParameter: string
}

/** 模板维护的单个跳转参数草稿：名称、值来源，以及固定值或用户字段。 */
export interface ApplicationTemplateParameterDraft {
  name: string
  provider: string
  value: string
}

const toDraft = (item: unknown): ApplicationTemplateParameterDraft | undefined => {
  if (!item || typeof item !== 'object') {
    return undefined
  }
  const definition = item as Record<string, unknown>
  const name = typeof definition.name === 'string' ? definition.name : ''
  const configuration = definition.configuration && typeof definition.configuration === 'object'
    ? definition.configuration as Record<string, unknown>
    : {}
  if (definition.provider === 'user') {
    const field = typeof configuration.field === 'string' ? configuration.field : ''
    return { name, provider: 'user', value: field || 'id' }
  }
  const value = configuration.value
  return { name, provider: 'fixed', value: value == null ? '' : String(value) }
}

const toDefinition = (draft: ApplicationTemplateParameterDraft) => ({
  name: draft.name.trim(),
  provider: draft.provider,
  configuration: draft.provider === 'user' ? { field: draft.value } : { value: draft.value },
})

/** 编辑第三方模板地址与跳转参数，其余 Configuration 原样保存，不拼接或解析参数值。 */
export const useApplicationTemplateParameters = (
  getDetail: () => BusinessApplicationTemplate,
  persist: (configuration: ApplicationTemplateConfiguration) => Promise<boolean>,
  messages: ParameterMessages,
) => {
  const redirectUri = ref('')
  const parameters = ref<ApplicationTemplateParameterDraft[]>([])
  const saving = ref(false)
  const error = ref('')
  const supported = computed(() => getDetail().provider === 'third-party')

  const reset = () => {
    redirectUri.value = String(getDetail().configuration?.redirectUri || '').trim()
    const declared = getDetail().configuration?.externalParameters
    parameters.value = Array.isArray(declared)
      ? declared
        .map(toDraft)
        .filter((item): item is ApplicationTemplateParameterDraft => item !== undefined)
      : []
    error.value = ''
  }

  const addParameter = () => {
    parameters.value.push({ name: '', provider: 'fixed', value: '' })
  }

  const removeParameter = (index: number) => {
    parameters.value.splice(index, 1)
  }

  /** 切换来源时保留已选择的用户字段，避免来回切换丢失草稿。 */
  const changeProvider = (index: number, provider: string) => {
    const parameter = parameters.value[index]
    if (!parameter || parameter.provider === provider) {
      return
    }
    parameter.provider = provider
    if (provider === 'user' && !['id', 'username'].includes(parameter.value)) {
      parameter.value = 'id'
    }
  }

  const parametersValid = () => {
    const names = new Set<string>()
    return parameters.value.every(parameter => {
      const name = parameter.name.trim()
      if (!name || names.has(name)) {
        return false
      }
      names.add(name)
      return parameter.provider === 'fixed'
        || (parameter.provider === 'user' && ['id', 'username'].includes(parameter.value))
    })
  }

  const save = async () => {
    error.value = ''
    const address = redirectUri.value.trim()
    if (!address) {
      error.value = messages.redirectUriRequired
      return false
    }
    if (!isHttpExternalApplicationUrl(address)) {
      error.value = messages.redirectUriInvalid
      return false
    }
    if (!parametersValid()) {
      error.value = messages.invalidParameter
      return false
    }
    saving.value = true
    try {
      return await persist({
        ...getDetail().configuration,
        redirectUri: address,
        externalParameters: parameters.value.map(toDefinition),
      })
    } catch {
      error.value = messages.saveFailed
      return false
    } finally {
      saving.value = false
    }
  }

  watch(() => getDetail().configuration, reset, { immediate: true })

  return {
    redirectUri,
    parameters,
    supported,
    saving,
    error,
    reset,
    save,
    addParameter,
    removeParameter,
    changeProvider,
  }
}
