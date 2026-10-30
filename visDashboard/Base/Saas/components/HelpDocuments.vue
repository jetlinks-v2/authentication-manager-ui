<template>
  <div class="saas-help-list">
    <button v-for="document in documents" :key="document.id" type="button" class="saas-help-item" :title="document.title" @click="$emit('open', document.id)">
      <FileTextOutlined class="saas-help-icon" />
      <span>{{ document.title }}</span>
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
  gap: 4px;
  min-width: 0;
  padding: 4px 0;
  /* 四条 38px 列表项、三处 4px 间距及上下留白，更多文档滚动查看。 */
  max-height: 172px;
  overflow-y: auto;
  box-sizing: border-box;
}
.saas-help-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 38px;
  flex-shrink: 0;
  padding: 8px 12px;
  margin: 0;
  border: 0;
  border-radius: var(--r-2, 6px);
  background: transparent;
  color: var(--business-component-text, #1f2329);
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  text-align: left;
  cursor: pointer;
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
.saas-help-icon {
  color: var(--business-component-muted, #646c73);
  flex-shrink: 0;
  font-size: 15px;
  transition: color 0.2s ease;
}
.saas-help-item > span:not(.anticon) {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.2s ease;
}
.saas-help-arrow {
  flex-shrink: 0;
  color: var(--business-component-muted, #86909c);
  font-size: 11px;
  transition: color 0.2s ease, transform 0.2s ease;
}
</style>
