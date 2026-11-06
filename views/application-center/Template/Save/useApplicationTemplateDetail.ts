import { computed, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  getApplicationTemplate,
  updateApplicationTemplate,
  type BusinessApplicationTemplate,
  type ApplicationTemplateConfiguration,
} from '@authentication-manager-ui/api/application-center/applicationTemplate'
import { templateState, unwrapResult } from './menu-config.shared'
import type { TemplateBasicInfoUpdate } from './useApplicationTemplateBasicInfo'

interface DetailMessages {
  loadFailed: string
  documentMaxLength: string
  saveFailed: string
  updated: (name: string) => string
}

export const useApplicationTemplateDetail = (
  getTemplateId: () => string,
  messages: DetailMessages,
) => {
  const { locale } = useI18n()
  const detail = ref<BusinessApplicationTemplate>({} as BusinessApplicationTemplate)
  const documentDraft = ref('')
  const documentI18nDraft = ref<Record<string, string>>({})
  const loading = ref(false)
  const saving = ref(false)
  let targetRevision = 0
  let loadRevision = 0
  const isCurrent = (templateId: string, revision: number) =>
    revision === targetRevision && templateId === getTemplateId()

  // 详情路由复用时，旧请求不能回填新目标或释放新目标的保存状态。
  watch(getTemplateId, () => {
    targetRevision++
    loading.value = false
    saving.value = false
  }, { flush: 'sync' })
  onScopeDispose(() => { targetRevision++ })

  const state = computed(() => templateState(detail.value))
  const displayName = computed(() => detail.value.name || detail.value.code || detail.value.id || '')
  const localizedDocument = computed(() => detail.value.i18nDocument || detail.value.document || '')
  const documentDirty = computed(() => {
    const saved = detail.value.i18nMessages?.document || {}
    return documentDraft.value !== localizedDocument.value
      || JSON.stringify(documentI18nDraft.value) !== JSON.stringify(saved)
  })

  const load = async () => {
    const templateId = getTemplateId()
    if (!templateId) return
    const revision = targetRevision
    const request = ++loadRevision
    loading.value = true
    try {
      const detailResponse = await getApplicationTemplate(templateId)
      if (!isCurrent(templateId, revision) || request !== loadRevision) return
      if (detailResponse?.success === false) throw new Error(detailResponse.message || messages.loadFailed)
      detail.value = unwrapResult(detailResponse, {} as BusinessApplicationTemplate)
      documentDraft.value = String(detail.value.i18nDocument || detail.value.document || '')
      documentI18nDraft.value = { ...(detail.value.i18nMessages?.document || {}) }
    } catch (error) {
      if (isCurrent(templateId, revision) && request === loadRevision) {
        onlyMessage(error instanceof Error ? error.message : messages.loadFailed, 'error')
      }
    } finally {
      if (isCurrent(templateId, revision) && request === loadRevision) loading.value = false
    }
  }

  const patch = async (payload: Partial<BusinessApplicationTemplate>) => {
    const templateId = getTemplateId()
    if (!templateId || detail.value.id !== templateId || loading.value || saving.value) return false
    const revision = targetRevision
    saving.value = true
    try {
      const response = await updateApplicationTemplate(templateId, payload)
      if (!isCurrent(templateId, revision)) return false
      if (response?.success === false) throw new Error(response.message || messages.saveFailed)
      onlyMessage(messages.updated(displayName.value || templateId))
      await load()
      return true
    } finally {
      if (isCurrent(templateId, revision)) saving.value = false
    }
  }

  /** 基本信息原位合并，保留文档草稿及配置对象引用，避免重载触发其他页签重置。 */
  const updateBasicInfo = async (payload: TemplateBasicInfoUpdate): Promise<boolean> => {
    const templateId = getTemplateId()
    if (!templateId || detail.value.id !== templateId || loading.value || saving.value) return false
    const revision = targetRevision
    saving.value = true
    try {
      const response = await updateApplicationTemplate(templateId, payload)
      if (!isCurrent(templateId, revision)) return false
      if (response?.success === false) throw new Error(response.message || messages.saveFailed)
      const nextDetail = { ...detail.value, ...payload }
      const language = String(locale.value || 'zh').replace('_', '-').split('-')[0]
      // 局部更新后同步后端返回的本地化显示字段，避免摘要仍显示旧名称和说明。
      if ('name' in payload || 'i18nMessages' in payload) {
        nextDetail.i18nName = nextDetail.i18nMessages?.name?.[language] || nextDetail.name
      }
      if ('description' in payload || 'i18nMessages' in payload) {
        nextDetail.i18nDescription = nextDetail.i18nMessages?.description?.[language] || nextDetail.description || ''
      }
      detail.value = nextDetail
      onlyMessage(messages.updated(displayName.value || templateId))
      return true
    } finally {
      if (isCurrent(templateId, revision)) saving.value = false
    }
  }

  const toggleState = () => patch({ state: state.value === 'enabled' ? 'disabled' : 'enabled' })

  const updateConfiguration = (configuration: ApplicationTemplateConfiguration) => patch({ configuration })

  const saveDocument = async () => {
    if (documentDraft.value.length > 200000) {
      onlyMessage(messages.documentMaxLength, 'error')
      return
    }
    if (documentDirty.value) {
      await patch({
        document: documentDraft.value,
        i18nMessages: {
          ...(detail.value.i18nMessages || {}),
          document: documentI18nDraft.value,
        },
      })
    }
  }

  return {
    detail,
    documentDraft,
    documentI18nDraft,
    documentDirty,
    state,
    displayName,
    loading,
    saving,
    load,
    updateBasicInfo,
    updateConfiguration,
    toggleState,
    saveDocument,
  }
}
