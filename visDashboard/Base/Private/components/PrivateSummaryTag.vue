<template>
  <span class="private-summary-tag" :title="item.text">
    <i v-if="item.tone" class="private-summary-tag-dot" :class="`is-${item.tone}`" aria-hidden="true" />{{ item.text }}
  </span>
</template>

<script setup lang="ts">
import type { PrivateSummaryTag } from '../usePrivateSummaryTags'

defineProps<{ item: PrivateSummaryTag }>()
</script>

<style scoped>
.private-summary-tag { display: inline-block; flex: 0 1 auto; min-width: 0; max-width: 100%; overflow: hidden; color: var(--business-component-muted, #646c73); font-size: 12px; line-height: 18px; text-overflow: ellipsis; white-space: nowrap; }
.private-summary-tag-dot { display: inline-block; width: 6px; height: 6px; margin-right: 4px; border-radius: 50%; background: var(--business-component-primary, #1677ff); vertical-align: middle; }
.private-summary-tag-dot.is-high { background: var(--ant-color-error, #f53f3f); }
.private-summary-tag-dot.is-med { background: var(--ant-color-warning, #ff7d00); }
</style>
