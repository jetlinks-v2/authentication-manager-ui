<template>
  <div class="home-content home-quotas" :class="{ 'home-quotas--list': chart.displayStyle === 'list' }">
    <div class="quota-summary">
      <span>{{ t('packages.ProjectHome.quotaScope') }}</span>
      <strong v-if="warningCount > 0">{{ t('packages.ProjectHome.quotaAttention') }} {{ warningCount }}</strong>
    </div>
    <button v-for="row in rows" :key="row.id" class="home-quota home-surface" :disabled="!canOpen(row.target)" :title="actionHint(row)" @click="$emit('navigate', row.target)">
      <span class="home-quota-title"><span class="quota-name">{{ label(row) }}</span><span v-if="row.limit && row.limit > 0" class="quota-percent" :class="{ 'home-warning': percent(row) >= 70, 'home-danger': percent(row) >= 85 }">{{ Math.round(percent(row)) }}%</span></span>
      <span v-if="row.description" class="quota-description">{{ row.description }}</span>
      <span class="home-quota-value"><strong>{{ number(row.value) }}</strong><span class="home-muted"> {{ row.unit || '' }}<template v-if="row.limit !== null && row.limit !== undefined"> / {{ total(row) }}</template></span></span>
      <span class="quota-remaining">{{ remainingText(row) }}</span>
      <span v-if="chart.showProgress && row.limit !== null && row.limit !== undefined && row.limit > 0" class="home-progress"><i :style="{ width: `${percent(row)}%` }" :class="{ 'home-progress--warning': percent(row) >= 70, 'home-progress--danger': percent(row) >= 85 }" /></span>
    </button>
  </div>
</template>
<script setup lang="ts" name="ProjectHomeQuotasView">
import { computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { HomeRow, HomeChart, HomeTarget } from '../../shared/types'
const props = defineProps({
  rows: { type: Array as PropType<HomeRow[]>, default: () => [] },
  chart: { type: Object as PropType<HomeChart>, required: true },
  canOpen: { type: Function as PropType<(target?: HomeTarget) => boolean>, required: true },
})
defineEmits<{ navigate: [target?: HomeTarget] }>()
const { t } = useI18n()
const label = (row: HomeRow) => {
  if (row.label) {
    const parts = row.label.split(' · ')
    return parts[parts.length - 1] || row.label
  }
  return t(`packages.ProjectHome.${row.labelKey}`)
}
const actionHint = (row: HomeRow) => props.canOpen(row.target) ? label(row) : t('packages.ProjectHome.unavailable')
const number = (value?: number) => value === undefined ? '—' : value.toLocaleString()
const percent = (row: HomeRow) => row.limit && row.limit > 0 && row.value !== undefined ? Math.min(100, row.value / row.limit * 100) : 0
const total = (row: HomeRow) => row.limit === -1 ? t('packages.ProjectHome.unlimited') : `${number(row.limit || 0)} ${row.unit || ''}`.trim()
const remainingText = (row: HomeRow) => {
  if (row.limit === null || row.limit === undefined) return t('packages.ProjectHome.quotaUnknown')
  if (row.limit === -1) return t('packages.ProjectHome.unlimited')
  const remaining = Math.max(0, row.limit - (row.value || 0))
  return remaining === 0
    ? t('packages.ProjectHome.quotaFull')
    : t('packages.ProjectHome.quotaRemainingLabel', { value: number(remaining), unit: row.unit || '' })
}
const warningCount = computed(() => props.rows.filter(row => percent(row) >= 70).length)
</script>
<style scoped lang="less" src="../../shared/views.less" />
<style scoped lang="less">
.home-quotas { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; align-content: start; }
.quota-summary { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px; border-radius: 6px; background: #f5f8fd; color: #8a94a6; font-size: 11px; }
.quota-summary strong { flex-shrink: 0; color: #d46b08; font-size: 12px; }
.home-quota { min-width: 0; padding: 10px 12px; border: 1px solid #edf1f7; border-radius: 6px; text-align: left; }
.home-quota-title, .home-quota-value { display: flex; min-width: 0; align-items: center; justify-content: space-between; gap: 8px; }
.quota-name { overflow: hidden; color: #1d2739; font-size: 13px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.quota-description { overflow: hidden; color: #8a94a6; font-size: 11px; line-height: 16px; text-overflow: ellipsis; white-space: nowrap; }
.quota-percent { color: #389e0d; font-size: 12px; font-weight: 600; }
.home-quota-value { justify-content: flex-start; margin-top: 6px; }
.home-quota-value strong { color: #1d2739; font-size: 16px; }
.home-muted { overflow: hidden; color: #8a94a6; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.quota-remaining { color: #6b7280; font-size: 11px; line-height: 16px; }
.home-progress { display: block; height: 4px; margin-top: 8px; border-radius: 4px; background: #e8eef7; overflow: hidden; }
.home-progress i { display: block; height: 100%; border-radius: inherit; background: #4b8df8; }
.home-progress--warning { background: #faad14 !important; }
.home-progress--danger { background: #ff4d4f !important; }
@media (max-width: 520px) { .home-quotas { grid-template-columns: 1fr; } }
</style>
