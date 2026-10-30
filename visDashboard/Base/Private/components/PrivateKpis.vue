<template>
  <div class="private-kpis-container">
    <div v-if="loading && !rows.length" class="private-kpis-loading"><a-spin /></div>
    <div v-else class="private-kpis" :style="{ '--kpi-columns': rows.length }">
      <button v-for="row in rows" :key="row.id" class="private-kpi" type="button"
        :disabled="!canOpen(row.target)" @click="$emit('navigate', row.target)">
        <span class="private-kpi-icon"><HomeIcon :name="row.icon" neutral /></span>
        <span class="private-kpi-content">
          <span class="private-kpi-name">{{ t(row.labelKey) }}</span>
          <span class="private-kpi-number"><strong>{{ formatOverviewNumber(row.failed ? undefined : row.value, locale) }}</strong><span v-if="!row.failed && row.value !== undefined">{{ t(row.unitKey) }}</span></span>
          <span v-if="row.failed" class="private-kpi-description">{{ t('privateOverview.metricUnknown') }}</span>
          <span v-else-if="row.yesterday !== undefined" class="private-kpi-description">{{ t('privateOverview.yesterday') }} {{ formatOverviewNumber(row.yesterday, locale) }} {{ t(row.unitKey) }}</span>
          <span v-else-if="row.statuses?.length" class="private-kpi-statuses">
            <span v-for="status in row.statuses" :key="status.labelKey" class="private-kpi-status">
              <a-badge v-if="status.tone" :status="status.tone" />
              {{ status.label || t(status.labelKey) }} {{ formatOverviewNumber(status.value, locale) }}
            </span>
          </span>
        </span>
        <RightOutlined v-if="canOpen(row.target)" class="private-kpi-arrow" />
      </button>
    </div>
    <div v-if="rows.some(row => row.failed)" class="private-kpis-error">
      <span>{{ t('privateOverview.partialError') }}</span><a-button type="link" size="small" @click="$emit('retry')">{{ t('privateOverview.retry') }}</a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RightOutlined } from '@ant-design/icons-vue'
import HomeIcon from '../../shared/HomeIcon.vue'
import { formatOverviewNumber } from '../../Saas/components/presentation'
import type { HomeTarget } from '../../shared/types'
import type { PrivateMetric } from '../types'

defineProps<{ rows: PrivateMetric[]; loading?: boolean; canOpen: (target?: HomeTarget) => boolean }>()
defineEmits<{ navigate: [target?: HomeTarget]; retry: [] }>()
const { t, locale } = useI18n()
</script>

<style scoped lang="less">
.private-kpis-container { min-width: 0; container-type: inline-size; }
.private-kpis { display: grid; grid-template-columns: repeat(var(--kpi-columns, 5), minmax(0, 1fr)); gap: 16px; }
.private-kpi { position: relative; display: flex; align-items: flex-start; gap: 12px; min-width: 0; padding: 16px; border: 1px solid var(--line, #e5e6eb); border-radius: var(--r-3, 8px); background: var(--ant-color-bg-container, #fff); color: var(--business-component-text, #1f2329); font: inherit; text-align: left; cursor: pointer; transition: border-color .2s; }
.private-kpi:hover:not(:disabled) { border-color: var(--business-component-primary, #1677ff); }
.private-kpi:disabled { cursor: default; }
.private-kpi:focus-visible { outline: 2px solid var(--business-component-primary, #1677ff); outline-offset: 2px; }
.private-kpi-icon { flex: 0 0 36px; width: 36px; height: 36px; display: inline-flex; justify-content: center; align-items: center; border-radius: var(--r-2, 6px); background: var(--accent-soft, #e8f3ff); color: var(--business-component-primary, #1677ff); }
.private-kpi-content { min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.private-kpi-name { padding-right: 8px; font-size: 13px; line-height: 20px; color: var(--business-component-muted, #646c73); }
.private-kpi-number { display: flex; align-items: baseline; gap: 4px; flex-wrap: wrap; }
.private-kpi-number strong { font-size: 26px; line-height: 30px; font-weight: 600; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.private-kpi-number > span, .private-kpi-description, .private-kpi-statuses { font-size: 12px; line-height: 18px; color: var(--business-component-muted, #646c73); }
.private-kpi-statuses { display: flex; flex-wrap: wrap; gap: 3px 10px; }
.private-kpi-status { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.private-kpi-arrow { position: absolute; top: 16px; right: 12px; color: var(--ink-4, #c9cdd4); font-size: 10px; }
.private-kpi:hover:not(:disabled) .private-kpi-arrow { color: var(--business-component-primary, #1677ff); }
.private-kpis-loading { display: grid; place-items: center; min-height: 112px; }
.private-kpis-error { display: flex; align-items: center; justify-content: flex-end; gap: 8px; color: var(--business-component-muted, #646c73); font-size: 12px; padding-top: 4px; }
@container (max-width: 1099px) { .private-kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@container (max-width: 699px) { .private-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } .private-kpi { gap: 8px; } }
@container (max-width: 399px) { .private-kpis { grid-template-columns: minmax(0, 1fr); } }
</style>
