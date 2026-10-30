import { computed, reactive, ref, watch } from 'vue'
import type {
  ApplicationTemplateConfiguration,
  BusinessApplicationTemplate,
} from '@authentication-manager-ui/api/application-center/applicationTemplate'
import { isHttpExternalApplicationUrl } from '../../ProjectApplication/applicationConfiguration'

interface ParameterMessages {
  saveFailed: string
  redirectUriRequired: string
  redirectUriInvalid: string
  platformIdInvalid: string
  invalidParameter: string
  invalidNotification: string
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

/** 复用第三方 Provider 的跳转参数与签名通知配置，其余模板配置保持不变。 */
export const useApplicationTemplateParameters = (
  getDetail: () => BusinessApplicationTemplate,
  persist: (configuration: ApplicationTemplateConfiguration) => Promise<boolean>,
  messages: ParameterMessages,
) => {
  const redirectUri = ref('')
  const notification = reactive({ enabled: false, address: '', keyId: '', publicKey: '' })
  const platformId = ref('')
  const parameters = ref<ApplicationTemplateParameterDraft[]>([])
  const saving = ref(false)
  const error = ref('')
  const supported = computed(() => getDetail().provider === 'third-party')

  const reset = () => {
    redirectUri.value = String(getDetail().configuration?.redirectUri || '').trim()
    const savedNotification = getDetail().configuration?.notification
    const savedCredential = getDetail().configuration?.credential ?? savedNotification
    notification.enabled = !!savedNotification
    notification.address = savedNotification?.address || ''
    notification.keyId = savedCredential?.keyId || ''
    notification.publicKey = savedCredential?.publicKey || ''
    platformId.value = String(getDetail().configuration?.platformId || '').trim()
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
      if (!name || ['code', 'platformId', 'applicationId'].includes(name) || names.has(name)) {
        return false
      }
      names.add(name)
      return parameter.provider === 'fixed'
        || (parameter.provider === 'user' && ['id', 'username'].includes(parameter.value))
    })
  }

  const save = async () => {
    error.value = ''
    const identity = platformId.value.trim()
    if (identity && !/^[\x21-\x7e]{1,128}$/.test(identity)) {
      error.value = messages.platformIdInvalid
      return false
    }
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
    const notificationAddress = notification.address.trim()
    const keyId = notification.keyId.trim()
    const publicKey = notification.publicKey.trim()
    if ((notification.enabled && !isHttpExternalApplicationUrl(notificationAddress))
      || ((notification.enabled || keyId || publicKey) && (!keyId || !publicKey))) {
      error.value = messages.invalidNotification
      return false
    }
    const configuration: ApplicationTemplateConfiguration = {
      ...getDetail().configuration,
      redirectUri: address,
      externalParameters: parameters.value.map(toDefinition),
    }
    if (notification.enabled) {
      configuration.notification = {
        address: notificationAddress,
      }
    } else {
      delete configuration.notification
    }
    if (keyId && publicKey) configuration.credential = { keyId, publicKey }
    else delete configuration.credential
    // 留空保留后端“默认模板 ID”规则，不把默认值固化到模板。
    if (identity) configuration.platformId = identity
    else delete configuration.platformId
    saving.value = true
    try {
      return await persist(configuration)
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
    notification,
    platformId,
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
