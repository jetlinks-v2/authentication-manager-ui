<template>
  <PrivatePanel class="private-alarms" :title="t('privateOverview.alarms')" :state="state" @retry="$emit('retry')">
    <template #extra>
      <slot name="extra">
        <a-dropdown v-if="data && data.sources.length > 1" :trigger="['click']">
          <a-button type="link" size="small">{{ t('privateOverview.alarmList') }} <RightOutlined /></a-button>
          <template #overlay><a-menu><a-menu-item v-for="source in data.sources" :key="source.id" :disabled="!canOpen(source.target)" @click="$emit('navigate', source.target)">{{ t(`privateOverview.source.${source.id}`) }}</a-menu-item></a-menu></template>
        </a-dropdown>
        <a-button v-else-if="data?.sources[0] && canOpen(data.sources[0].target)" type="link" size="small" @click="$emit('navigate', data.sources[0].target)">{{ t('privateOverview.alarmList') }} <RightOutlined /></a-button>
      </slot>
    </template>
    <template v-if="data">
      <div class="private-alarm-summary">
        <div>
          <span class="private-alarm-label">{{ t('privateOverview.pending') }}</span>
          <span class="private-alarm-number"><strong>{{ formatOverviewNumber(data.pending, locale) }}</strong><span>{{ t('privateOverview.unitRecords') }}</span></span>
          <div class="private-alarm-levels">
            <span v-for="level in data.levels" :key="level.id"><i class="private-alarm-dot" :class="`is-${level.tone}`" />{{ level.label }} {{ formatOverviewNumber(level.value, locale) }}</span>
          </div>
        </div>
        <div>
          <span class="private-alarm-label">{{ t('privateOverview.todayNew') }}</span>
          <span class="private-alarm-number"><strong>{{ formatOverviewNumber(data.today, locale) }}</strong><span>{{ t('privateOverview.unitRecords') }}</span></span>
          <div v-if="data.sources.length > 1" class="private-alarm-source-counts"><span v-for="source in data.sources" :key="source.id">{{ t(`privateOverview.source.${source.id}`) }} {{ formatOverviewNumber(source.today, locale) }}</span></div>
          <div v-else class="private-alarm-source-counts">{{ t('privateOverview.yesterday') }} {{ formatOverviewNumber(data.sources[0]?.yesterday, locale) }} {{ t('privateOverview.unitRecords') }}</div>
        </div>
      </div>
      <div v-if="data.sources.some(source => source.failed || source.levelsFailed)" class="private-alarm-error"><span>{{ t('privateOverview.partialError') }}</span><a-button type="link" size="small" @click="$emit('retry')">{{ t('privateOverview.retry') }}</a-button></div>
      <div class="private-alarm-trend-heading"><span>{{ t('privateOverview.last7Days') }}</span><div v-if="data.sources.length > 1 && hasTrend" class="private-alarm-legend"><span v-for="source in data.sources.filter(source => !source.trendFailed)" :key="source.id"><i :class="`is-${source.id}`" />{{ t(`privateOverview.source.${source.id}`) }}</span></div></div>
      <div v-if="data.sources.some(source => source.trendFailed)" class="private-alarm-error"><span>{{ t('privateOverview.partialError') }}</span><a-button type="link" size="small" @click="$emit('retry')">{{ t('privateOverview.retry') }}</a-button></div>
      <slot v-if="hasTrend" name="trend" />
      <div v-else-if="!data.sources.some(source => source.trendFailed)" class="private-alarm-chart-state">{{ t('privateOverview.noRecentAlarms') }}</div>
      <div class="private-alarm-latest-heading">{{ t('privateOverview.latestPending') }}</div>
      <div v-if="data.sources.some(source => source.latestFailed)" class="private-alarm-error"><span>{{ t('privateOverview.partialError') }}</span><a-button type="link" size="small" @click="$emit('retry')">{{ t('privateOverview.retry') }}</a-button></div>
      <div v-if="data.latest.length" class="private-alarm-list">
        <button v-for="alarm in data.latest" :key="`${alarm.source}:${alarm.id}`" type="button" class="private-alarm-item" :disabled="!canOpen(alarm.target)" @click="$emit('navigate', alarm.target)">
          <span class="private-alarm-line"><i v-if="alarm.level" class="private-alarm-dot" :class="`is-${alarm.tone}`" /><span v-if="alarm.level" class="private-alarm-level">{{ alarm.level }}</span><strong :title="alarm.title">{{ alarm.title }}</strong><time>{{ alarm.time }}</time></span>
          <span class="private-alarm-object" :title="alarm.object">{{ alarm.object ? `${alarm.object} · ` : '' }}{{ t(`privateOverview.source.${alarm.source}`) }}</span>
        </button>
      </div>
      <div v-else-if="!data.sources.some(source => source.latestFailed)" class="private-alarm-list-empty">{{ t('privateOverview.noPendingAlarms') }}</div>
    </template>
  </PrivatePanel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RightOutlined } from '@ant-design/icons-vue'
