import { computed, onScopeDispose, reactive, ref, watch, type Ref } from 'vue'
import type { FormInstance } from 'ant-design-vue'
import type { RuleObject } from 'ant-design-vue/es/form/interface'
import { useI18n } from 'vue-i18n'
import { useApplicationTemplateMedia } from '../useApplicationTemplateMedia'
import type { BusinessApplicationTemplate, I18nMessages } from '@authentication-manager-ui/api/application-center/applicationTemplate'

export type TemplateBasicInfoUpdate = Partial<Pick<BusinessApplicationTemplate, 'name' | 'description' | 'icon' | 'coverImage' | 'i18nMessages'>>
interface BasicInfoDraft {
  name: string
  description: string
  icon: string
  coverImage: string
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

/** 基本信息包含媒体草稿，独立图标入口保留便捷编辑；统一持久化且不触碰其他页签。 */
export const useApplicationTemplateBasicInfo = (options: BasicInfoOptions) => {
  const { t, locale } = useI18n()
  const open = ref(false)
  const submitting = ref(false)
  const error = ref('')
  const formRef = ref<FormInstance>()
  const draft = reactive<BasicInfoDraft>({ name: '', description: '', icon: '', coverImage: '', i18nMessages: {} })
  const iconOpen = ref(false)
  const iconDraft = ref('')
  const iconError = ref('')
  let initial: BasicInfoDraft = { ...draft }
  let generation = 0
  const detail = computed(options.getDetail)
  const loading = computed(() => submitting.value || options.busy())
  const disabled = computed(() => loading.value || !options.canUpdate()
    || !options.getTemplateId() || detail.value.id !== options.getTemplateId())
  const media = useApplicationTemplateMedia(draft, () => disabled.value)
  const busy = computed(() => loading.value || media.mediaBusy.value)
  const language = computed(() => String(locale.value || 'zh').replace('_', '-').split('-')[0])

  const reset = () => {
    draft.name = detail.value.i18nName || detail.value.name || ''
    draft.description = detail.value.i18nDescription || detail.value.description || ''
    draft.icon = detail.value.icon || ''
    draft.coverImage = detail.value.coverImage || ''
    media.resetMedia()
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
    if (!value) return t(`ApplicationTemplate.message.${field}Required`)
    const limit = field === 'name' ? 64 : 512
    const translations = Object.values(draft.i18nMessages[field] || {})
    return value.length > limit || translations.some(text => text.length > limit)
      ? t(`ApplicationTemplate.message.${field}MaxLength`) : ''
  }
  const rules = computed<Record<string, RuleObject[]>>(() => ({
    ...Object.fromEntries((['name', 'description'] as const).map(field => [field, [{
      required: true, trigger: 'blur',
      validator: async () => { const message = validationError(field); if (message) throw new Error(message) },
    }]])),
    icon: [{ max: 256, message: t('ApplicationTemplate.message.iconMaxLength'), trigger: 'change' }],
    coverImage: [{ max: 1024, message: t('ApplicationTemplate.message.coverImageMaxLength'), trigger: 'change' }],
  }))

  /** 合并最新的其他字段翻译，只提交弹窗中实际改动的名称、说明及媒体字段。 */
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
    for (const field of ['icon', 'coverImage'] as const) {
      if (draft[field] !== initial[field]) payload[field] = draft[field]
    }
    return payload
  }

  // 基本信息与图标各自保留草稿，共用提交锁及目标身份保护。
  const saveChanges = async (
    visible: Ref<boolean>,
    feedback: Ref<string>,
    buildPayload: () => TemplateBasicInfoUpdate | Promise<TemplateBasicInfoUpdate>,
  ) => {
    if (!visible.value || disabled.value || media.mediaBusy.value) return false
    const current = generation
    submitting.value = true
    feedback.value = ''
    try {
      const payload = await buildPayload()
      if (current !== generation || !options.canUpdate() || options.busy() || media.mediaBusy.value) return false
      const saved = Object.keys(payload).length ? await options.persist(payload) : true
      if (current !== generation) return false
      if (saved) visible.value = false
      else feedback.value = t('ApplicationTemplate.message.saveFailed')
      return saved
    } catch (cause) {
      if (current === generation) {
        // Ant Form 已在字段处显示校验结果，不将尚未发出的请求误报为保存失败。
        const formValidationFailed = typeof cause === 'object' && cause !== null && 'errorFields' in cause
        feedback.value = formValidationFailed ? '' : cause instanceof Error
          ? cause.message || t('ApplicationTemplate.message.saveFailed') : t('ApplicationTemplate.message.saveFailed')
      }
      return false
    } finally {
      if (current === generation) submitting.value = false
    }
  }

  const save = () => saveChanges(open, error, async () => {
    await formRef.value?.validate()
    const invalid = (['name', 'description'] as const).map(validationError).find(Boolean)
    if (invalid) throw new Error(invalid)
    if (draft.icon.length > 256) throw new Error(t('ApplicationTemplate.message.iconMaxLength'))
    if (draft.coverImage.length > 1024) throw new Error(t('ApplicationTemplate.message.coverImageMaxLength'))
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
    open, submitting, loading, busy, disabled, ...media, error, formRef, draft, detail, rules, edit, cancel, save,
    icon: { open: iconOpen, draft: iconDraft, error: iconError, edit: editIcon, cancel: cancelIcon, save: saveIcon },
  }
}

export type ApplicationTemplateBasicInfoState = ReturnType<typeof useApplicationTemplateBasicInfo>
