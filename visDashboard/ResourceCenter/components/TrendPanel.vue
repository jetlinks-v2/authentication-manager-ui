<template>
  <a-empty v-if="!series.length" :description="t('resourceDashboard.noMessages')" />
  <div v-else class="trend"><Echarts :option="option" :library="[LineChart,GridComponent]" /></div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { LineChart } from 'echarts/charts'
import { GridComponent } from 'echarts/components'
import Echarts from '@jetlinks-web-core/components/Echarts'
import { useI18n } from 'vue-i18n'
const props = defineProps<{ series: { time: string; value: number }[] }>()
const { t } = useI18n()
const option = computed(() => ({ tooltip: { trigger: 'axis', renderMode: 'richText' }, grid: { top: 20,right: 14,bottom: 20,left: 12,containLabel: true },
  xAxis: { type: 'category', boundaryGap: false, data: props.series.map(item => item.time), axisTick: { show: false },axisLine: { show: false },axisLabel: { color: '#8c8c8c', fontSize: 10,hideOverlap: true,formatter: axisTime } },
  yAxis: { type: 'value',minInterval: 1,splitLine: { lineStyle: { type: 'dashed',color: '#eef0f3' } },axisLabel: { show: false } },
  series: [{ name: t('resourceDashboard.messages'),type: 'line',smooth: true,symbol: 'none',data: props.series.map(item => item.value),lineStyle: { color: '#4278ed',width: 2 },itemStyle: { color: '#4278ed' },areaStyle: { color: '#edf3ff' } }] }))
/** 坐标轴精简到时分或月日；原始时间保留在数据和 tooltip 中。 */
function axisTime(value: string) {
  if (value.includes(' ')) return value.slice(11,16)
  return /^\d{4}-/.test(value) ? value.slice(5) : value
}
</script>
<style scoped>.trend { height: 100%; min-height: 230px; }</style>
