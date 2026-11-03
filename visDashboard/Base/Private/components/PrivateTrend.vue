<template>
  <PrivatePanel class="private-trend" :title="t(metrics.length > 1 ? 'privateOverview.trend' : `privateOverview.${metric}Trend`)" :state="{ loading, error, empty: !data?.series.length }" @retry="$emit('retry')">
    <template #title-extra>
      <a-radio-group v-if="metrics.length > 1" class="private-trend-metric" :value="metric" @change="$emit('metric', $event.target.value)">
        <a-radio-button v-for="item in metrics" :key="item" :value="item">{{ t(`privateOverview.${item}`) }}</a-radio-button>
      </a-radio-group>
    </template>
    <template #extra>
      <a-segmented class="ranking-switch" size="small" :value="range" :options="rangeOptions" @change="changeRange" />
      <HomeWidgetLink v-if="canOpen(target)" @click="$emit('navigate', target)">{{ t(metric === 'message' ? 'privateOverview.resourceDashboard' : 'privateOverview.events') }}</HomeWidgetLink>
    </template>
    <div v-if="showWeeklySummary && data" class="private-trend-summary">
      <span>{{ t('privateOverview.trendTotal', { range: t('privateOverview.7d'), count: weeklyTotal }) }}</span>
      <span>·</span>
      <span>{{ t('privateOverview.todayAsOf', { time: dayjs(data.updatedAt).format('HH:mm') }) }}</span>
    </div>
    <div v-else-if="!showWeeklySummary" class="private-trend-legend">
      <span v-for="series in data?.series" :key="series.id" class="private-trend-legend-item">
        <i :class="{ yesterday: series.id === 'yesterday' }" />
        <span>{{ t(series.labelKey) }} {{ formatOverviewNumber(series.failed ? undefined : series.total, locale) }} {{ t('privateOverview.items') }}<span v-if="series.id === 'today' && !series.failed" class="private-trend-asof">{{ t('privateOverview.trendAsOf', { time: dayjs(data.updatedAt).format('HH:mm') }) }}</span></span>
      </span>
    </div>
    <div v-if="hasData" class="private-trend-chart"><Echarts :option="option" :library="[LineChart, BarChart, GridComponent, TooltipComponent]" /></div>
    <div v-else class="private-trend-empty">{{ data?.series.some(series => series.failed) ? '—' : t(metric === 'message' ? 'privateOverview.messageEmpty' : 'privateOverview.aiEmpty') }}</div>
  </PrivatePanel>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import { LineChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import type { EChartsOption } from 'echarts'
import Echarts from '@jetlinks-web-core/components/Echarts'
import type { HomeTarget } from '../../shared/types'
import type { PrivateTrend, PrivateTrendMetric, PrivateTrendRange } from '../types'
import { formatOverviewNumber } from '../../Saas/components/presentation'
import PrivatePanel from './PrivatePanel.vue'
import HomeWidgetLink from '../../shared/HomeWidgetLink.vue'

const props = defineProps<{ data?: PrivateTrend; loading: boolean; error: boolean; metric: PrivateTrendMetric; range: PrivateTrendRange; metrics: PrivateTrendMetric[]; option: EChartsOption; target: HomeTarget; canOpen: (target?: HomeTarget) => boolean }>()
const emit = defineEmits<{ retry: []; metric: [metric: PrivateTrendMetric]; range: [range: PrivateTrendRange]; navigate: [target?: HomeTarget] }>()
const { t, locale } = useI18n()
const rangeOptions = computed(() => [
  { label: t('privateOverview.today'), value: 'today' },
  { label: t('privateOverview.7d'), value: '7d' },
])
const showWeeklySummary = computed(() => props.range === '7d')
const weeklyTotal = computed(() => {
  const series = props.data?.series.find(item => item.id === '7d')
  const value = series?.failed ? undefined : series?.total
  return typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat(locale.value, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
    : '—'
})
function changeRange(value: string | number) {
  if (value === 'today' || value === '7d') emit('range', value)
}
const hasData = computed(() => props.data?.series.some(series => !series.failed && series.points.some(point => point.value > 0)))
</script>
<style scoped src="../../../ResourceCenter/components/resourceRanking.css" />
<style scoped lang="less">
/* 保留 Ant 单选的键盘交互，指标切换使用原型的下划线页签。 */
.private-trend :deep(.ant-card-head) { padding: 0 16px; }
.private-trend :deep(.private-panel-heading) { min-height: 48px; gap: 8px 12px; }
.private-trend :deep(.private-trend-metric) { display: inline-flex; align-self: stretch; gap: 20px; }
.private-trend :deep(.private-trend-metric .ant-radio-button-wrapper) {
  position: relative; display: inline-flex; align-items: center; height: 48px; padding: 0 2px;
  border: 0; border-radius: 0; background: transparent; box-shadow: none;
  color: var(--business-component-muted, #646c73); font-size: 14px; line-height: normal;
}
.private-trend :deep(.private-trend-metric .ant-radio-button-wrapper::before) { display: none; }
.private-trend :deep(.private-trend-metric .ant-radio-button-wrapper-checked) { color: var(--business-component-primary, #1677ff); }
.private-trend :deep(.private-trend-metric .ant-radio-button-wrapper-checked::after) {
  position: absolute; right: 0; bottom: 0; left: 0; height: 2px; background: var(--business-component-primary, #1677ff); content: '';
}
.private-trend :deep(.private-trend-metric .ant-radio-button-wrapper:has(input:focus-visible)) { outline: 2px solid var(--business-component-primary, #1677ff); outline-offset: -2px; }
.private-trend :deep(.ant-card-extra) { display: flex; align-items: center; gap: 14px; }
/* 正文经 PrivatePanel 的插槽渲染，从卡片根部限定样式，避免依赖插槽子节点的 scope 标记。 */
.private-trend :deep(.private-trend-legend) { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 24px; color: var(--business-component-muted); font-size: 12px; line-height: 20px; }
.private-trend :deep(.private-trend-summary) { display: flex; align-items: center; flex-wrap: wrap; gap: 0 8px; color: var(--business-component-muted); font-size: 12px; line-height: 20px; }
.private-trend :deep(.private-trend-legend-item) { display: inline-flex; align-items: center; gap: 6px; }
.private-trend :deep(.private-trend-legend i) { flex: none; width: 14px; height: 2px; border-radius: 1px; background: var(--business-component-primary, #1677ff); }
.private-trend :deep(.private-trend-legend i.yesterday) { background: #c9cdd4; }
/* 图表使用正文剩余空间，卡片缩小时允许其收缩，避免滚动条挤压 ECharts 宽度。 */
.private-trend.private-overview-panel :deep(.private-panel-content) { overflow: hidden; }
.private-trend.private-overview-panel :deep(.private-panel-inner > .private-trend-chart),
.private-trend.private-overview-panel :deep(.private-panel-inner > .private-trend-empty) { flex: 1 1 0%; min-width: 0; min-height: 0; margin-top: 8px; overflow: hidden; }
/* 极小卡片的错误内容仍可滚动，加载图标随正文居中。 */
.private-trend.private-overview-panel :deep(.private-panel-inner > .private-panel-state) { flex: 1 1 0%; min-height: 0; overflow: auto; }
.private-trend :deep(.private-trend-empty) { display: grid; place-items: center; font-size: 13px; color: var(--business-component-muted); }
/* 窄卡片把时间筛选移到第二行，避免标题区域截断业务类型按钮。 */
@container (max-width: 479px) {
  .private-trend :deep(.ant-card-head-wrapper) { flex-wrap: wrap; gap: 8px; }
  .private-trend :deep(.ant-card-head-title) { flex: 1 1 100%; overflow: visible; white-space: normal; }
  .private-trend :deep(.ant-card-extra) { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; width: 100%; margin-left: 0; }
}
</style>
