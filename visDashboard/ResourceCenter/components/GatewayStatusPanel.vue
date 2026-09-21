<template>
  <section class="gateway-status" :aria-label="title">
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
          <div class="ranking-list">
            <button v-for="item in rows" :key="item.id" type="button" class="ranking-row"
              :class="{ selected: selectedId === item.id }" :aria-pressed="selectedId === item.id"
              :title="`${item.name} ${item.text}`" @click="selectedId = item.id">
              <span class="rank" :class="`rank-${item.rank}`">{{ item.rank }}</span>
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
            <div class="trend-title">{{ trendTitle }}</div>
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
const { title, metric, tabs, rankingTitle, rows, selectedId, trendTitle, option,
  loading, error, hasHistory, trendLoading, trendError, refresh, refreshTrend } = useGatewayStatus(toRef(props, 'info'), toRef(props, 'isEdit'))
</script>
<style scoped>
.gateway-status { width: 100%; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; padding: 14px 16px 16px; background: var(--ant-color-bg-container, #fff); border: 1px solid #eceff3; border-radius: 6px; color: #1d2129; container: gateway-status / inline-size; }
header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px 12px; margin-bottom: 10px; flex-shrink: 0; }
h3 { margin: 0; font-size: 16px; line-height: 24px; font-weight: 500; }
header :deep(.ant-segmented) { font-size: 12px; background: #f2f3f5; border-radius: 9px; }
header :deep(.ant-segmented-item-label) { min-height: 24px; padding: 1px 11px; line-height: 22px; }
header :deep(.ant-segmented-item-selected) { color: #165dff; border-radius: 7px; }
.state { flex: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }
.state :deep(.resource-empty) { height: auto; }
.gateway-empty { flex: 1; }
.gateway-empty :deep(.empty-icon) { color: #c3c9d2; }
.gateway-empty :deep(.empty-title) { color: #606b7a; font-weight: 400; }
.gateway-empty :deep(.empty-desc) { color: #8693a5; }
.gateway-status > :deep(.ant-alert) { margin-bottom: 10px; }
.panels { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; }
.ranking, .trend { min-width: 0; min-height: 0; border: 1px solid #eee; border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; overflow: hidden; }
.ranking-title { flex-shrink: 0; color: #999; font-size: 12px; line-height: 18px; margin-bottom: 7px; }
.ranking-list { flex: 1; overflow: auto; min-height: 0; }
.ranking-row { display: flex; align-items: center; width: 100%; gap: 8px; min-height: 23px; padding: 1px 7px; background: transparent; border: 1px solid transparent; border-radius: 6px; color: #344054; cursor: pointer; font: inherit; font-size: 12px; line-height: 18px; text-align: left; }
.ranking-row:hover { background: #f5f9ff; }
.ranking-row.selected { color: #1677ff; border-color: #1677ff; background: #f0f7ff; }
.ranking-row:focus-visible { outline: 2px solid #1677ff; outline-offset: -2px; }
.rank { flex: 0 0 18px; height: 18px; line-height: 18px; border-radius: 50%; color: white; background: #c5cad2; text-align: center; }
.rank-1 { background: #ff4d57; } .rank-2 { background: #ffaa00; } .rank-3 { background: #1677ff; }
.name { flex: 0 1 96px; min-width: 48px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.track { flex: 1; min-width: 20px; height: 5px; background: #eff0f2; border-radius: 5px; }
.track > span { display: block; height: 100%; border-radius: inherit; }
.value { flex: 0 0 38px; text-align: right; font-variant-numeric: tabular-nums; }
.trend-title { flex-shrink: 0; font-size: 12px; line-height: 18px; color: #667085; margin: 0 2px 8px; }
.chart { flex: 1; width: 100%; min-height: 0; }
@container gateway-status (max-width: 520px) {
  .gateway-status { padding: 12px; }
  header { margin-bottom: 8px; }
  .panels { grid-template-columns: 1fr; gap: 10px; overflow: auto; }
  .ranking { min-height: 274px; }
  .trend { min-height: 190px; }
  .chart { flex: 1; height: auto; min-height: 150px; }
}
</style>
