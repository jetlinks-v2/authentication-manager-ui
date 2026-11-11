<template>
  <div class="resource-distribution-bars">
    <div v-for="row in rows" :key="row.id" class="resource-distribution-bar">
      <span class="resource-distribution-bar__name" :title="row.name">{{ row.name }}</span>
      <span v-if="row.failed" class="resource-distribution-bar__unknown" aria-hidden="true" />
      <a-progress v-else :percent="row.barPercent" :stroke-color="row.color" :show-info="false" :stroke-width="7" />
      <span class="resource-distribution-bar__count">{{ row.valueText }}</span>
      <span class="resource-distribution-bar__percent">{{ row.percentText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ResourceDistributionBar } from '../resourceSupplemental.types'

defineProps<{ rows: readonly ResourceDistributionBar[] }>()
</script>

<style scoped>
.resource-distribution-bars { min-height: 0; overflow: auto; display: grid; grid-template-columns: minmax(0, 92px) minmax(24px, 1fr) minmax(64px, max-content) minmax(48px, max-content); grid-auto-rows: minmax(24px, auto); align-items: center; gap: 11px 10px; font-size: 12.5px; }
.resource-distribution-bar { display: contents; }
.resource-distribution-bar :deep(.ant-progress) { min-width: 0; line-height: 1; }
.resource-distribution-bar__name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.resource-distribution-bar__unknown { height: 7px; border-radius: 7px; background: var(--ant-color-fill-tertiary, #f0f0f0); }
.resource-distribution-bar__count, .resource-distribution-bar__percent { white-space: nowrap; text-align: right; font-variant-numeric: tabular-nums; }
.resource-distribution-bar__percent { color: var(--ant-color-text-secondary, #8c8c8c); font-size: 12px; }
@container supplemental (max-width: 300px) {
  .resource-distribution-bars { grid-template-columns: minmax(0, 68px) minmax(24px, 1fr) minmax(64px, max-content) minmax(48px, max-content); column-gap: 6px; }
}
@container supplemental (max-width: 200px) {
  .resource-distribution-bars { grid-template-columns: minmax(0, 1fr) max-content; gap: 2px 6px; }
  .resource-distribution-bar__name, .resource-distribution-bar :deep(.ant-progress),
  .resource-distribution-bar__unknown { grid-column: 1 / -1; }
  .resource-distribution-bar__count { font-size: 11px; }
}
</style>
