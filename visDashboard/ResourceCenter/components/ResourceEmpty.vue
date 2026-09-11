<template>
  <div class="resource-empty">
    <div class="empty-icon">
      <slot name="icon">
        <AIcon v-if="icon" :type="icon" />
      </slot>
    </div>
    <div class="empty-title">{{ title }}</div>
    <div v-if="description" class="empty-desc">{{ description }}</div>
    <a-button v-if="actionText" type="primary" class="empty-action" @click="$emit('action')">
      {{ actionText }}
    </a-button>
  </div>
</template>

<script setup lang="ts">
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

.empty-icon {
  font-size: 36px;
  line-height: 1;
  color: #8c8c8c;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

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
  margin-bottom: 16px;
}

.empty-action {
  border-radius: 6px;
  height: 32px;
  padding: 0 16px;
  font-size: 14px;
}
</style>
