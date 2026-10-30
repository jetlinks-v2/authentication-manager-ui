<template>
  <span class="saas-metric-value">
    <strong>{{ formatOverviewNumber(failed ? undefined : value, locale) }}</strong>
    <span v-if="!failed && value !== undefined">{{ unit }}</span>
  </span>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { formatOverviewNumber } from './presentation'

defineProps({
  value: { type: Number, default: undefined },
  unit: { type: String, default: '' },
  failed: { type: Boolean, default: false },
})
const { locale } = useI18n()
</script>

<style scoped>
.saas-metric-value { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px; }
.saas-metric-value strong { color: var(--business-component-text, #1f2329); font-size: 26px; line-height: 32px; font-weight: 600; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.saas-metric-value > span { color: var(--business-component-muted, #646c73); font-size: 12px; line-height: 18px; }
</style>
