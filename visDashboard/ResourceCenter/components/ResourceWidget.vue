<template>
  <section v-if="!unavailable" class="resource-widget" :class="{ 'is-metric-card': isMetricCard }" :data-resource-kind="kind" :aria-label="title">
    <header v-if="!isMetricCard">
      <h3>{{ title }}</h3>
      <a-segmented v-if="kind === 'DeviceDistribution'" v-model:value="deviceType" class="resource-switch" size="small" :options="deviceOptions" />
      <a-segmented v-if="kind === 'MessageTrend'" v-model:value="timeRange" class="resource-switch" size="small" :options="timeOptions" />
      <a-button v-if="kind === 'AlgorithmCoverage'" type="link" size="small" class="action-link" @click="openAlgorithmConfig">
        {{ t('resourceDashboard.algorithmConfig') }} <RightOutlined class="action-arrow" />
      </a-button>
    </header>
    <div v-if="loading" class="state"><a-spin /></div>
    <div v-else-if="error" class="state">
      <ResourceEmpty :title="t('resourceDashboard.loadError')">
        <a-button size="small" @click="refresh">{{ t('resourceDashboard.retry') }}</a-button>
      </ResourceEmpty>
    </div>
    <div v-else class="content" :class="{ 'chart-content': ['DeviceDistribution','MessageTrend'].includes(kind) }">
      <QuickStartPanel v-if="kind === 'QuickStart'" :actions="actions" @open="open" />
      <AlgorithmCoveragePanel v-else-if="kind === 'AlgorithmCoverage'" :items="data.algorithms || []" />
      <DistributionPanel v-else-if="kind === 'DeviceDistribution'" :items="data.distribution" :device-type="deviceType" :limit="config.limit" />
      <TrendPanel v-else-if="kind === 'MessageTrend'" :series="data.series" />
      <FlowPanel v-else-if="kind === 'NetworkCards'" :data="data" :limit="config.limit" />
      <MetricPanel v-else :kind="kind" :metrics="data.metrics" :title="title" />
    </div>
  </section>
</template>
<script setup lang="ts">
import ResourceEmpty from './ResourceEmpty.vue'
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
const props = defineProps<{ kind: ResourceKind; info?: ResourceInfo; isEdit: boolean }>()
const { t } = useI18n()
const menuStore = useMenuStore()
const widget = useResourceWidget(props.kind, toRef(props, 'info'), toRef(props, 'isEdit'))
const { config, deviceType, deviceKinds, timeRange, data, unavailable } = widget
const isPreview = computed(() => props.isEdit || Boolean(props.info?.componentProps?.preview))
const quickStart = props.kind === 'QuickStart' ? useQuickStart(toRef(props, 'isEdit'), isPreview) : undefined
const actions = computed(() => quickStart?.actions.value ?? [])
const loading = computed(() => quickStart?.loading.value ?? widget.loading.value)
const error = computed(() => quickStart ? quickStart.errors.value.length > 0 : widget.error.value)
const open = (key: string) => quickStart?.open(key)
const refresh = () => quickStart ? quickStart.reload() : widget.refresh()
const title = computed(() => config.value.title || t(`resourceDashboard.${props.kind}`))
const isMetricCard = computed(() => ['EdgeNodes', 'IotDevices', 'VideoDevices', 'Visualization'].includes(props.kind))

const deviceOptions = computed(() => deviceKinds.value.map(value => ({ value, label: t(`resourceDashboard.${value}`) })))
const timeOptions = computed(() => ['today', 'yesterday', '3d', '7d', '30d'].map(value => ({ value, label: t(`resourceDashboard.range.${value}`) })))

function openAlgorithmConfig() {
  if (props.isEdit) return
  menuStore.jumpPage('iot-user-device-list/Batch', {
    query: { type: 'gateway', gatewayScope: 'query' },
  })
}
</script>
<style scoped src="./resourceControls.css" />
<style scoped>
.resource-widget {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background: var(--ant-color-bg-container, #fff);
  border-radius: var(--r-3, 8px);
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
  /* 四行默认网格内给标题、数值和底部指标留足空间。 */
  padding: 10px 16px;
  box-sizing: border-box;
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
[data-resource-kind="MessageTrend"] > .content {
  /* 图表随容器缩放，避免占位滚动条与画布 resize 相互触发。 */
  overflow: hidden;
}
[data-resource-kind="QuickStart"] > .content {
  /* 快捷卡片随网格收缩，悬浮装饰和亚像素溢出不应触发滚动条。 */
  overflow: clip;
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
</style>
