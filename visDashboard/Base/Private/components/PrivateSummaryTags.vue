<template>
  <div ref="host" class="private-summary-tags">
    <PrivateSummaryTag v-for="item in visibleItems" :key="item.id" :item="item" />
    <a-popover v-if="hiddenCount" :trigger="['hover', 'focus']" placement="bottomLeft">
      <template #content>
        <div class="private-summary-popover">
          <PrivateSummaryTag v-for="item in hiddenItems" :key="item.id" :item="item" />
        </div>
      </template>
      <button type="button" class="private-summary-more" :aria-label="accessibleLabel">+{{ hiddenCount }}</button>
    </a-popover>
    <span class="private-summary-measure-clip" aria-hidden="true">
      <span ref="measurement" class="private-summary-measure">
        <PrivateSummaryTag v-for="item in items.slice(0, 2)" :key="item.id" :item="item" data-measure-tag />
        <span class="private-summary-more" data-measure-more>+{{ Math.max(items.length - 2, 0) }}</span>
      </span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import PrivateSummaryTag from './PrivateSummaryTag.vue'
import { useVisiblePrivateSummaryTags, type PrivateSummaryTag as SummaryTag } from '../usePrivateSummaryTags'

const props = defineProps<{ items: SummaryTag[] }>()
const { host, measurement, visibleItems, hiddenItems, hiddenCount, accessibleLabel } = useVisiblePrivateSummaryTags(toRef(props, 'items'))
</script>

<style scoped>
.private-summary-tags { position: relative; display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 12px; line-height: 18px; }
.private-summary-more { flex: none; padding: 0; border: 0; background: transparent; color: var(--business-component-muted, #646c73); font: inherit; line-height: inherit; white-space: nowrap; cursor: pointer; }
button.private-summary-more:hover { color: var(--business-component-primary, #1677ff); }
button.private-summary-more:focus-visible { outline: 2px solid var(--business-component-primary, #1677ff); outline-offset: 2px; }
.private-summary-popover { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; max-width: min(360px, 75vw); }
.private-summary-popover :deep(.private-summary-tag) { overflow: visible; text-overflow: clip; white-space: normal; overflow-wrap: anywhere; }
.private-summary-measure-clip { position: absolute; width: 0; height: 0; overflow: hidden; visibility: hidden; pointer-events: none; }
.private-summary-measure { display: flex; gap: 8px; width: max-content; }
.private-summary-measure :deep(.private-summary-tag) { flex: none; }
</style>
