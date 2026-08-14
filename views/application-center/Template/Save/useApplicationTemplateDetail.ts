import { computed, ref } from 'vue'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  getApplicationTemplate,
  updateApplicationTemplate,
  type BusinessApplicationTemplate,
} from '@authentication-manager-ui/api/application-center/applicationTemplate'
import { templateState, unwrapResult } from './menu-config.shared'

interface DetailMessages {
  loadFailed: string
  nameRequired: string
  nameMaxLength: string
  descriptionMaxLength: string
  documentMaxLength: string
  iconMaxLength: string
  updated: (name: string) => string
}

export const useApplicationTemplateDetail = (
  getTemplateId: () => string,
  messages: DetailMessages,
) => {
  const detail = ref<BusinessApplicationTemplate>({} as BusinessApplicationTemplate)
  const documentDraft = ref('')
  const loading = ref(false)
  const saving = ref(false)

  const state = computed(() => templateState(detail.value))
  const displayName = computed(() => detail.value.name || detail.value.code || detail.value.id || '')
  const documentDirty = computed(() => documentDraft.value !== String(detail.value.document || ''))

  const load = async () => {
    const templateId = getTemplateId()
    if (!templateId) return
    loading.value = true
    try {
      const detailResponse = await getApplicationTemplate(templateId)
      detail.value = unwrapResult(detailResponse, {} as BusinessApplicationTemplate)
      documentDraft.value = String(detail.value.document || '')
    } catch (error: any) {
      onlyMessage(error?.message || messages.loadFailed, 'error')
    } finally {
      loading.value = false
    }
  }

  const patch = async (payload: Partial<BusinessApplicationTemplate>) => {
    const templateId = getTemplateId()
    if (!templateId) return false
    saving.value = true
    try {
      await updateApplicationTemplate(templateId, payload)
      onlyMessage(messages.updated(displayName.value || templateId))
      await load()
      return true
    } finally {
      saving.value = false
    }
  }

  const updateName = async (value: string) => {
    const name = String(value || '').trim()
    if (!name) return onlyMessage(messages.nameRequired, 'error')
    if (name.length > 64) return onlyMessage(messages.nameMaxLength, 'error')
    if (name !== detail.value.name) await patch({ name })
  }

  const updateDescription = async (value: string) => {
    const description = String(value || '').trim()
    if (description.length > 512) return onlyMessage(messages.descriptionMaxLength, 'error')
    if (description !== String(detail.value.description || '')) await patch({ description })
  }

  const updateIcon = async (icon: string) => {
    if (icon.length > 256) return onlyMessage(messages.iconMaxLength, 'error')
    if (icon !== String(detail.value.icon || '')) await patch({ icon })
  }

  const toggleState = () => patch({ state: state.value === 'enabled' ? 'disabled' : 'enabled' })

  const saveDocument = async () => {
    if (documentDraft.value.length > 200000) {
      onlyMessage(messages.documentMaxLength, 'error')
      return
    }
    if (documentDirty.value) await patch({ document: documentDraft.value })
  }

  return {
    detail,
    documentDraft,
    documentDirty,
    state,
    displayName,
    loading,
    saving,
    load,
    updateName,
    updateDescription,
    updateIcon,
    toggleState,
    saveDocument,
  }
}
