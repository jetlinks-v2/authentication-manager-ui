<template>
  <ResourceEmpty
    v-if="!series.length"
    icon="BarChartOutlined"
    :title="t('resourceDashboard.noIotDevices')"
    :description="t('resourceDashboard.noIotDevicesDesc')"
    :action-text="t('resourceDashboard.actionAddIotDevice')"
    @action="handleAddDevice"
  />
  <div v-else class="trend">
    <Echarts :option="option" :library="[BarChart, GridComponent]" />
  </div>
</template>

<script setup lang="ts">
import { theme } from 'ant-design-vue'
import { computed } from 'vue'
import { BarChart } from 'echarts/charts'
import { GridComponent } from 'echarts/components'
import Echarts from '@jetlinks-web-core/components/Echarts'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { useI18n } from 'vue-i18n'
import ResourceEmpty from './ResourceEmpty.vue'

const props = defineProps<{ series: { time: string; value: number }[] }>()
const { t } = useI18n()
const { token } = theme.useToken()
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
    renderMode: 'html', appendTo: 'body',
    backgroundColor: token.value.colorBgSpotlight, borderWidth: 0, borderRadius: token.value.borderRadius,
    textStyle: { color: token.value.colorTextLightSolid, fontSize: token.value.fontSize },
    extraCssText: 'max-width: min(360px, calc(100vw - 32px)); white-space: normal; overflow-wrap: anywhere;'
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
    boundaryGap: true,
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
    type: 'bar',
    barMaxWidth: 24,
    data: props.series.map(item => item.value),
    itemStyle: { color: '#1E72F0', borderRadius: [3, 3, 0, 0] }
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
