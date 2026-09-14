<template>
  <section class="basis-section">
    <header class="basis-section__header">
      <h2>{{ title }}</h2>
      <slot name="extra" />
    </header>
    <div class="basis-field-list">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<style scoped lang="less">
.basis-section {
  min-width: 0;
  margin-bottom: var(--space-6);
}

.basis-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-3);

  h2 {
    margin: 0;
    color: var(--jet-theme-text-title);
    font-size: var(--fs-16);
    font-weight: 600;
    line-height: var(--lh-snug);
  }
}

.basis-field-list {
  overflow: hidden;
  border: var(--jet-theme-stroke-width) solid var(--jet-theme-border-secondary);
  border-radius: var(--jet-theme-radius-lg);
  background: var(--jet-theme-bg-container);
}
</style>
