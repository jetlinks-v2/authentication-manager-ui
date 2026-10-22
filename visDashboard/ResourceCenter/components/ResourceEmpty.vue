<template>
  <CloudEmpty class="resource-empty" :image-style="{ height: 'var(--resource-empty-image-size, 64px)' }">
    <template #description>
      <div class="empty-title">{{ title }}</div>
      <div v-if="description" class="empty-desc">{{ description }}</div>
    </template>
    <slot>
      <a-button v-if="actionText" type="primary" class="empty-action" @click="$emit('action')">
        {{ actionText }}
      </a-button>
    </slot>
  </CloudEmpty>
</template>

<script setup lang="ts">
import CloudEmpty from '@jetlinks-web-core/components/CloudEmpty/index.vue'

// 保留既有空态的文案与动作契约，插图统一交由平台 CloudEmpty 渲染。
defineProps<{
  icon?: string
  title: string
  description?: string
  actionText?: string
}>()

defineEmits<{
  action: []
}>()
</script>

<style scoped>
.resource-empty {
  display: flex;
  flex-direction: column;
  flex: 1;
  align-items: center;
  justify-content: safe center;
  height: 100%;
  min-height: 0;
  min-width: 0;
  text-align: center;
  padding: var(--space-2, 8px);
  box-sizing: border-box;
  overflow: auto;
  container: resource-empty / size;
}

.resource-empty :deep(.ant-empty) { margin: 0; max-width: 100%; flex-shrink: 0; }
.resource-empty :deep(.ant-empty-image) { margin-bottom: var(--space-2, 8px); }
.resource-empty :deep(.ant-empty-image img) { display: block; margin-inline: auto; max-height: 100%; object-fit: contain; }
.resource-empty :deep(.ant-empty-description) { margin: 0; }
.resource-empty :deep(.ant-empty-footer) { display: flex; justify-content: center; margin-top: var(--space-2, 8px); }

.empty-title {
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 4px;
}

.empty-desc {
  font-size: 12px;
  line-height: 18px;
  color: #8c8c8c;
  max-width: 280px;
  margin-inline: auto;
  overflow-wrap: anywhere;
}

.empty-action {
  border-radius: 6px;
  height: 32px;
  padding: 0 16px;
  font-size: 14px;
}

/* 按实际可用高度收紧装饰与操作，避免短卡片裁掉文案和按钮。 */
@container resource-empty (max-height: 180px) {
  .resource-empty :deep(.ant-empty) { --resource-empty-image-size: 40px; }
  .empty-action { height: 24px; padding: 0 var(--space-2, 8px); font-size: 12px; }
}

@container resource-empty (max-height: 120px) {
  .resource-empty :deep(.ant-empty-image) { display: none; }
}
</style>
