<template>
  <ResourceEmpty
    v-if="!items.length || isAllZero"
    icon="EnvironmentOutlined"
    :title="t('resourceDashboard.noSpacesTitle')"
    :description="t('resourceDashboard.noSpacesDesc')"
    :action-text="t('resourceDashboard.actionAddSpace')"
    @action="handleAddSpace"
  />
  <div v-else class="distribution">
    <div class="donut" :class="{ 'zero-total': total === 0 }"><Echarts :option="option" :library="[PieChart]" /><div class="total"><strong>{{ total.toLocaleString() }}</strong><span>{{ t(`resourceDashboard.${deviceType}`) }}</span></div></div>
    <div class="legend"><div v-for="(item,index) in displayed" :key="item.id" class="legend-row">
      <i :style="{ background: colors[index % colors.length] }" /><span class="area" :title="item.name">{{ item.name }}</span><span class="device-type">{{ t(`resourceDashboard.${deviceType}`) }}</span><b>{{ item.value.toLocaleString() }} {{ t('resourceDashboard.unit') }}</b>
    </div></div>
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
const colors = ['#1677ff','#52c41a','#fa8c16','#722ed1','#13c2c2','#eb2f96','#8c8c8c','#5b8ff9']
const total = computed(() => props.items.reduce((sum,item) => sum + item.value,0))
const isAllZero = computed(() => !props.items.length || total.value === 0)

function handleAddSpace() {
  if (menuStore.getMenu('space/AreaManagement')) {
    menuStore.jumpPage('space/AreaManagement')
  }
}

// 超出数量合并为“其他”，保证图例、圆环和中心总数统计范围一致。
const displayed = computed(() => {
  const items = props.items.slice(0,props.limit)
  if (props.items.length > props.limit) items.push({ id: '__other', name: t('resourceDashboard.other'), value: props.items.slice(props.limit).reduce((sum,item) => sum + item.value,0) })
  return items
})
const option = computed(() => ({ color: colors, tooltip: { trigger: 'item', renderMode: 'richText' },
  series: [{ type: 'pie', radius: ['70%','92%'], center: ['50%','50%'], label: { show: false },
    itemStyle: { borderColor: '#fff', borderWidth: 2 }, stillShowZeroSum: false,
    data: displayed.value.map(item => ({ name: item.name,value: item.value })) }] }))
</script>
<style scoped>
.distribution { height: 100%; min-height: 0; display: flex; align-items: center; gap: 20px; }
.donut { width: 156px; height: 156px; position: relative; flex-shrink: 0; }
.zero-total::before { content: '';position: absolute;inset: 4%;border: 12px solid var(--ant-color-fill-secondary,#f0f0f0);border-radius: 50%;pointer-events: none; }
.total { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; }
.total strong { font-size: 24px; line-height: 28px; font-weight: 400; }.total span { color: #00000073; font-size: 12px; }
.legend { flex: 1; display: grid; grid-template-columns: minmax(0,1fr); gap: 2px; min-width: 0; }
.legend-row { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 7px 10px; border-radius: 8px; font-size: 13px; line-height: 15px; }
.legend-row:hover { background: #f7f8fa; }
i { flex-shrink: 0; width: 9px; height: 9px; border-radius: 3px; }.area { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.device-type { color: #00000073; font-size: 12px; white-space: nowrap; }.legend-row b { font-size: 12px; font-weight: 400; color: #00000073; white-space: nowrap; }
@container resource-widget (min-width: 580px) { .legend { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@container resource-widget (max-width: 500px) { .distribution { gap: 12px; } .donut { width: 110px; height: 110px; } }
@container resource-widget (max-width: 360px) { .distribution { flex-direction: column; justify-content: center; } .legend { width: 100%; flex: none; } }
</style>
