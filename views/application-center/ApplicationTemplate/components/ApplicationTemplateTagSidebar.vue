<template>
  <TagManagerSidebar
    ref="sidebarRef"
    v-model:selectedTagIds="tagIds"
    :permission="permission"
    :client="client"
    :texts="texts"
    @change="$emit('change')"
    @refresh="$emit('refresh')"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  TagManagerSidebar,
  type TagManagerSidebarClient,
} from '@jetlinks-web-core/components/TagManagerSidebar'
import {
  APPLICATION_TEMPLATE_TAG_TARGET_TYPE,
  deleteTag,
  deleteTagCategory,
  queryTagCategoryTreeByType,
  queryTagTreeByCategory,
  saveTag,
  saveTagCategory,
  updateTag,
  updateTagCategory,
} from '@authentication-manager-ui/api/application-center/applicationTemplate'

const props = defineProps({
  selectedTagIds: { type: Array as PropType<string[]>, default: () => [] },
  permission: { type: String, default: 'application-center/ApplicationTemplate' },
})

const emit = defineEmits<{
  (event: 'update:selectedTagIds', ids: string[]): void
  (event: 'change'): void
  (event: 'refresh'): void
}>()

const { t: $t } = useI18n()
const sidebarRef = ref()
const tagIds = computed({
  get: () => props.selectedTagIds || [],
  set: (value: string[]) => emit('update:selectedTagIds', value),
})
const client: TagManagerSidebarClient = {
  queryCategories: () => queryTagCategoryTreeByType(APPLICATION_TEMPLATE_TAG_TARGET_TYPE),
  queryTags: (categoryId: string) => queryTagTreeByCategory(categoryId),
  saveCategory: payload => saveTagCategory({ ...payload, type: APPLICATION_TEMPLATE_TAG_TARGET_TYPE }),
  updateCategory: payload => updateTagCategory({ ...payload, type: APPLICATION_TEMPLATE_TAG_TARGET_TYPE }),
  deleteCategory: (id: string) => deleteTagCategory(id),
  saveTag: payload => saveTag(payload),
  updateTag: payload => updateTag(payload),
  deleteTag: (id: string) => deleteTag(id),
}
const texts = computed(() => ({
  tags: $t('ApplicationTemplate.tag.tags'),
  selectedTags: $t('ApplicationTemplate.tag.selectedTags'),
  clearSelectedTags: $t('ApplicationTemplate.tag.clearSelectedTags'),
  edit: $t('ApplicationTemplate.common.edit'),
  finishEdit: $t('ApplicationTemplate.tag.finishEdit'),
  dragSort: $t('ApplicationTemplate.tag.dragSort'),
  addCategory: $t('ApplicationTemplate.tag.addCategory'),
  editCategory: $t('ApplicationTemplate.tag.editCategory'),
  deleteCategory: $t('ApplicationTemplate.tag.deleteCategory'),
  emptyTags: $t('ApplicationTemplate.tag.emptyTags'),
  emptyTagCategory: $t('ApplicationTemplate.tag.emptyTagCategory'),
  categoryName: $t('ApplicationTemplate.tag.categoryName'),
  categoryNamePlaceholder: $t('ApplicationTemplate.tag.categoryNamePlaceholder'),
  categoryNameRequired: $t('ApplicationTemplate.tag.categoryNameRequired'),
  categoryCode: $t('ApplicationTemplate.tag.categoryCode'),
  categoryCodePlaceholder: $t('ApplicationTemplate.tag.categoryCodePlaceholder'),
  categoryCodeRequired: $t('ApplicationTemplate.tag.categoryCodeRequired'),
  categoryCodeMaxLength: $t('ApplicationTemplate.tag.categoryCodeMaxLength'),
  addTag: $t('ApplicationTemplate.tag.addTag'),
  editTag: $t('ApplicationTemplate.tag.editTag'),
  deleteTag: $t('ApplicationTemplate.tag.deleteTag'),
  tagName: $t('ApplicationTemplate.tag.tagName'),
  tagNamePlaceholder: $t('ApplicationTemplate.tag.tagNamePlaceholder'),
  tagNameRequired: $t('ApplicationTemplate.tag.tagNameRequired'),
  tagCategory: $t('ApplicationTemplate.tag.tagCategory'),
  tagCategoryPlaceholder: $t('ApplicationTemplate.tag.tagCategoryPlaceholder'),
  tagCategoryRequired: $t('ApplicationTemplate.tag.tagCategoryRequired'),
  state: $t('ApplicationTemplate.field.state'),
  enabled: $t('ApplicationTemplate.common.enabled'),
  disabled: $t('ApplicationTemplate.common.disabled'),
  icon: $t('ApplicationTemplate.field.icon'),
  codeFormat: $t('ApplicationTemplate.message.codeFormat'),
  success: $t('ApplicationTemplate.message.success'),
  confirmDeleteCategory: $t('ApplicationTemplate.tag.confirmDeleteCategory'),
  confirmDeleteTag: $t('ApplicationTemplate.tag.confirmDeleteTag'),
}))

defineExpose({
  refresh: () => sidebarRef.value?.refresh?.(),
})
</script>
