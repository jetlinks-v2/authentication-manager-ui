<template>
  <section class="gateway-status" :aria-label="title"
    @pointerenter="rotation.onPointerEnter" @pointerleave="rotation.onPointerLeave"
    @focusin="rotation.onFocusIn" @focusout="rotation.onFocusOut">
    <header>
      <h3>{{ title }}</h3>
      <a-segmented v-model:value="metric" :options="tabs" size="small" />
    </header>
    <div v-if="loading" class="state"><a-spin /></div>
    <div v-else-if="error" class="state">
      <ResourceEmpty icon="DisconnectOutlined" :title="t('resourceDashboard.loadError')" />
      <a-button size="small" @click="refresh">{{ t('resourceDashboard.retry') }}</a-button>
    </div>
    <template v-else>
      <ResourceEmpty v-if="!rows.length" class="gateway-empty" icon="DisconnectOutlined"
        :title="t('resourceDashboard.gatewayStatus.empty')" :description="t('resourceDashboard.gatewayStatus.emptyDescription')" />
      <div v-else class="panels">
        <div class="ranking" :aria-label="rankingTitle">
          <div class="ranking-title">{{ rankingTitle }}</div>
          <div ref="rankingList" class="ranking-list">
            <button v-for="item in rows" :key="item.id" type="button" class="ranking-row"
              :class="{ selected: selectedId === item.id }" :aria-pressed="selectedId === item.id"
              :title="`${item.name} ${item.text}`" @click="selectedId = item.id">
              <span class="rank">{{ item.rank }}</span>
              <span class="name">{{ item.name }}</span>
              <span class="track"><span :style="{ width: `${item.width}%`, background: item.color }" /></span>
              <span class="value" :style="{ color: item.color }">{{ item.text }}</span>
            </button>
          </div>
        </div>
        <div class="trend">
          <div v-if="trendLoading" class="state"><a-spin /></div>
          <div v-else-if="trendError" class="state">
            <ResourceEmpty icon="LineChartOutlined" :title="t('resourceDashboard.loadError')" />
            <a-button size="small" @click="refreshTrend">{{ t('resourceDashboard.retry') }}</a-button>
          </div>
          <ResourceEmpty v-else-if="!hasHistory" icon="LineChartOutlined" :title="t('resourceDashboard.gatewayStatus.noHistory')" />
          <template v-else>
            <div class="trend-heading" :aria-label="trendTitle">
              <div class="trend-name" :title="trendSummary.name">{{ trendSummary.name }}</div>
              <div class="trend-description">{{ trendSummary.description }}</div>
            </div>
            <div class="chart"><Echarts :option="option" :library="[LineChart, GridComponent, TooltipComponent]" /></div>
          </template>
        </div>
      </div>
    </template>
  </section>
</template>
<script setup lang="ts">
import { toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import Echarts from '@jetlinks-web-core/components/Echarts'
import ResourceEmpty from './ResourceEmpty.vue'
import { useGatewayStatus } from '../hooks/useGatewayStatus'
import type { ResourceInfo } from '../shared'
const props = defineProps<{ info?: ResourceInfo; isEdit: boolean }>()
const { t } = useI18n()
const { title, metric, tabs, rankingTitle, rows, selectedId, trendTitle, trendSummary, option,
  loading, error, hasHistory, trendLoading, trendError, refresh, refreshTrend, rotation } = useGatewayStatus(toRef(props, 'info'), toRef(props, 'isEdit'))
const { rankingList } = rotation
</script>
<style scoped>
.gateway-status { width: 100%; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; padding: 16px; background: var(--ant-color-bg-container, #fff); border: 1px solid #eceff3; border-radius: 6px; color: #1d2129; container: gateway-status / inline-size; }
header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px 16px; padding-bottom: 8px; flex-shrink: 0; }
h3 { margin: 0; font-size: 16px; line-height: 24px; font-weight: 500; }
header :deep(.ant-segmented) { padding: 3px; font-size: 12px; background: #f5f6f8; border-radius: 6px; }
header :deep(.ant-segmented-item), header :deep(.ant-segmented-thumb) { border-radius: 4px; }
header :deep(.ant-segmented-item-label) { min-height: 26px; padding: 2px 10px; line-height: 22px; }
header :deep(.ant-segmented-item-selected) { color: #1677ff; box-shadow: 0 1px 3px #1d212914; }
.state { flex: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }
.state :deep(.resource-empty) { height: auto; }
.gateway-empty { flex: 1; }
.gateway-empty :deep(.empty-icon) { color: #c3c9d2; }
.gateway-empty :deep(.empty-title) { color: #606b7a; font-weight: 400; }
.gateway-empty :deep(.empty-desc) { color: #8693a5; }
.panels { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(220px, 2fr) minmax(0, 3fr); gap: 20px; padding-top: 8px; }
.ranking, .trend { min-width: 0; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.ranking { padding-right: 20px; border-right: 1px solid #f0f1f3; }
.ranking-title { flex-shrink: 0; color: #86909c; font-size: 12px; line-height: 20px; margin: 0 10px 12px; }
.ranking-list { flex: 1; overflow: auto; min-height: 0; display: flex; flex-direction: column; gap: 6px; padding: 2px; }
.ranking-row { position: relative; display: grid; grid-template-columns: 20px minmax(0, 1fr) auto; grid-template-rows: 22px 4px; align-items: center; column-gap: 8px; row-gap: 8px; width: 100%; min-height: 58px; padding: 10px; background: transparent; border: 0; border-radius: 4px; color: #344054; cursor: pointer; font: inherit; font-size: 13px; line-height: 22px; text-align: left; flex-shrink: 0; transition: background-color .15s; }
.ranking-row:hover { background: #f7f8fa; }
.ranking-row.selected { background: #edf5ff; }
.ranking-row.selected .name { color: #1677ff; font-weight: 500; }
.ranking-row:focus-visible { outline: 2px solid #1677ff; outline-offset: -2px; }
.rank { grid-column: 1; grid-row: 1; color: #86909c; font-size: 12px; font-variant-numeric: tabular-nums; text-align: center; }
.ranking-row.selected .rank { color: #1677ff; }
.name { grid-column: 2; grid-row: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.track { grid-column: 2 / 4; grid-row: 2; height: 4px; background: #edf0f4; border-radius: 2px; overflow: hidden; }
.track > span { display: block; height: 100%; border-radius: inherit; }
.value { grid-column: 3; grid-row: 1; font-size: 13px; font-weight: 500; text-align: right; font-variant-numeric: tabular-nums; }
.trend-heading { flex-shrink: 0; padding: 0 0 16px; }
.trend-name { color: #344054; font-size: 14px; font-weight: 500; line-height: 22px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.trend-description { color: #86909c; font-size: 12px; line-height: 20px; margin-top: 4px; }
.chart { flex: 1; width: 100%; min-height: 0; max-height: 260px; }
@container gateway-status (max-width: 620px) {
  .panels { grid-template-columns: 1fr; gap: 20px; overflow: auto; }
  .ranking { border-right: 0; border-bottom: 1px solid #f0f1f3; padding: 0 0 16px; min-height: 160px; max-height: 228px; }
  .trend { min-height: 240px; overflow: visible; }
  .chart { flex: none; height: 200px; }
}
@media (prefers-reduced-motion: reduce) {
  .ranking-row { transition: none; }
}
</style>
