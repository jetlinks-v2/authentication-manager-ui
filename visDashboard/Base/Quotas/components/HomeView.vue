<template>
  <div class="home-content home-quotas" :class="{ 'home-quotas--list': chart.displayStyle === 'list' }">
    <button v-for="row in rows" :key="row.id" class="home-quota home-surface" :disabled="!canOpen(row.target)" :title="actionHint(row)" @click="$emit('navigate', row.target)">
      <span class="home-quota-title">{{ label(row) }}<span v-if="row.limit && row.limit > 0" :class="{ 'home-warning': percent(row) >= 70, 'home-danger': percent(row) >= 85 }">{{ Math.round(percent(row)) }}%</span></span>
      <span class="home-quota-value"><strong>{{ number(row.value) }}</strong><span class="home-muted"> / {{ row.limit === -1 ? t('packages.ProjectHome.unlimited') : row.limit === null ? '—' : number(row.limit) }} {{ row.unit }}</span></span>
      <span v-if="chart.showProgress && row.limit !== null && row.limit !== undefined && row.limit > 0" class="home-progress"><i :style="{ width: `${percent(row)}%` }" :class="{ 'home-progress--warning': percent(row) >= 70, 'home-progress--danger': percent(row) >= 85 }" /></span>
    </button>
  </div>
</template>
<script setup lang="ts" name="ProjectHomeQuotasView">
import { type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { HomeRow, HomeChart, HomeTarget } from '../../shared/types'
const props = defineProps({
  rows: { type: Array as PropType<HomeRow[]>, default: () => [] },
  chart: { type: Object as PropType<HomeChart>, required: true },
  canOpen: { type: Function as PropType<(target?: HomeTarget) => boolean>, required: true },
})
defineEmits<{ navigate: [target?: HomeTarget] }>()
const { t } = useI18n()
const label = (row: HomeRow) => row.label || t(`packages.ProjectHome.${row.labelKey}`)
const actionHint = (row: HomeRow) => props.canOpen(row.target) ? label(row) : t('packages.ProjectHome.unavailable')
const number = (value?: number) => value === undefined ? '—' : value.toLocaleString()
const percent = (row: HomeRow) => row.limit && row.limit > 0 && row.value !== undefined ? Math.min(100, row.value / row.limit * 100) : 0
</script>
<style scoped lang="less" src="../../shared/views.less" />
