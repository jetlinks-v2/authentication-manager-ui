<template>
  <div class="saas-help-list">
    <button
      v-for="(document, index) in documents"
      :key="document.id"
      type="button"
      class="saas-help-item"
      :class="{ 'saas-help-item--divided': index < documents.length - 1 }"
      :title="document.title"
      @click="$emit('open', document.id)"
    >
      <FileTextOutlined class="saas-help-icon" />
      <span class="saas-help-title">{{ document.title }}</span>
      <RightOutlined class="saas-help-arrow" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { type PropType } from 'vue'
import { FileTextOutlined, RightOutlined } from '@ant-design/icons-vue'
import type { SaasHelpDocument } from './presentation'

defineProps({
  documents: { type: Array as PropType<SaasHelpDocument[]>, default: () => [] },
})
defineEmits<{ open: [id: string] }>()
</script>

<style scoped lang="less">
.saas-help-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
  padding: 0;
  box-sizing: border-box;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}
.saas-help-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  flex: 1 0 auto;
  padding: 12px 18px;
  margin: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #1f2329;
  font: inherit;
  font-size: 14px;
  line-height: 20px;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
  transition: background-color 0.2s ease, color 0.2s ease;

  &:hover {
    background: var(--home-card-surface, #f7f9fc);
    color: var(--business-component-primary, #1677ff);

    .saas-help-icon {
      color: var(--business-component-primary, #1677ff);
    }
    .saas-help-arrow {
      color: var(--business-component-primary, #1677ff);
      transform: translateX(2px);
    }
  }

  &:focus-visible {
    outline: 2px solid var(--business-component-primary, #1677ff);
    outline-offset: -2px;
  }
}
.saas-help-item--divided,
.saas-help-item:not(:last-child) {
  border-bottom: 1px solid #f0f2f5;
}
.saas-help-icon {
  color: #86909c;
  flex-shrink: 0;
  font-size: 16px;
  transition: color 0.2s ease;
}
.saas-help-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  color: inherit;
  transition: color 0.2s ease;
}
.saas-help-arrow {
  flex-shrink: 0;
  color: var(--business-component-muted, #86909c);
  font-size: 8.5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: color 0.2s ease, transform 0.2s ease;
}
</style>
