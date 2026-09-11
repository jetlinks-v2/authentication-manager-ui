<template>
  <ResourceEmpty
    v-if="!series.length || isAllZero"
    icon="PlayCircleOutlined"
    :title="t('resourceDashboard.noVideoDevices')"
    :description="t('resourceDashboard.noVideoDevicesPlaybackDesc')"
    :action-text="t('resourceDashboard.actionAddVideoDevice')"
    @action="handleAddVideoDevice"
  />
  <div v-else class="video-trend"><Echarts :option="option" :library="[BarChart, GridComponent]" /></div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { BarChart } from 'echarts/charts'
import { GridComponent } from 'echarts/components'
import Echarts from '@jetlinks-web-core/components/Echarts'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { useI18n } from 'vue-i18n'
import ResourceEmpty from './ResourceEmpty.vue'

const props = defineProps<{ series: { time: string; value: number }[] }>()
const { t } = useI18n()
const menuStore = useMenuStore()

const isAllZero = computed(() => !props.series.length || props.series.every(item => item.value === 0))

function handleAddVideoDevice() {
  const target = menuStore.getMenu('media/Device') ? 'media/Device' : 'media/Device/Save'
  if (menuStore.getMenu(target)) {
    menuStore.jumpPage(target, { query: { type: 'video', action: 'create' } })
  }
}

const option = computed(() => ({
  tooltip: {
    trigger: 'axis',
    renderMode: 'richText',
    axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(0, 0, 0, 0.04)' } },
  },
  grid: { top: 20, right: 14, bottom: 20, left: 12, containLabel: true },
  xAxis: {
    type: 'category',
    data: props.series.map(item => item.time),
    axisTick: { show: false },
    axisLine: { show: false },
    axisLabel: {
      color: '#8c8c8c',
      fontSize: 10,
      hideOverlap: true,
      formatter: axisTime,
    },
  },
  yAxis: {
    type: 'value',
    minInterval: 1,
    splitLine: { lineStyle: { type: 'dashed', color: '#eef0f3' } },
    axisLabel: { show: false },
  },
  series: [
    {
      name: t('resourceDashboard.playbacks'),
      type: 'bar',
      barMaxWidth: 16,
      itemStyle: {
        color: '#2b77ff',
        borderRadius: [3, 3, 0, 0],
      },
      data: props.series.map(item => item.value),
    },
  ],
}))

function axisTime(value: string) {
  if (value.includes(' ')) return value.slice(11, 16)
  return /^\d{4}-/.test(value) ? value.slice(5) : value
}
</script>
<style scoped>
.video-trend {
  height: 100%;
  min-height: 0;
}
</style>
