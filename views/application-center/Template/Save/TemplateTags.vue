<template>
  <div class="template-tags">
    <a-tag
      v-for="tag in tags"
      :key="tag.id"
      color="blue"
      :closable="editable"
      @close.prevent="$emit('save', tagIds.filter(id => id !== tag.id))"
    >
      {{ tag.name }}
    </a-tag>
    <span v-if="!tags.length" class="template-tags__empty">--</span>
    <a-popover v-if="editable" v-model:open="open" trigger="click" @open-change="onOpenChange">
      <template #content>
        <div class="template-tags__editor">
          <a-tree-select
            v-model:value="draft"
            tree-checkable
            multiple
            show-search
            tree-default-expand-all
            :tree-data="treeData"
            :field-names="{ label: 'title', value: 'value', children: 'children' }"
            :placeholder="$t('ApplicationTemplate.tag.placeholder')"
          />
          <div class="template-tags__actions">
            <a-button size="small" @click="open = false">{{ $t('ApplicationTemplate.common.cancel') }}</a-button>
            <a-button type="primary" size="small" @click="save">{{ $t('ApplicationTemplate.common.confirm') }}</a-button>
          </div>
        </div>
      </template>
      <a-button type="text" size="small" :title="$t('ApplicationTemplate.tag.addTag')">
        <AIcon type="PlusOutlined" />
      </a-button>
    </a-popover>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'

const props = defineProps({
  tags: { type: Array as PropType<Array<{ id: string; name: string }>>, default: () => [] },
  tagIds: { type: Array as PropType<string[]>, default: () => [] },
  treeData: { type: Array as PropType<any[]>, default: () => [] },
  editable: { type: Boolean, default: false },
})
const emit = defineEmits<{
  (event: 'load-options'): void
  (event: 'save', ids: string[]): void
}>()
const open = ref(false)
const draft = ref<string[]>([])

const onOpenChange = (value: boolean) => {
  if (value) {
    draft.value = [...props.tagIds]
    emit('load-options')
  }
}
const save = () => {
  emit('save', [...draft.value])
  open.value = false
}
</script>

<style scoped>
.template-tags { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-1); }
.template-tags :deep(.ant-tag) { margin: 0; }
.template-tags__empty { color: var(--ink-4); }
.template-tags__editor { width: min(22rem, 80vw); }
.template-tags__editor :deep(.ant-select) { width: 100%; }
.template-tags__actions { display: flex; justify-content: flex-end; gap: var(--space-2); margin-top: var(--space-3); }
</style>
