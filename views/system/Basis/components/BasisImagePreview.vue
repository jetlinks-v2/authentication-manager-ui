<template>
  <div v-if="src" class="basis-image-preview" :class="`basis-image-preview--${size}`">
    <img :src="src" :alt="alt" />
  </div>
  <span v-else class="basis-field-placeholder">{{ placeholder }}</span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  src?: string
  alt?: string
  placeholder: string
  size?: 'sm' | 'md' | 'lg'
}>(), {
  size: 'sm',
})
</script>

<style scoped lang="less">
.basis-image-preview {
  overflow: hidden;
  border: var(--jet-theme-stroke-width) solid var(--jet-theme-border-secondary);
  border-radius: var(--jet-theme-radius-sm);
  background: var(--jet-theme-bg-layout);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.basis-image-preview--sm {
  width: var(--space-10);
  height: var(--space-10);
}

.basis-image-preview--md {
  width: var(--space-section);
  height: var(--space-section);
}

.basis-image-preview--lg {
  width: min(100%, 21rem);
  height: 12rem;
}

.basis-field-placeholder {
  color: var(--jet-theme-text-disabled);
}
</style>