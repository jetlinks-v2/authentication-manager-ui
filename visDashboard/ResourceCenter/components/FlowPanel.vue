<template>
  <ResourceEmpty
    v-if="isFlowEmpty"
    icon="WifiOutlined"
    :title="t('resourceDashboard.noNetworkCardsTitle')"
    :description="t('resourceDashboard.noNetworkCardsDesc')"
    :action-text="t('resourceDashboard.actionAddNetworkCard')"
    @action="handleAddNetworkCard"
  />
  <div v-else class="flow-panel">
  <div class="flow-metrics"><div v-for="item in data.metrics" :key="item.key" :class="{ primary: item.key === 'month' }"><span>{{ t(`resourceDashboard.${item.key}`) }}</span><strong>{{ item.failed ? '—' : formatFlow(item.value).value }} <small v-if="!item.failed">{{ formatFlow(item.value).unit }}</small></strong></div></div>
  <h4 :title="t('resourceDashboard.thisMonth')">{{ t('resourceDashboard.ranking') }}</h4>
  <a-empty v-if="data.rankingFailed || !data.ranking.length" :description="t(data.rankingFailed ? 'resourceDashboard.loadError' : 'resourceDashboard.noFlow')" />
  <ol v-else>
    <li v-for="(item,index) in data.ranking.slice(0,limit)" :key="item.id">
      <span class="rank" :class="`rank-${index + 1}`">{{ index + 1 }}</span>
      <div class="rank-body">
        <div class="rank-line"><span class="card" :title="item.name">{{ item.name }}</span><span>{{ formatFlow(item.value).value }} <small>{{ formatFlow(item.value).unit }}</small></span></div>
        <a-progress :percent="maximum > 0 ? item.value / maximum * 100 : 0" :show-info="false" :stroke-width="5" stroke-color="#1677ff" trail-color="#f0f1f3" />
      </div>
    </li>
  </ol>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import type { ResourceData } from '../shared'
import ResourceEmpty from './ResourceEmpty.vue'

const props = defineProps<{ data: ResourceData; limit: number }>()
const { t } = useI18n()
const menuStore = useMenuStore()

const isFlowEmpty = computed(() => {
  const noRanking = !props.data.ranking?.length
  const noMetrics = !props.data.metrics?.length || props.data.metrics.every(m => !m.value || m.failed)
  return noRanking && noMetrics
})

function handleAddNetworkCard() {
  if (menuStore.getMenu('iot-card/CardManagement')) {
    menuStore.jumpPage('iot-card/CardManagement')
  }
}

// 排行条以当前返回集合的最大用量为基准，零用量保持空轨道。
const maximum = computed(() => Math.max(0,...props.data.ranking.map(item => item.value)))
/** 物联卡后端返回 MB，仅展示时转换单位，统计排序继续使用原始值。 */
function formatFlow(mb = 0) {
  const scale = mb >= 1024 * 1024 ? 1024 * 1024 : mb >= 1024 ? 1024 : 1
  return { value: (mb / scale).toLocaleString(undefined,{ maximumFractionDigits: 2 }),unit: scale === 1 ? 'MB' : scale === 1024 ? 'GB' : 'TB' }
}
</script>
<style scoped>
.flow-panel { display: flex;flex-direction: column;gap: 10px;height: 100%;min-height: 0; }
.flow-metrics { display: grid; gap: 8px; flex-shrink: 0; }
.flow-metrics > div { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 14px; background: #f7f8fa; border-radius: 10px; }
.flow-metrics span { color: #00000073;font-size: 12px;line-height: 13.8px; }
strong { color: #4b5563;font-size: 16px;font-weight: 400;line-height: 18.4px;font-variant-numeric: tabular-nums; }
.primary strong { color: #1677ff; }
small { font-size: 11px;line-height: 12.65px;color: #00000073; }
h4 { flex-shrink: 0;margin: 0;font-size: 12px;line-height: 13.8px;font-weight: 400;color: #00000073; }
/* 原型排行按可用高度均匀分布；紧凑尺寸仍保留最小行距，必要时由卡片内容区滚动。 */
ol { display: flex;flex: 1;flex-direction: column;justify-content: space-around;gap: 6px;padding: 0;margin: 0;list-style: none; }
li { display: flex;flex-shrink: 0;align-items: center;gap: 10px;font-size: 12px;line-height: 14px; }
.rank { display: grid;place-items: center;flex-shrink: 0;width: 18px;height: 18px;color: #8c8c8c;background: #f0f1f3;border-radius: 50%;font-size: 11px; }
.rank-1 { background: #ff4d4f;color: #fff; }.rank-2 { background: #fa8c16;color: #fff; }.rank-3 { background: #1677ff;color: #fff; }
.rank-body { flex: 1;min-width: 0; }.rank-line { display: flex;align-items: baseline;gap: 12px; }
.rank-body :deep(.ant-progress.ant-progress-line) { display: flex;align-items: center;height: 5px;margin: 4px 0 0;line-height: 5px;font-size: 0; }
.card { flex: 1;overflow: hidden;text-overflow: ellipsis;white-space: nowrap; }
</style>
