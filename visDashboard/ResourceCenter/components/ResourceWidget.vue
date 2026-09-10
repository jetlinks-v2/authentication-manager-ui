<template>
  <section class="resource-widget" :data-resource-kind="kind" :aria-label="title">
    <header><h3><span v-if="icon" class="title-icon"><AIcon :type="icon" /></span>{{ title }}</h3>
      <a-segmented v-if="kind === 'DeviceDistribution'" v-model:value="deviceType" class="resource-switch" size="small" :options="deviceOptions" />
      <a-segmented v-if="kind === 'MessageTrend'" v-model:value="timeRange" class="resource-switch" size="small" :options="timeOptions" />
    </header>
    <div v-if="unavailable" class="state"><a-empty :description="t('resourceDashboard.privateOnly')" /></div>
    <div v-else-if="loading" class="state"><a-spin /></div>
    <div v-else-if="error" class="state"><a-empty :description="t('resourceDashboard.loadError')" /><a-button size="small" @click="refresh">{{ t('resourceDashboard.retry') }}</a-button></div>
    <div v-else class="content" :class="{ 'chart-content': ['DeviceDistribution','MessageTrend'].includes(kind) }">
      <div v-if="partialError" class="partial-error">{{ t('resourceDashboard.partialError') }} <a-button type="link" size="small" @click="refresh">{{ t('resourceDashboard.retry') }}</a-button></div>
      <QuickStartPanel v-if="kind === 'QuickStart'" :actions="actions" @open="open" />
      <DistributionPanel v-else-if="kind === 'DeviceDistribution'" :items="data.distribution" :device-type="deviceType" :limit="config.limit" />
      <TrendPanel v-else-if="kind === 'MessageTrend'" :series="data.series" />
      <FlowPanel v-else-if="kind === 'NetworkCards'" :data="data" :limit="config.limit" />
      <MetricPanel v-else :kind="kind" :metrics="data.metrics" />
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed, defineAsyncComponent, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useResourceWidget } from '../hooks/useResourceWidget'
import { useQuickStart } from '../hooks/useQuickStart'
import type { ResourceKind, ResourceInfo } from '../shared'
import MetricPanel from './MetricPanel.vue'
import FlowPanel from './FlowPanel.vue'
import QuickStartPanel from './QuickStartPanel.vue'
// 数量卡无需下载图表依赖，图表子视图仅在对应组件渲染时加载。
const DistributionPanel = defineAsyncComponent(() => import('./DistributionPanel.vue'))
const TrendPanel = defineAsyncComponent(() => import('./TrendPanel.vue'))
const props = defineProps<{ kind: ResourceKind; info?: ResourceInfo; isEdit: boolean }>()
const { t } = useI18n()
const { config,deviceType,timeRange,data,loading,error,unavailable,refresh } = useResourceWidget(props.kind,toRef(props,'info'),toRef(props,'isEdit'))
const { actions,open } = useQuickStart(toRef(props,'isEdit'))
const title = computed(() => config.value.title || t(`resourceDashboard.${props.kind}`))
const icons: Partial<Record<ResourceKind,string>> = { EdgeNodes: 'ApiOutlined',IotDevices: 'DatabaseOutlined',VideoDevices: 'VideoCameraOutlined',Visualization: 'DashboardOutlined' }
const icon = computed(() => icons[props.kind])
const partialError = computed(() => data.value.metrics.some(item => item.failed) || data.value.rankingFailed)
const deviceOptions = computed(() => ['edge','iot','video'].map(value => ({ value,label: t(`resourceDashboard.${value}`) })))
const timeOptions = computed(() => ['today','yesterday','3d','7d','30d'].map(value => ({ value,label: t(`resourceDashboard.range.${value}`) })))
</script>
<style scoped>
.resource-widget { width: 100%;height: 100%;box-sizing: border-box;background: var(--ant-color-bg-container,#fff);border-radius: 12px;padding: 14px 16px;display: flex;flex-direction: column;container: resource-widget / inline-size;color: #1a1a1a;font-size: 14px;line-height: 1.4;box-shadow: 0 1px 3px #1118270a; }
header { display: flex;flex-wrap: wrap;align-items: center;justify-content: space-between;gap: 10px;margin-bottom: 10px;flex-shrink: 0; }
.resource-widget:is([data-resource-kind="EdgeNodes"], [data-resource-kind="IotDevices"], [data-resource-kind="VideoDevices"], [data-resource-kind="Visualization"]) { padding-bottom: 10px; }
.resource-widget:is([data-resource-kind="EdgeNodes"], [data-resource-kind="IotDevices"], [data-resource-kind="VideoDevices"], [data-resource-kind="Visualization"]) header { margin-bottom: 16px; }
.resource-widget:is([data-resource-kind="DeviceDistribution"], [data-resource-kind="MessageTrend"]) header { margin-bottom: 6px; }
[data-resource-kind="QuickStart"] header { margin-bottom: 8px; }
h3 { display: flex;align-items: center;gap: 8px;font-size: 18px;line-height: 26px;font-weight: 400;margin: 0;min-width: 0;overflow-wrap: anywhere; }
.title-icon { display: grid;place-items: center;flex-shrink: 0;width: 26px;height: 26px;border-radius: 8px;background: #f0f7ff;color: #1677ff;font-size: 17px;line-height: 1; }
[data-resource-kind="EdgeNodes"] .title-icon { color: #722ed1;background: #f5f0ff; }
[data-resource-kind="VideoDevices"] .title-icon { color: #73b83a;background: #f4faed; }
[data-resource-kind="Visualization"] .title-icon { color: #5ebbb7;background: #eaf8f7; }
[data-resource-kind="Collection"] .title-icon { color: #ea913c;background: #fff7e9; }
[data-resource-kind="NetworkCards"] .title-icon { color: #cc4299;background: #fff0f7; }
.content { flex: 1;min-height: 0;overflow: auto; }.chart-content { display: flex;flex-direction: column; }.chart-content > :last-child { flex: 1; }
.state { flex: 1;min-height: 0;display: flex;flex-direction: column;align-items: center;justify-content: center;gap: 8px;overflow: auto; }
.partial-error { font-size: 12px;color: var(--ant-color-warning,#d48806); }
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
