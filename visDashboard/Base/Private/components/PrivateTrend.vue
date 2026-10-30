<template>
  <PrivatePanel :title="t(metrics.length > 1 ? 'privateOverview.trend' : `privateOverview.${metric}Trend`)" :state="{ loading, error, empty: !data?.series.length }" @retry="$emit('retry')">
    <template #title-extra>
      <a-radio-group v-if="metrics.length > 1" :value="metric" size="small" @change="$emit('metric', $event.target.value)">
        <a-radio-button v-for="item in metrics" :key="item" :value="item">{{ t(`privateOverview.${item}`) }}</a-radio-button>
      </a-radio-group>
    </template>
    <template #extra>
      <a-radio-group :value="range" size="small" @change="$emit('range', $event.target.value)">
        <a-radio-button value="today">{{ t('privateOverview.today') }}</a-radio-button>
        <a-radio-button value="7d">{{ t('privateOverview.7d') }}</a-radio-button>
      </a-radio-group>
      <a-button v-if="canOpen(target)" type="link" size="small" @click="$emit('navigate', target)">{{ t(metric === 'message' ? 'privateOverview.resourceDashboard' : 'privateOverview.events') }} ›</a-button>
    </template>
    <div class="private-trend-legend">
      <span v-for="(series, index) in data?.series" :key="series.id"><i :class="{ yesterday: index > 0 }" />{{ t(series.labelKey) }} {{ series.failed ? '—' : series.total?.toLocaleString() }} {{ t('privateOverview.items') }}</span>
      <span v-if="data" class="private-trend-time">{{ t('privateOverview.until', { time: dayjs(data.updatedAt).format('HH:mm') }) }}</span>
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
import PrivatePanel from './PrivatePanel.vue'

const props = defineProps<{ data?: PrivateTrend; loading: boolean; error: boolean; metric: PrivateTrendMetric; range: PrivateTrendRange; metrics: PrivateTrendMetric[]; option: EChartsOption; target: HomeTarget; canOpen: (target?: HomeTarget) => boolean }>()
defineEmits<{ retry: []; metric: [metric: PrivateTrendMetric]; range: [range: PrivateTrendRange]; navigate: [target?: HomeTarget] }>()
const { t } = useI18n()
const hasData = computed(() => props.data?.series.some(series => !series.failed && series.points.some(point => point.value > 0)))
</script>
<style scoped lang="less">
.private-trend-legend { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 16px; color: var(--business-component-muted); font-size: 12px; }
.private-trend-legend > span { display: inline-flex; align-items: center; gap: 6px; }
.private-trend-legend i { width: 14px; height: 2px; background: var(--business-component-primary, #1677ff); }
.private-trend-legend i.yesterday { background: #c9cdd4; }
.private-trend-time { margin-left: auto; }
.private-trend-chart, .private-trend-empty { height: 148px; margin-top: 8px; }
.private-trend-empty { display: grid; place-items: center; font-size: 13px; color: var(--business-component-muted); }
</style>
