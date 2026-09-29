import { computed, ref, watch } from 'vue'
import {
  getApplicationParameterProviders,
  type ApplicationTemplateConfiguration,
  type BusinessApplicationParameter,
  type BusinessApplicationParameterProvider,
  type BusinessApplicationTemplate,
} from '@authentication-manager-ui/api/application-center/applicationTemplate'

interface ParameterDraft {
  name: string
  provider: string
  value: string
  configuration: string
}

interface ParameterMessages {
  loadFailed: string
  invalidParameter: string
  invalidConfiguration: string
  saveFailed: string
}

/** 模板维护参数规则，运行时凭证始终由后端 Provider 解析。 */
export const useApplicationTemplateParameters = (
  getDetail: () => BusinessApplicationTemplate,
  persist: (configuration: ApplicationTemplateConfiguration) => Promise<boolean>,
  messages: ParameterMessages,
) => {
  const draft = ref<ParameterDraft[]>([])
  const providers = ref<BusinessApplicationParameterProvider[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const loadError = ref('')
  const error = ref('')
  const options = computed(() => providers.value.map(provider => ({
    value: provider.id,
    label: provider.name,
  })))

  // 保留扩展 Provider 的完整配置，避免编辑后丢失自定义字段。
  const reset = () => {
    draft.value = (getDetail().configuration?.externalParameters || []).map(parameter => ({
      name: parameter.name,
      provider: parameter.provider,
      value: String(parameter.configuration?.value ?? ''),
      configuration: JSON.stringify(parameter.configuration || {}, null, 2),
    }))
    error.value = ''
  }

  const loadProviders = async () => {
    loading.value = true
    loadError.value = ''
    try {
      const response = await getApplicationParameterProviders()
      providers.value = response.result || []
    } catch {
      loadError.value = messages.loadFailed
    } finally {
      loading.value = false
    }
  }

  const add = () => draft.value.push({ name: '', provider: '', value: '', configuration: '{}' })
  const remove = (index: number) => draft.value.splice(index, 1)
  const changeProvider = (index: number, provider: string) => {
    Object.assign(draft.value[index], { provider, value: '', configuration: '{}' })
  }

  // 空列表明确写回 [] 以支持清空；其它模板配置保持原值。
  const save = async () => {
    error.value = ''
    const names = new Set<string>()
    const parameters: BusinessApplicationParameter[] = []
    for (const parameter of draft.value) {
      const name = parameter.name.trim()
      if (!name || !parameter.provider || names.has(name)) {
        error.value = messages.invalidParameter
        return false
      }
      names.add(name)
      let configuration: unknown
      try {
        configuration = JSON.parse(parameter.configuration)
      } catch {
        error.value = messages.invalidConfiguration
        return false
      }
      if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration)) {
        error.value = messages.invalidConfiguration
        return false
      }
      parameters.push({
        name,
        provider: parameter.provider,
        configuration: parameter.provider === 'fixed'
          ? { ...configuration, value: parameter.value }
          : configuration as Record<string, unknown>,
      })
    }
    saving.value = true
    try {
      return await persist({ ...getDetail().configuration, externalParameters: parameters })
    } catch {
      error.value = messages.saveFailed
      return false
    } finally {
      saving.value = false
    }
  }

  watch(() => getDetail().configuration, reset, { immediate: true })

  return { draft, options, loading, saving, loadError, error, reset, loadProviders, add, remove, changeProvider, save }
}
