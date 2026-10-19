import { computed, nextTick, reactive, ref, watch } from 'vue'
import type { FormInstance } from 'ant-design-vue'
import type { RuleObject } from 'ant-design-vue/es/form/interface'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { createApplicationTemplate, type I18nMessages } from '@authentication-manager-ui/api/application-center/applicationTemplate'
import { isHttpExternalApplicationUrl } from '../ProjectApplication/applicationConfiguration'
import { unwrapResult } from './Save/menu-config.shared'

interface TemplateCreateOptions {
  open: () => boolean
  onOpenChange: (open: boolean) => void
  onCreated: (id: string) => void
}

interface TemplateCreateDraft {
  name: string
  code: string
  provider: 'official' | 'third-party'
  redirectUri: string
  i18nMessages: I18nMessages
}

/** 模板只配置应用入口；出站认证和实例回调仍在应用实例中维护。 */
export const useApplicationTemplateCreate = (options: TemplateCreateOptions) => {
  const { t } = useI18n()
  const formRef = ref<FormInstance>()
  const loading = ref(false)
  const dialogOpen = computed({ get: options.open, set: options.onOpenChange })
  const formData = reactive<TemplateCreateDraft>({
    name: '',
    code: '',
    provider: 'official',
    redirectUri: '',
    i18nMessages: {},
  })
  const thirdParty = computed(() => formData.provider === 'third-party')
  const rules = computed<Record<string, RuleObject[]>>(() => ({
    name: [
      { required: true, message: t('ApplicationTemplate.message.nameRequired'), trigger: 'blur' },
      { max: 64, message: t('ApplicationTemplate.message.nameMaxLength'), trigger: 'blur' },
    ],
    code: [
      { required: true, message: t('ApplicationTemplate.message.codeRequired'), trigger: 'blur' },
      { max: 64, message: t('ApplicationTemplate.message.codeMaxLength'), trigger: 'blur' },
      { pattern: /^[a-zA-Z0-9_-]+$/, message: t('ApplicationTemplate.message.codeFormat'), trigger: 'blur' },
    ],
    redirectUri: thirdParty.value ? [
      { required: true, whitespace: true, message: t('ApplicationTemplate.parameters.redirectUriRequired'), trigger: 'blur' },
      {
        validator: async (_rule, value: string) => {
          if (!value?.trim()) return
          const address = value.trim()
          if (isHttpExternalApplicationUrl(address)) {
            const url = new URL(address)
            if (url.hostname && !url.username && !url.password) return
          }
          throw new Error(t('ApplicationTemplate.parameters.redirectUriInvalid'))
        },
        trigger: 'blur',
      },
    ] : [],
  }))

  const resetForm = () => {
    formData.name = ''
    formData.code = ''
    formData.provider = 'official'
    formData.redirectUri = ''
    formData.i18nMessages = {}
  }

  watch(() => formData.provider, () => {
    formData.redirectUri = ''
    formRef.value?.clearValidate('redirectUri')
  })

  watch(options.open, async () => {
    resetForm()
    await nextTick()
    formRef.value?.clearValidate()
  }, { immediate: true })

  const handleOk = async () => {
    if (loading.value) return
    try {
      await formRef.value?.validate()
    } catch {
      return
    }
    loading.value = true
    try {
      const response: unknown = await createApplicationTemplate({
        name: formData.name,
        code: formData.code,
        provider: formData.provider,
        i18nMessages: formData.i18nMessages,
        ...(thirdParty.value
          ? { configuration: { redirectUri: formData.redirectUri.trim() } }
          : { layoutVariant: 'application' as const }),
        state: 'enabled',
      })
      const saved = unwrapResult<unknown>(response, undefined)
      const id = typeof saved === 'string' ? saved
        : typeof saved === 'object' && saved !== null && 'id' in saved && typeof saved.id === 'string' ? saved.id : undefined
      onlyMessage(t('ApplicationTemplate.message.success'))
      dialogOpen.value = false
      if (id) options.onCreated(id)
    } finally {
      loading.value = false
    }
  }

  return { dialogOpen, formRef, formData, thirdParty, rules, loading, handleOk }
}
