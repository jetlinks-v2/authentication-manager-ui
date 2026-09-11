<template>
  <ResourceEmpty
    v-if="kind === 'Collection' && isCollectionEmpty"
    icon="LineChartOutlined"
    :title="t('resourceDashboard.noCollectionTitle')"
    :description="t('resourceDashboard.noCollectionDesc')"
    :action-text="t('resourceDashboard.actionAddCollection')"
    @action="handleConfigCollection"
  />
  <div v-else-if="kind === 'Collection'" class="collection">
    <div v-for="key in ['channel', 'collector']" :key="key" class="collection-item">
      <div>
        <AIcon class="collect-icon" :class="key" :type="key === 'channel' ? 'PartitionOutlined' : 'FundOutlined'" />
        <span class="collect-label">{{ t(`resourceDashboard.${key}`) }}</span>
        <span class="abnormal">{{ t('resourceDashboard.abnormal') }} {{ value(`${key}Error`) }}</span>
      </div>
      <strong>{{ value(key) }}</strong>
    </div>
  </div>
  <div v-else class="metric-card">
    <div class="card-main">
      <div class="card-info">
        <span class="card-title">{{ title || t(`resourceDashboard.${kind}`) }}</span>
        <div class="value-row">
          <strong class="total-value">{{ value(kind === 'Visualization' ? 'screen' : 'total') }}</strong>
          <span class="unit">个</span>
        </div>
      </div>
      <div v-if="metricIconMap[kind]" class="card-badge">
        <img :src="metricIconMap[kind]" class="badge-img" :alt="kind" />
      </div>
    </div>
    <div class="card-divider" />
    <div class="card-sub-metrics">
      <span v-for="(item, index) in secondaryMetrics" :key="item.key" class="sub-item">
        <i class="dot" :style="{ background: getDotColor(item.key, index) }" />
        <span class="sub-label">{{ t(`resourceDashboard.${item.key}`) }}</span>
        <span class="sub-value">{{ item.failed ? '—' : item.value?.toLocaleString() }}</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { useI18n } from 'vue-i18n'
import type { Metric, ResourceKind } from '../shared'
import ResourceEmpty from './ResourceEmpty.vue'
import metricEdge from '../assets/metric-edge.png'
import metricIot from '../assets/metric-iot.png'
import metricVideo from '../assets/metric-video.png'
import metricVisualization from '../assets/metric-visualization.png'

const props = defineProps<{
  kind: ResourceKind
  metrics: Metric[]
  title?: string
}>()

const { t } = useI18n()
const menuStore = useMenuStore()

const metricIconMap: Record<string, string> = {
  EdgeNodes: metricEdge,
  IotDevices: metricIot,
  VideoDevices: metricVideo,
  Visualization: metricVisualization,
}

const isCollectionEmpty = computed(() => !props.metrics.length || props.metrics.every(m => !m.value || m.failed))

function handleConfigCollection() {
  if (menuStore.getMenu('data-collect')) {
    menuStore.jumpPage('data-collect')
  }
}

const value = (key: string) => {
  const item = props.metrics.find(m => m.key === key)
  if (item && !item.failed && typeof item.value === 'number') return item.value.toLocaleString()
  return '—'
}

const secondaryMetrics = computed(() => {
  if (props.kind === 'Visualization') {
    return props.metrics.filter(m => m.key !== 'screen')
  }
  return props.metrics.filter(m => m.key !== 'total')
})

function getDotColor(key: string, index: number) {
  if (key === 'online' || key === 'covered') return '#27C34A'
  if (key === 'offline' || key === 'unbound') return '#86909C'
  const palette = ['#1E72F0', '#FF7D00', '#30C7D8', '#7980D4', '#27C34A', '#86909C']
  return palette[index % palette.length]
}
</script>

<style scoped>
.metric-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  min-height: 0;
}
.card-main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  min-width: 0;
}
.card-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.card-title {
  font-size: 14px;
  color: #86909C;
  line-height: 20px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.value-row {
  display: flex;
  align-items: baseline;
  margin-top: 4px;
}
.total-value {
  font-size: 24px;
  font-weight: 500;
  line-height: 28px;
  color: #1D2129;
  font-variant-numeric: tabular-nums;
}
.unit {
  font-size: 14px;
  color: #86909C;
  margin-left: 4px;
  line-height: 20px;
}
.card-badge {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
}
.badge-img {
  width: 48px;
  height: 48px;
  display: block;
  object-fit: contain;
}
.card-divider {
  height: 1px;
  background: #ECEFF3;
  margin: 10px 0;
  flex-shrink: 0;
}
.card-sub-metrics {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  line-height: 18px;
}
.sub-item {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  white-space: nowrap;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 6px;
  flex-shrink: 0;
}
.sub-label {
  color: #86909C;
  margin-right: 4px;
}
.sub-value {
  color: #1D2129;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.collection {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
}
.collection-item {
  background: #f7f8fa;
  border-radius: 10px;
  padding: 10px 14px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.collection-item > div {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.collect-icon {
  font-size: 16px;
  flex-shrink: 0;
}
.channel { color: #1677ff; }
.collector { color: #722ed1; }
.collect-label {
  flex: 1;
  font-size: 13px;
  color: #1f2937;
}
.abnormal {
  padding: 1px 6px;
  border-radius: 4px;
  background: #fff1f0;
  font-size: 11px;
  line-height: 14px;
  color: #ff4d4f;
  flex-shrink: 0;
}
</style>
