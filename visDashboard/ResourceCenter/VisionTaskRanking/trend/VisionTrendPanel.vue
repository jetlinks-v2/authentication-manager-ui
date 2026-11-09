<template>
  <section class="vision-trend" :aria-label="title">
    <header>
      <div class="vision-trend__title"><h3>{{ title }}</h3><a-tooltip :title="t('VisionTrend.help')"><InfoCircleOutlined /></a-tooltip>
        <a-tooltip v-if="state.error" :title="t(`VisionTrend.errors.${state.error}`)"><span role="status">!</span></a-tooltip>
      </div>
      <div class="vision-trend__filters">
        <a-select v-if="!gateways[0]?.local" :value="gatewayId || undefined" :options="gatewayOptions" :placeholder="t('VisionTrend.gateway')"
          :aria-label="t('VisionTrend.gateway')" size="small" show-search option-filter-prop="label" @change="value => emit('gateway', String(value))" />
        <a-select :value="taskId || undefined" :options="tasks" :placeholder="t('VisionTrend.task')" :aria-label="t('VisionTrend.task')" size="small" show-search
          :disabled="!tasks.length" option-filter-prop="label" @change="value => emit('task', String(value))" />
        <a-select :value="metric" :options="metricOptions" :aria-label="t('VisionTrend.metric')" size="small" @change="value => emit('metric', value as VisionTrendMetric)" />
      </div>
    </header>
    <div class="vision-trend__plot" :aria-busy="state.loading">
      <!-- 指标的单位和系列数不同，切换时重建图表，避免合并残留上一指标的 P95。 -->
      <JEcharts v-if="hasData" :key="metric" :option="option" />
      <a-skeleton v-else-if="state.loading" active :paragraph="{ rows: 3 }" />
      <CloudEmpty v-else :description="emptyText" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { InfoCircleOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import type { EChartsOption, LineSeriesOption } from 'echarts'
import { REALTIME_WINDOW_MS, realtimeWindowBounds } from '../../monitoring/window'
import type { RuntimeState } from '../../monitoring/state'
dayjs.extend(utc)
dayjs.extend(timezone)
const formatRuntimeTime = (time: number) => dayjs(time).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss')
import { VISION_TREND_METRICS, type VisionTrendGateway, type VisionTrendMetric, type VisionTrendPoint } from './types'

const props = defineProps<{
  title: string; gateways: VisionTrendGateway[]; gatewayId: string; taskId: string
  tasks: { value: string; label: string }[]; state: RuntimeState<VisionTrendPoint[]>; metric: VisionTrendMetric
}>()
const emit = defineEmits<{ gateway: [id: string]; task: [id: string]; metric: [value: VisionTrendMetric] }>()
const { t } = useI18n()
const gatewayOptions = computed(() => props.gateways.map(item => ({ value: item.id, label: `${item.name}${item.online ? '' : ` (${t('VisionTrend.offline')})`}` })))
const metricOptions = computed(() => VISION_TREND_METRICS.map(value => ({ value, label: t(`VisionTrend.${value}`) })))
const visiblePoints = computed(() => {
  const points = props.state.data ?? [], end = props.state.updatedAt ?? points.at(-1)?.time
  return end === undefined ? [] : points.filter(point => point.time >= end - REALTIME_WINDOW_MS && point.time <= end)
})
const hasData = computed(() => visiblePoints.value.some(point => props.metric === 'latency'
  ? point.average !== null || point.p95 !== null : point[props.metric] !== null))
const emptyText = computed(() => props.state.error ? t(`VisionTrend.errors.${props.state.error}`)
  : !props.gateways.length ? t('VisionTrend.noGateway') : !props.tasks.length ? t('VisionTrend.noTasks')
    : t(props.metric === 'pending' ? 'VisionTrend.noReviewSamples' : 'VisionTrend.noSamples'))
// 多来源时每个点的第二条线都是来源 P95 的最大值，不能将其标成总体 P95。
const p95Name = computed(() => t(visiblePoints.value.some(point => point.sources > 1) ? 'VisionTrend.maximumP95' : 'VisionTrend.p95'))
const option = computed<EChartsOption>(() => {
  const points = visiblePoints.value
  const unit = props.metric === 'latency' ? 'ms' : t(props.metric === 'success' ? 'VisionTrend.times' : 'VisionTrend.items')
  const chart: { series: { key: string; unit: string; points: [number, number | null][] }[] } = { series: props.metric === 'latency' ? [
    { key: 'average', unit: 'ms', points: points.map(point => [point.time, point.average]) },
    { key: 'p95', unit: 'ms', points: points.map(point => [point.time, point.p95]) },
  ] : [{ key: props.metric, unit, points: points.map(point => [point.time, point[props.metric as 'success' | 'pending']]) }] }
  const names: Record<string, string> = { average: t('VisionTrend.average'), p95: p95Name.value,
    success: t('VisionTrend.success'), pending: t('VisionTrend.pending') }
  const end = props.state.updatedAt ?? points.at(-1)?.time
  const start = points[0]?.time
  return { animation: false, color: ['#238bff', '#faad14'],
    tooltip: { trigger: 'axis', renderMode: 'richText', backgroundColor: 'rgba(255,255,255,.96)', borderColor: '#edf0f5',
      textStyle: { color: '#252b36', fontSize: 12 }, axisPointer: { type: 'line' }, formatter: value => {
        const rows = Array.isArray(value) ? value : [value], first = rows[0]?.value
        return [Array.isArray(first) ? formatRuntimeTime(Number(first[0])) : '', ...rows.map(row => {
          const point = Array.isArray(row.value) ? row.value[1] : null
          return `${row.seriesName}: ${typeof point === 'number' ? point.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}`
        })].join('\n')
      } },
    legend: { show: true, top: 0, left: 0, selectedMode: false, itemWidth: 14, itemHeight: 3, icon: 'rect',
      textStyle: { color: '#697586', fontSize: 11 } },
    grid: { left: 4, right: 8, top: 40, bottom: 4, containLabel: true },
    xAxis: { type: 'time', ...realtimeWindowBounds(start, end), splitNumber: 5,
      axisLabel: { hideOverlap: true, fontSize: 11, formatter: (time: number) => formatRuntimeTime(time).slice(11), color: '#929cab' },
      axisLine: { lineStyle: { color: '#dfe4eb' } }, axisTick: { show: false } },
    yAxis: { type: 'value', name: unit, nameGap: 8, min: 0, ...(props.metric === 'latency' ? {} : { minInterval: 1 }),
      axisLabel: { color: '#929cab', fontSize: 11 }, splitLine: { lineStyle: { color: '#e8edf4' } } },
    series: chart.series.map<LineSeriesOption>(series => ({ name: names[series.key], type: 'line', connectNulls: false,
      // 断点两侧的孤立有效采样也要可见，否则零值曲线会看起来像完全没有数据。
      showSymbol: true,
      symbol: (_value: unknown, params: { dataIndex: number }) => series.points[params.dataIndex]?.[1] === 0 ? 'rect' : 'circle',
      symbolSize: (_value: unknown, params: { dataIndex: number }) => series.points[params.dataIndex]?.[1] === 0 ? [10, 2]
        : series.points[params.dataIndex - 1]?.[1] == null && series.points[params.dataIndex + 1]?.[1] == null ? 5 : 0,
      smooth: false, data: series.points, lineStyle: { width: 1.5 } })),
  }
})
</script>

<style scoped>
.vision-trend { display: flex; flex-direction: column; gap: var(--space-2, 8px); width: 100%; height: 100%; min-width: 0; min-height: 0; box-sizing: border-box; padding: var(--space-4, 16px); border: 1px solid var(--jet-theme-border-secondary, #e8edf3); border-radius: var(--r-3, 8px); background: var(--ant-color-bg-container, #fff); }
header, .vision-trend__title, .vision-trend__filters { display: flex; align-items: center; gap: var(--space-2, 8px); }
header { flex-wrap: wrap; justify-content: space-between; }
h3 { margin: 0; font-size: 15px; line-height: 24px; font-weight: 600; color: var(--ant-color-text, #17243b); }
.vision-trend__title { color: var(--ant-color-text-secondary, #697586); }
.vision-trend__filters { flex-wrap: wrap; min-width: 0; max-width: 100%; }
.vision-trend__filters :deep(.ant-select) { width: 140px; }
.vision-trend__filters :deep(.ant-select:last-child) { width: 148px; }
.vision-trend__plot { position: relative; flex: 1; min-width: 0; min-height: 0; display: grid; place-items: center; overflow: hidden; }
.vision-trend__plot > :deep(.echarts-warp) { position: absolute; inset: 0; width: 100%; height: 100%; }
.vision-trend__plot > :deep(.ant-skeleton) { width: 100%; }
@media (max-width: 760px) { .vision-trend__filters { width: 100%; }.vision-trend__filters :deep(.ant-select) { flex: 1 1 104px; } }
</style>
