<template>
  <ResourceEmpty
    v-if="!items.length || isAllZero"
    icon="EnvironmentOutlined"
    :title="emptyTitle"
    :description="emptyDescription"
    :action-text="t('resourceDashboard.actionAddSpace')"
    @action="handleAddSpace"
  />
  <div v-else class="distribution">
    <div class="donut" :class="{ 'zero-total': total === 0 }">
      <Echarts :option="option" :library="[PieChart]" />
      <div class="total">
        <strong>{{ total.toLocaleString() }}</strong>
        <span>{{ t('resourceDashboard.deviceCount') }}</span>
      </div>
    </div>
    <div class="legend">
      <div v-for="(item, index) in displayed" :key="item.id" class="legend-row">
        <div class="legend-left">
          <i class="legend-dot" :style="{ background: colors[index % colors.length] }" />
          <span class="legend-name" :title="item.name">{{ item.name }}</span>
        </div>
        <span class="legend-value">{{ item.value.toLocaleString() }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PieChart } from 'echarts/charts'
import Echarts from '@jetlinks-web-core/components/Echarts'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { useI18n } from 'vue-i18n'
import type { Datum, DeviceKind } from '../shared'
import ResourceEmpty from './ResourceEmpty.vue'

const props = defineProps<{ items: Datum[]; deviceType: DeviceKind; limit: number }>()
const { t } = useI18n()
const menuStore = useMenuStore()

const colors = ['#1E72F0', '#FF7D00', '#30C7D8', '#7980D4', '#86909C', '#52C41A', '#EB2F96', '#FA8C16']
const total = computed(() => props.items.reduce((sum, item) => sum + item.value, 0))
const isAllZero = computed(() => !props.items.length || total.value === 0)

const emptyTitle = computed(() => t(
  props.items.length ? 'resourceDashboard.noBoundDevicesTitle' : 'resourceDashboard.noSpacesTitle',
))
const emptyDescription = computed(() => t(
  props.items.length ? 'resourceDashboard.noBoundDevicesDesc' : 'resourceDashboard.noSpacesDesc',
))

function handleAddSpace() {
  if (menuStore.getMenu('space/AreaManagement')) {
    menuStore.jumpPage('space/AreaManagement')
  }
}

// 超出数量合并为“其他”，保证图例、圆环和中心总数统计范围一致。
const displayed = computed(() => {
  const items = props.items.slice(0, props.limit)
  if (props.items.length > props.limit) {
    items.push({
      id: '__other',
      name: t('resourceDashboard.other'),
      value: props.items.slice(props.limit).reduce((sum, item) => sum + item.value, 0)
    })
  }
  return items
})

const option = computed(() => ({
  color: colors,
  tooltip: { trigger: 'item', renderMode: 'richText' },
  series: [{
    type: 'pie',
    radius: ['68%', '90%'],
    center: ['50%', '50%'],
    label: { show: false },
    itemStyle: { borderColor: '#fff', borderWidth: 2 },
    stillShowZeroSum: false,
    data: displayed.value.map(item => ({ name: item.name, value: item.value }))
  }]
}))
</script>

<style scoped>
.distribution {
  height: 100%;
  min-height: 0;
  display: flex;
  align-items: center;
  gap: 24px;
}
.donut {
  width: 160px;
  height: 160px;
  position: relative;
  flex-shrink: 0;
}
.zero-total::before {
  content: '';
  position: absolute;
  inset: 4%;
  border: 12px solid var(--ant-color-fill-secondary, #f0f0f0);
  border-radius: 50%;
  pointer-events: none;
}
.total {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.total strong {
  font-size: 24px;
  line-height: 28px;
  font-weight: 500;
  color: #1D2129;
  font-variant-numeric: tabular-nums;
}
.total span {
  color: #86909C;
  font-size: 12px;
  line-height: 16px;
  margin-top: 2px;
}
.legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.legend-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 13px;
  line-height: 18px;
  transition: background 0.15s ease;
}
.legend-row:hover {
  background: #F7F8FA;
}
.legend-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}
.legend-dot {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.legend-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1D2129;
}
.legend-value {
  font-size: 13px;
  font-weight: 500;
  color: #1D2129;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  margin-left: 8px;
}
@container resource-widget (min-width: 580px) {
  .legend {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px 16px;
  }
}
@container resource-widget (max-width: 460px) {
  .distribution {
    gap: 12px;
  }
  .donut {
    width: 120px;
    height: 120px;
  }
}
@container resource-widget (max-width: 340px) {
  .distribution {
    flex-direction: column;
    justify-content: center;
  }
  .legend {
    width: 100%;
    flex: none;
  }
}
</style>
