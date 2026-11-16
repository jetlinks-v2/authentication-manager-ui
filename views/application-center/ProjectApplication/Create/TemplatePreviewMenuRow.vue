<template>
  <span class="template-menu-row">
    <span class="template-menu-row__title">
      <AIcon v-if="showIcon" type="AppstoreOutlined" />
      {{ menu.title }}
    </span>
    <span v-if="menu.buttons.length" class="template-menu-row__buttons">
      <a-tag v-for="button in menu.buttons" :key="button.key">{{ button.title }}</a-tag>
    </span>
  </span>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import type { TemplatePreviewMenu } from './templatePreviewModel'

defineProps({
  menu: { type: Object as PropType<TemplatePreviewMenu>, required: true },
  showIcon: { type: Boolean, default: false },
})
</script>

<style scoped>
.template-menu-row {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: var(--space-3);
  padding-block: var(--space-1);
}

.template-menu-row__title {
  display: inline-flex;
  max-width: 45%;
  flex-shrink: 0;
  align-items: center;
  gap: var(--space-2);
  color: var(--ink-1);
  overflow-wrap: anywhere;
}

.template-menu-row__title:only-child { max-width: none; }

.template-menu-row__buttons {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-1);
}

.template-menu-row__buttons :deep(.ant-tag) {
  max-width: 100%;
  margin: 0;
  white-space: normal;
  overflow-wrap: anywhere;
}
</style>
