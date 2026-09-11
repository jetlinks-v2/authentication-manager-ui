<template>
  <section class="resource-widget" :data-resource-kind="kind" :aria-label="title">
    <header><h3><span v-if="icon" class="title-icon"><AIcon :type="icon" /></span>{{ title }}</h3>
      <a-segmented v-if="kind === 'DeviceDistribution' && !isEmpty" v-model:value="deviceType" class="resource-switch" size="small" :options="deviceOptions" />
      <a-segmented v-if="['MessageTrend', 'VideoPlaybackTrend'].includes(kind) && !isEmpty" v-model:value="timeRange" class="resource-switch" size="small" :options="timeOptions" />
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
      <MetricPanel v-else :kind="kind" :metrics="data.metrics" />
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
// 数量卡无需下载图表依赖，图表子视图仅在对应组件渲染时加载。
const DistributionPanel = defineAsyncComponent(() => import('./DistributionPanel.vue'))
const TrendPanel = defineAsyncComponent(() => import('./TrendPanel.vue'))
const VideoPlaybackTrendPanel = defineAsyncComponent(() => import('./VideoPlaybackTrendPanel.vue'))
const props = defineProps<{ kind: ResourceKind; info?: ResourceInfo; isEdit: boolean }>()
const { t } = useI18n()
const menuStore = useMenuStore()
const { config,deviceType,timeRange,data,loading,error,unavailable,refresh } = useResourceWidget(props.kind,toRef(props,'info'),toRef(props,'isEdit'))
const isPreview = computed(() => props.isEdit || Boolean(props.info?.componentProps?.preview))
const { actions,open } = useQuickStart(toRef(props,'isEdit'), isPreview)
const title = computed(() => config.value.title || t(`resourceDashboard.${props.kind}`))
const icons: Partial<Record<ResourceKind,string>> = {
  EdgeNodes: 'ApiOutlined',
  IotDevices: 'DatabaseOutlined',
  VideoDevices: 'VideoCameraOutlined',
  Visualization: 'DashboardOutlined',
  AlgorithmCoverage: 'DeploymentUnitOutlined',
  VideoPlaybackTrend: 'PlayCircleOutlined',
}
const icon = computed(() => icons[props.kind])
const deviceOptions = computed(() => ['edge','iot','video'].map(value => ({ value,label: t(`resourceDashboard.${value}`) })))
const timeOptions = computed(() => ['today','yesterday','3d','7d','30d'].map(value => ({ value,label: t(`resourceDashboard.range.${value}`) })))

const isEmpty = computed(() => {
  if (props.kind === 'MessageTrend') {
    return !data.value.series?.length || data.value.series.every(item => item.value === 0)
  }
  if (props.kind === 'VideoPlaybackTrend') {
    return !data.value.series?.length || data.value.series.every(item => item.value === 0)
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
  if (menuStore.getMenu('algorithm-center')) {
    menuStore.jumpPage('algorithm-center')
  }
}
</script>
<style scoped>
.resource-widget { width: 100%;height: 100%;box-sizing: border-box;background: var(--ant-color-bg-container,#fff);border-radius: 12px;padding: 14px 16px;display: flex;flex-direction: column;container: resource-widget / inline-size;color: #1a1a1a;font-size: 14px;line-height: 1.4;box-shadow: 0 1px 3px #1118270a; }
header { display: flex;flex-wrap: wrap;align-items: center;justify-content: space-between;gap: 10px;margin-bottom: 10px;flex-shrink: 0; }
.resource-widget:is([data-resource-kind="EdgeNodes"], [data-resource-kind="IotDevices"], [data-resource-kind="VideoDevices"], [data-resource-kind="Visualization"]) { padding-bottom: 10px; }
.resource-widget:is([data-resource-kind="EdgeNodes"], [data-resource-kind="IotDevices"], [data-resource-kind="VideoDevices"], [data-resource-kind="Visualization"]) header { margin-bottom: 16px; }
.resource-widget:is([data-resource-kind="DeviceDistribution"], [data-resource-kind="MessageTrend"], [data-resource-kind="AlgorithmCoverage"], [data-resource-kind="VideoPlaybackTrend"]) header { margin-bottom: 6px; }
[data-resource-kind="QuickStart"] header { margin-bottom: 8px; }
h3 { display: flex;align-items: center;gap: 8px;font-size: 18px;line-height: 26px;font-weight: 400;margin: 0;min-width: 0;overflow-wrap: anywhere; }
.title-icon { display: grid;place-items: center;flex-shrink: 0;width: 26px;height: 26px;border-radius: 8px;background: #f0f7ff;color: #1677ff;font-size: 17px;line-height: 1; }
[data-resource-kind="EdgeNodes"] .title-icon { color: #722ed1;background: #f5f0ff; }
[data-resource-kind="VideoDevices"] .title-icon { color: #73b83a;background: #f4faed; }
[data-resource-kind="Visualization"] .title-icon { color: #5ebbb7;background: #eaf8f7; }
[data-resource-kind="Collection"] .title-icon { color: #ea913c;background: #fff7e9; }
[data-resource-kind="NetworkCards"] .title-icon { color: #cc4299;background: #fff0f7; }
[data-resource-kind="AlgorithmCoverage"] .title-icon { color: #fa8c16;background: #fff7e9; }
[data-resource-kind="VideoPlaybackTrend"] .title-icon { color: #52c41a;background: #f4faed; }
.action-link { display: inline-flex;align-items: center;gap: 4px;font-size: 13px;color: #1677ff;padding: 0;height: auto; }
.action-arrow { font-size: 11px; }
.content { flex: 1;min-height: 0;overflow: auto;display: flex;flex-direction: column; }
.content > :last-child { flex: 1;min-height: 0; }
.state { flex: 1;min-height: 0;display: flex;flex-direction: column;align-items: center;justify-content: center;gap: 8px;overflow: auto; }
/* 复用 Segmented 的滑动和键盘交互，仅在卡片内对齐原型的轨道与选中块。 */
.resource-switch.ant-segmented { max-width: 100%;overflow-x: auto;padding: 2px;border-radius: 8px;background: #f3f4f6;color: #6b7280;font-size: 12px; }
.resource-switch :deep(.ant-segmented-group) { gap: 3px; }
.resource-switch :deep(.ant-segmented-item) { border-radius: 6px;transition: color .2s; }
.resource-switch :deep(.ant-segmented-item-label) { min-height: 22px;padding: 4px 12px;line-height: 14px;font-size: 12px;font-weight: 400; }
.resource-switch :deep(.ant-segmented-item-selected),
.resource-switch :deep(.ant-segmented-thumb) { border-radius: 6px;background: #fff;color: #1f2937;box-shadow: 0 1px 3px #1118271a; }
.resource-switch :deep(.ant-segmented-item:hover:not(.ant-segmented-item-selected)) { color: #1f2937; }
.resource-switch :deep(.ant-segmented-item:has(input:focus-visible)) { outline: 2px solid #1677ff;outline-offset: -1px; }
</style>

