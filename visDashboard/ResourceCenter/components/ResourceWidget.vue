<template>
  <section class="resource-widget" :class="{ 'is-metric-card': isMetricCard }" :data-resource-kind="kind" :aria-label="title">
    <header v-if="!isMetricCard">
      <h3>{{ title }}</h3>
      <a-segmented v-if="kind === 'DeviceDistribution' && !isEmpty" v-model:value="deviceType" class="resource-switch" size="small" :options="deviceOptions" />
      <a-segmented v-if="['MessageTrend', 'VideoPlaybackTrend'].includes(kind)" v-model:value="timeRange" class="resource-switch" size="small" :options="timeOptions" />
      <a-button v-if="kind === 'AlgorithmCoverage'" type="link" size="small" class="action-link" @click="openAlgorithmConfig">
        {{ t('resourceDashboard.algorithmConfig') }} <RightOutlined class="action-arrow" />
      </a-button>
    </header>
    <div v-if="unavailable" class="state"><a-empty :description="t('resourceDashboard.privateOnly')" /></div>
    <div v-else-if="loading" class="state"><a-spin /></div>
    <div v-else-if="error" class="state"><a-empty :description="t('resourceDashboard.loadError')" /><a-button size="small" @click="refresh">{{ t('resourceDashboard.retry') }}</a-button></div>
    <div v-else class="content" :class="{ 'chart-content': ['DeviceDistribution','MessageTrend','VideoPlaybackTrend'].includes(kind) }">
      <QuickStartPanel v-if="kind === 'QuickStart'" :actions="actions" @open="open" />
      <AlgorithmCoveragePanel v-else-if="kind === 'AlgorithmCoverage'" :items="data.algorithms || []" />
      <DistributionPanel v-else-if="kind === 'DeviceDistribution'" :items="data.distribution" :device-type="deviceType" :limit="config.limit" />
      <TrendPanel v-else-if="kind === 'MessageTrend'" :series="data.series" />
      <VideoPlaybackTrendPanel v-else-if="kind === 'VideoPlaybackTrend'" :series="data.series" />
      <FlowPanel v-else-if="kind === 'NetworkCards'" :data="data" :limit="config.limit" />
      <MetricPanel v-else :kind="kind" :metrics="data.metrics" :title="title" />
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed, defineAsyncComponent, toRef } from 'vue'
import { RightOutlined } from '@ant-design/icons-vue'
import { useI18n } from 'vue-i18n'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { useResourceWidget } from '../hooks/useResourceWidget'
import { useQuickStart } from '../hooks/useQuickStart'
import type { ResourceKind, ResourceInfo } from '../shared'
import MetricPanel from './MetricPanel.vue'
import FlowPanel from './FlowPanel.vue'
import QuickStartPanel from './QuickStartPanel.vue'
import AlgorithmCoveragePanel from './AlgorithmCoveragePanel.vue'

const DistributionPanel = defineAsyncComponent(() => import('./DistributionPanel.vue'))
const TrendPanel = defineAsyncComponent(() => import('./TrendPanel.vue'))
const VideoPlaybackTrendPanel = defineAsyncComponent(() => import('./VideoPlaybackTrendPanel.vue'))
const props = defineProps<{ kind: ResourceKind; info?: ResourceInfo; isEdit: boolean }>()
const { t } = useI18n()
const menuStore = useMenuStore()
const { config, deviceType, timeRange, data, loading, error, unavailable, refresh } = useResourceWidget(props.kind, toRef(props, 'info'), toRef(props, 'isEdit'))
const isPreview = computed(() => props.isEdit || Boolean(props.info?.componentProps?.preview))
const { actions, open } = useQuickStart(toRef(props, 'isEdit'), isPreview)
const title = computed(() => config.value.title || t(`resourceDashboard.${props.kind}`))
const isMetricCard = computed(() => ['EdgeNodes', 'IotDevices', 'VideoDevices', 'Visualization'].includes(props.kind))

const deviceOptions = computed(() => ['edge', 'iot', 'video'].map(value => ({ value, label: t(`resourceDashboard.${value}`) })))
const timeOptions = computed(() => ['today', 'yesterday', '3d', '7d', '30d'].map(value => ({ value, label: t(`resourceDashboard.range.${value}`) })))

const isEmpty = computed(() => {
  if (props.kind === 'MessageTrend') {
    return !data.value.series?.length
  }
  if (props.kind === 'VideoPlaybackTrend') {
    return !data.value.series?.length
  }
  if (props.kind === 'AlgorithmCoverage') {
    return !data.value.algorithms?.length || data.value.algorithms.every(item => item.value === 0)
  }
  if (props.kind === 'DeviceDistribution') {
    return !data.value.distribution?.length || data.value.distribution.every(item => item.value === 0)
  }
  if (props.kind === 'Collection') {
    return !data.value.metrics?.length || data.value.metrics.every(item => !item.value || item.failed)
  }
  if (props.kind === 'NetworkCards') {
    return !data.value.ranking?.length && (!data.value.metrics?.length || data.value.metrics.every(item => !item.value || item.failed))
  }
  return false
})

function openAlgorithmConfig() {
  if (props.isEdit) return
  menuStore.jumpPage('iot-user-device-list/Batch', {
    query: { type: 'gateway', gatewayScope: 'query' },
  })
}
</script>
<style scoped>
.resource-widget {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background: var(--ant-color-bg-container, #fff);
  border-radius: 6px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  container: resource-widget / inline-size;
  color: #1D2129;
  font-size: 14px;
  line-height: 1.4;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  border: 1px solid #ECEFF3;
}
.resource-widget.is-metric-card {
  padding: 14px 16px;
}
header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
  flex-shrink: 0;
}
[data-resource-kind="QuickStart"] header {
  margin-bottom: 12px;
}
h3 {
  font-size: 16px;
  line-height: 24px;
  font-weight: 500;
  color: #1D2129;
  margin: 0;
  min-width: 0;
}
.action-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #1677ff;
  padding: 0;
  height: auto;
}
.action-arrow { font-size: 11px; }
.content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
}
.content > :last-child {
  flex: 1;
  min-height: 0;
}
.state {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  overflow: auto;
}
.resource-switch.ant-segmented {
  max-width: 100%;
  overflow-x: auto;
  padding: 2px;
  border-radius: 4px;
  background: #F2F3F5;
  color: #4E5969;
  font-size: 12px;
}
.resource-switch :deep(.ant-segmented-group) { gap: 2px; }
.resource-switch :deep(.ant-segmented-item) { border-radius: 3px; transition: color .2s; }
.resource-switch :deep(.ant-segmented-item-label) { min-height: 22px; padding: 2px 10px; line-height: 18px; font-size: 12px; font-weight: 400; }
.resource-switch :deep(.ant-segmented-item-selected),
.resource-switch :deep(.ant-segmented-thumb) { border-radius: 3px; background: #fff; color: #165DFF; font-weight: 500; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08); }
.resource-switch :deep(.ant-segmented-item:hover:not(.ant-segmented-item-selected)) { color: #1D2129; }
.resource-switch :deep(.ant-segmented-item:has(input:focus-visible)) { outline: 2px solid #1677ff; outline-offset: -1px; }
</style>
