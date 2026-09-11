<template>
  <ResourceEmpty
    v-if="!series.length"
    icon="LineChartOutlined"
    :title="t('resourceDashboard.noIotDevices')"
    :description="t('resourceDashboard.noIotDevicesDesc')"
    :action-text="t('resourceDashboard.actionAddIotDevice')"
    @action="handleAddDevice"
  />
  <div v-else class="trend">
    <Echarts :option="option" :library="[LineChart, GridComponent]" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { LineChart } from 'echarts/charts'
import { GridComponent } from 'echarts/components'
import Echarts from '@jetlinks-web-core/components/Echarts'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { useI18n } from 'vue-i18n'
import ResourceEmpty from './ResourceEmpty.vue'

const props = defineProps<{ series: { time: string; value: number }[] }>()
const { t } = useI18n()
const menuStore = useMenuStore()

function handleAddDevice() {
  const target = menuStore.getMenu('iot-user/device/list') ? 'iot-user/device/list' : 'iot-user-device-list'
  if (menuStore.getMenu(target)) {
    menuStore.jumpPage(target, { query: { type: 'device', action: 'create' } })
  }
}

const option = computed(() => ({
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(29, 33, 41, 0.9)',
    borderColor: 'transparent',
    borderRadius: 4,
    textStyle: { color: '#fff', fontSize: 12 },
    renderMode: 'richText'
  },
  grid: {
    top: 46,
    right: 20,
    bottom: 20,
    left: 16,
    containLabel: true
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: props.series.map(item => item.time),
    axisTick: { show: false },
    axisLine: { lineStyle: { color: '#ECEFF3' } },
    axisLabel: {
      color: '#86909C',
      fontSize: 12,
      hideOverlap: true,
      formatter: axisTime
    }
  },
  yAxis: {
    type: 'value',
    name: '消息(次)',
    nameTextStyle: {
      color: '#86909C',
      fontSize: 12,
      padding: [0, 0, 8, 0]
    },
    minInterval: 1,
    axisTick: { show: false },
    axisLine: { show: false },
    axisLabel: {
      show: true,
      color: '#86909C',
      fontSize: 12
    },
    splitLine: {
      lineStyle: {
        type: 'dashed',
        color: '#ECEFF3'
      }
    }
  },
  series: [{
    name: t('resourceDashboard.messages'),
    type: 'line',
    smooth: 0.35,
    symbol: 'none',
    data: props.series.map(item => item.value),
    lineStyle: { color: '#1E72F0', width: 2 },
    itemStyle: { color: '#1E72F0' },
    areaStyle: {
      color: {
        type: 'linear',
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(30, 114, 240, 0.22)' },
          { offset: 1, color: 'rgba(30, 114, 240, 0.01)' }
        ]
      }
    }
  }]
}))

/** 坐标轴精简到时分或月日；原始时间保留在数据和 tooltip 中。 */
function axisTime(value: string) {
  if (value.includes(' ')) return value.slice(11, 16)
  return /^\d{4}-/.test(value) ? value.slice(5) : value
}
</script>

<style scoped>
.trend {
  height: 100%;
  min-height: 0;
}
</style>