import PrivatePanel from './PrivatePanel.vue'
import { formatOverviewNumber } from '../../Saas/components/presentation'
import type { HomeTarget } from '../../shared/types'
import type { PrivateAlarms } from '../types'

const props = defineProps<{ data?: PrivateAlarms; state?: { loading?: boolean; error?: boolean; empty?: boolean }; canOpen: (target?: HomeTarget) => boolean }>()
defineEmits<{ navigate: [target?: HomeTarget]; retry: [] }>()
const { t, locale } = useI18n()
const hasTrend = computed(() => props.data?.sources.some(source => source.trend.some(point => point.value > 0)))
</script>

<style scoped lang="less">
.private-alarms { min-height: 0; }
.private-alarm-summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.private-alarm-label { display: block; color: var(--business-component-muted, #646c73); font-size: 13px; line-height: 20px; }
.private-alarm-number { display: flex; align-items: baseline; gap: 4px; margin-top: 4px; }
.private-alarm-number strong { color: var(--business-component-text, #1f2329); font-size: 23px; line-height: 28px; font-weight: 600; font-variant-numeric: tabular-nums; }
.private-alarm-number > span { color: var(--business-component-muted, #646c73); font-size: 12px; }
.private-alarm-levels, .private-alarm-source-counts { display: flex; flex-wrap: wrap; gap: 4px 8px; margin-top: 6px; color: var(--business-component-muted, #646c73); font-size: 12px; line-height: 18px; }
.private-alarm-levels > span { display: inline-flex; align-items: center; gap: 4px; }
.private-alarm-dot { display: inline-block; flex: 0 0 6px; width: 6px; height: 6px; border-radius: 50%; background: var(--business-component-primary, #1677ff); }
.private-alarm-dot.is-high { background: var(--ant-color-error, #f53f3f); }
.private-alarm-dot.is-med { background: var(--ant-color-warning, #ff7d00); }
.private-alarm-trend-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 14px; font-size: 12px; color: var(--business-component-muted, #646c73); }
.private-alarm-legend { display: flex; gap: 10px; }
.private-alarm-legend > span { display: inline-flex; align-items: center; gap: 5px; }
.private-alarm-legend i { width: 8px; height: 8px; border-radius: 2px; background: var(--business-component-primary, #1677ff); }
.private-alarm-legend .is-video { background: var(--ant-color-info-border, #91caff); }
.private-alarm-chart-state { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 92px; font-size: 12px; line-height: 18px; color: var(--business-component-muted, #646c73); }
.private-alarm-latest-heading { border-top: 1px solid var(--line, #f2f3f5); margin-top: 8px; padding-top: 10px; font-size: 12px; line-height: 20px; color: var(--business-component-muted, #646c73); }
.private-alarm-list { display: flex; flex-direction: column; gap: 4px; padding-top: 5px; }
.private-alarm-item { display: flex; flex-direction: column; gap: 3px; min-width: 0; padding: 7px 10px; border: 0; border-radius: var(--r-2, 6px); background: transparent; font: inherit; color: var(--business-component-text, #1f2329); text-align: left; cursor: pointer; }
.private-alarm-item:hover:not(:disabled) { background: var(--home-card-surface, #f7f9fc); }
.private-alarm-item:disabled { cursor: default; }
.private-alarm-item:focus-visible { outline: 2px solid var(--business-component-primary, #1677ff); outline-offset: -2px; }
.private-alarm-line { display: flex; align-items: center; gap: 5px; min-width: 0; }
.private-alarm-level { flex: none; font-size: 12px; color: var(--business-component-muted, #646c73); }
.private-alarm-line strong { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; line-height: 20px; font-weight: 500; }
.private-alarm-line time { flex: none; color: var(--business-component-muted, #8f959e); font-size: 11px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.private-alarm-object { min-width: 0; padding-left: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--business-component-muted, #646c73); font-size: 12px; line-height: 18px; }
.private-alarm-list-empty { display: grid; flex: 1; place-items: center; min-height: 78px; color: var(--business-component-muted, #646c73); font-size: 12px; line-height: 18px; text-align: center; }
.private-alarm-error { display: flex; align-items: center; gap: 6px; padding-top: 5px; font-size: 12px; line-height: 18px; color: var(--business-component-muted, #646c73); }
@container (max-width: 279px) { .private-alarm-line { flex-wrap: wrap; } .private-alarm-line time { margin-left: 11px; } .private-alarm-line strong { flex-basis: calc(100% - 70px); } }
</style>
