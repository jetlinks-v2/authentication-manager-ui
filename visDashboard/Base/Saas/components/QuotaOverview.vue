<template>
  <div class="saas-quota-list">
    <button
      v-for="row in rows"
      :key="row.id"
      type="button"
      class="saas-quota-item"
      :disabled="!canOpen(row.target)"
      @click="$emit('navigate', row.target)"
    >
      <span class="saas-quota-head">
        <span class="saas-quota-name">{{ row.label || t(`packages.ProjectHome.${row.labelKey}`) }}</span>
        <span class="saas-quota-value">
          <strong>{{ formatOverviewNumber(row.failed ? undefined : row.value, locale) }}</strong>
          <span v-if="row.limit === -1">{{ row.unit }} / {{ t('packages.ProjectHome.unlimited') }}</span>
          <span v-else>/ {{ formatOverviewNumber(row.limit, locale) }} {{ row.unit }}</span>
        </span>
      </span>
      <span v-if="quotaPercent(row) !== undefined" class="saas-quota-track">
        <a-progress
          class="saas-quota-progress"
          :percent="quotaProgress(row)"
          :show-info="false"
          :stroke-width="6"
          :status="(quotaPercent(row) || 0) > 100 ? 'exception' : 'normal'"
        />
        <span class="saas-quota-percent">{{ quotaPercent(row) }}%</span>
      </span>
      <span v-else-if="row.failed" class="saas-quota-hint">{{ t('packages.ProjectHome.metricUnknown') }}</span>
      <span v-else-if="row.limit === null || row.limit === undefined" class="saas-quota-hint">{{ t('packages.ProjectHome.quotaUnknown') }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { HomeRow, HomeTarget } from '../../shared/types'
import { formatOverviewNumber, quotaPercent, quotaProgress } from './presentation'

defineProps({
  rows: { type: Array as PropType<HomeRow[]>, default: () => [] },
  canOpen: { type: Function as PropType<(target?: HomeTarget) => boolean>, required: true },
})
defineEmits<{ navigate: [target?: HomeTarget] }>()
const { t, locale } = useI18n()
</script>

<style scoped lang="less">
.saas-quota-list { display: flex; flex-direction: column; min-width: 0; gap: 8px; }
.saas-quota-item {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 4px;
  width: 100%;
  padding: 4px 0;
  border: 0;
  border-radius: var(--r-1, 4px);
  background: transparent;
  color: var(--business-component-text, #1f2329);
  font: inherit;
  text-align: left;
  cursor: pointer;
  &:hover:not(:disabled) .saas-quota-name { color: var(--business-component-primary, #1677ff); }
  &:focus-visible { outline: 2px solid var(--business-component-primary, #1677ff); outline-offset: 3px; }
  &:disabled { cursor: default; }
}
.saas-quota-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 4px 8px; width: 100%; font-size: 13px; line-height: 20px; }
.saas-quota-name { flex: 1 1 90px; min-width: 0; overflow-wrap: anywhere; }
.saas-quota-percent { flex-shrink: 0; color: var(--business-component-muted, #646c73); font-size: 12px; line-height: 14px; }
.saas-quota-value { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: flex-end; gap: 4px; margin-left: auto; color: var(--business-component-muted, #646c73); font-size: 12px; line-height: 18px; }
.saas-quota-value strong { color: var(--business-component-text, #1f2329); font-size: 14px; font-weight: 500; font-variant-numeric: tabular-nums; }
.saas-quota-track { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 14px; }
.saas-quota-progress { flex: 1; min-width: 0; margin: 0; line-height: 1; }
.saas-quota-hint { color: var(--business-component-muted, #646c73); font-size: 12px; line-height: 18px; }
</style>
