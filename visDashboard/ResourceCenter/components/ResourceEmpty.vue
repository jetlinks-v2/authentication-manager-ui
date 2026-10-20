<template>
  <CloudEmpty class="resource-empty">
    <template #description>
      <div class="empty-title">{{ title }}</div>
      <div v-if="description" class="empty-desc">{{ description }}</div>
    </template>
    <a-button v-if="actionText" type="primary" class="empty-action" @click="$emit('action')">
      {{ actionText }}
    </a-button>
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
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 0;
  text-align: center;
  padding: 16px 8px;
  box-sizing: border-box;
}

.resource-empty :deep(.ant-empty) { margin: 0; }

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
}

.empty-action {
  border-radius: 6px;
  height: 32px;
  padding: 0 16px;
  font-size: 14px;
}
</style>
