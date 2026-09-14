<template>
  <span class="announcement-i18n-trigger-wrapper" @mousedown.stop @click.stop="$emit('configure')">
    <a-tooltip :title="$t('Announcement.i18n.configure')">
      <AIcon class="announcement-i18n-trigger" type="GlobalOutlined" />
    </a-tooltip>
  </span>
</template>

<script setup lang="ts">
defineEmits<{
  (event: 'configure'): void
}>()
</script>

<style scoped lang="less">
.announcement-i18n-trigger-wrapper {
  display: inline-flex;
}

.announcement-i18n-trigger {
  color: var(--jet-theme-primary);
  cursor: pointer;
}
</style>
