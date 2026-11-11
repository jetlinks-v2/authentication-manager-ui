import { computed, onScopeDispose, reactive, ref, watch, type Ref } from 'vue'
import type { FormInstance } from 'ant-design-vue'
import type { RuleObject } from 'ant-design-vue/es/form/interface'
import { useI18n } from 'vue-i18n'
import type { BusinessApplicationTemplate, I18nMessages } from '@authentication-manager-ui/api/application-center/applicationTemplate'

export type TemplateBasicInfoUpdate = Partial<Pick<BusinessApplicationTemplate, 'name' | 'description' | 'icon' | 'i18nMessages'>>
interface BasicInfoDraft {
  name: string
  description: string
  i18nMessages: I18nMessages
}
interface BasicInfoOptions {
  getTemplateId: () => string
  getDetail: () => BusinessApplicationTemplate
  canUpdate: () => boolean
  busy: () => boolean
  persist: (payload: TemplateBasicInfoUpdate) => Promise<boolean>
}
const copyMessages = (messages: I18nMessages = {}): I18nMessages => Object.fromEntries(
  Object.entries(messages).map(([field, values]) => [field, { ...values }]),
)
const sameMessages = (before: Record<string, string> = {}, after: Record<string, string> = {}) =>
  JSON.stringify(Object.entries(before).sort()) === JSON.stringify(Object.entries(after).sort())

/** 基本信息与图标使用独立草稿，由详情 hook 统一持久化，不触碰其他页签。 */
export const useApplicationTemplateBasicInfo = (options: BasicInfoOptions) => {
  const { t, locale } = useI18n()
  const open = ref(false)
  const submitting = ref(false)
  const error = ref('')
  const formRef = ref<FormInstance>()
  const draft = reactive<BasicInfoDraft>({ name: '', description: '', i18nMessages: {} })
  const iconOpen = ref(false)
  const iconDraft = ref('')
  const iconError = ref('')
  let initial: BasicInfoDraft = { ...draft }
  let generation = 0
  const detail = computed(options.getDetail)
  const busy = computed(() => submitting.value || options.busy())
  const disabled = computed(() => busy.value || !options.canUpdate()
    || !options.getTemplateId() || detail.value.id !== options.getTemplateId())
  const language = computed(() => String(locale.value || 'zh').replace('_', '-').split('-')[0])

  const reset = () => {
    draft.name = detail.value.i18nName || detail.value.name || ''
    draft.description = detail.value.i18nDescription || detail.value.description || ''
    draft.i18nMessages = copyMessages(detail.value.i18nMessages)
    initial = { ...draft, i18nMessages: copyMessages(draft.i18nMessages) }
    error.value = ''
    formRef.value?.clearValidate()
  }
  const edit = () => {
    if (disabled.value || iconOpen.value) return
    reset()
    open.value = true
  }
  const cancel = () => {
    if (busy.value) return
    open.value = false
    reset()
  }

  // 隐藏语言同样受现有字段长度约束，不验证或改写文档等其他翻译字段。
  const validationError = (field: 'name' | 'description') => {
    const value = draft[field].trim()
    if (field === 'name' && !value) return t('ApplicationTemplate.message.nameRequired')
    const limit = field === 'name' ? 64 : 512
    const translations = Object.values(draft.i18nMessages[field] || {})
    return value.length > limit || translations.some(text => text.length > limit)
      ? t(`ApplicationTemplate.message.${field}MaxLength`) : ''
  }
  const rules = computed<Record<string, RuleObject[]>>(() => Object.fromEntries(
    (['name', 'description'] as const).map(field => [field, [{
      required: field === 'name', trigger: 'blur',
      validator: async () => { const message = validationError(field); if (message) throw new Error(message) },
    }]]),
  ))

  /** 合并最新的其他字段翻译，只提交弹窗中实际改动的名称和说明。 */
  const buildUpdate = (): TemplateBasicInfoUpdate => {
    const payload: TemplateBasicInfoUpdate = {}
    const messages = copyMessages(detail.value.i18nMessages)
    for (const field of ['name', 'description'] as const) {
      const value = draft[field].trim()
      if (value === initial[field].trim() && sameMessages(initial.i18nMessages[field], draft.i18nMessages[field])) continue
      payload[field] = value
      const translations = { ...draft.i18nMessages[field] }
      if (value !== initial[field].trim()) {
        if (value) translations[language.value] = value
        else delete translations[language.value]
      }
      messages[field] = translations
      payload.i18nMessages = messages
    }
    return payload
  }

  // 基本信息与图标各自保留草稿，共用提交锁及目标身份保护。
  const saveChanges = async (
    visible: Ref<boolean>,
    feedback: Ref<string>,
    buildPayload: () => TemplateBasicInfoUpdate | Promise<TemplateBasicInfoUpdate>,
  ) => {
    if (!visible.value || disabled.value) return false
    const current = generation
    submitting.value = true
    feedback.value = ''
    try {
      const payload = await buildPayload()
      if (current !== generation || !options.canUpdate() || options.busy()) return false
      const saved = Object.keys(payload).length ? await options.persist(payload) : true
      if (current !== generation) return false
      if (saved) visible.value = false
      else feedback.value = t('ApplicationTemplate.message.saveFailed')
      return saved
    } catch (cause) {
      if (current === generation) feedback.value = cause instanceof Error
        ? cause.message || t('ApplicationTemplate.message.saveFailed') : t('ApplicationTemplate.message.saveFailed')
      return false
    } finally {
      if (current === generation) submitting.value = false
    }
  }

  const save = () => saveChanges(open, error, async () => {
    await formRef.value?.validate()
    const invalid = (['name', 'description'] as const).map(validationError).find(Boolean)
    if (invalid) throw new Error(invalid)
    return buildUpdate()
  })
  const resetIcon = () => {
    iconDraft.value = detail.value.icon || ''
    iconError.value = ''
  }
  const editIcon = () => {
    if (disabled.value || open.value) return
    resetIcon()
    iconOpen.value = true
  }
  const cancelIcon = () => {
    if (busy.value) return
    iconOpen.value = false
    resetIcon()
  }
  const saveIcon = () => saveChanges(iconOpen, iconError, () => {
    if (iconDraft.value.length > 256) throw new Error(t('ApplicationTemplate.message.iconMaxLength'))
    return iconDraft.value === String(detail.value.icon || '') ? {} : { icon: iconDraft.value }
  })

  // 路由复用时立即关闭旧弹窗；旧提交结束也不能关闭新模板的弹窗或覆盖草稿。
  watch(options.getTemplateId, () => {
    generation++
    open.value = false
    iconOpen.value = false
    submitting.value = false
    reset()
    resetIcon()
  }, { flush: 'sync' })
  onScopeDispose(() => { generation++ })
  return {
    open, submitting, busy, disabled, error, formRef, draft, detail, rules, edit, cancel, save,
    icon: { open: iconOpen, draft: iconDraft, error: iconError, edit: editIcon, cancel: cancelIcon, save: saveIcon },
  }
}

export type ApplicationTemplateBasicInfoState = ReturnType<typeof useApplicationTemplateBasicInfo>
