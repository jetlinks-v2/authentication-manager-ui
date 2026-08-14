import { computed, ref } from 'vue'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  APPLICATION_TEMPLATE_TAG_TARGET_TYPE,
  getApplicationTemplate,
  getTargetTags,
  overwriteTargetTags,
  queryTagCategoryTreeByType,
  queryTagTreeByCategory,
  updateApplicationTemplate,
  type BusinessApplicationTemplate,
} from '@authentication-manager-ui/api/application-center/applicationTemplate'
import { enumValue, templateState, unwrapList, unwrapResult } from './menu-config.shared'

interface TagItem {
  id: string
  name: string
}

interface TagCategory extends TagItem {
  children?: TagCategory[]
}

interface DetailMessages {
  loadFailed: string
  nameRequired: string
  nameMaxLength: string
  descriptionMaxLength: string
  documentMaxLength: string
  iconMaxLength: string
  updated: (name: string) => string
}

const collectCategoryIds = (categories: TagCategory[], result: string[] = []) => {
  categories.forEach(item => {
    if (item.id) result.push(String(item.id))
    collectCategoryIds(item.children || [], result)
  })
  return result
}

export const useApplicationTemplateDetail = (
  getTemplateId: () => string,
  messages: DetailMessages,
) => {
  const detail = ref<BusinessApplicationTemplate>({} as BusinessApplicationTemplate)
  const tags = ref<TagItem[]>([])
  const tagTree = ref<any[]>([])
  const documentDraft = ref('')
  const loading = ref(false)
  const saving = ref(false)
  const tagOptionsLoaded = ref(false)

  const state = computed(() => templateState(detail.value))
  const displayName = computed(() => detail.value.name || detail.value.code || detail.value.id || '')
  const tagIds = computed(() => tags.value.map(item => item.id))
  const documentDirty = computed(() => documentDraft.value !== String(detail.value.document || ''))

  const load = async () => {
    const templateId = getTemplateId()
    if (!templateId) return
    loading.value = true
    try {
      const [detailResponse, tagsResponse] = await Promise.all([
        getApplicationTemplate(templateId),
        getTargetTags(APPLICATION_TEMPLATE_TAG_TARGET_TYPE, templateId),
      ])
      detail.value = unwrapResult(detailResponse, {} as BusinessApplicationTemplate)
      tags.value = unwrapList<TagItem>(tagsResponse)
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

  const loadTagOptions = async () => {
    if (tagOptionsLoaded.value) return
    try {
      const categories = unwrapList<TagCategory>(
        await queryTagCategoryTreeByType(APPLICATION_TEMPLATE_TAG_TARGET_TYPE),
      )
      const tagMap: Record<string, TagItem[]> = {}
      await Promise.all(collectCategoryIds(categories).map(async id => {
        tagMap[id] = unwrapList<TagItem>(await queryTagTreeByCategory(id))
      }))
      const toNode = (category: TagCategory): any => ({
        title: category.name,
        value: `category:${category.id}`,
        disabled: true,
        children: [
          ...(tagMap[category.id] || []).map(tag => ({ title: tag.name, value: tag.id })),
          ...(category.children || []).map(toNode),
        ],
      })
      tagTree.value = categories.map(toNode)
      tagOptionsLoaded.value = true
    } catch (error: any) {
      onlyMessage(error?.message || messages.loadFailed, 'error')
    }
  }

  const saveTags = async (ids: string[]) => {
    const templateId = getTemplateId()
    if (!templateId) return
    saving.value = true
    try {
      await overwriteTargetTags(
        APPLICATION_TEMPLATE_TAG_TARGET_TYPE,
        templateId,
        Array.from(new Set(ids.filter(Boolean))),
      )
      onlyMessage(messages.updated(displayName.value || templateId))
      await load()
    } finally {
      saving.value = false
    }
  }

  const saveDocument = async () => {
    if (documentDraft.value.length > 200000) {
      onlyMessage(messages.documentMaxLength, 'error')
      return
    }
    if (documentDirty.value) await patch({ document: documentDraft.value })
  }

  return {
    detail,
    tags,
    tagIds,
    tagTree,
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
    loadTagOptions,
    saveTags,
    saveDocument,
  }
}
