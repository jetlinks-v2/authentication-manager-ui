<template>
  <div class="resource-dashboard-widget" :data-resource-panel="panel.kind" :data-resource-summary="panel.summaryId">
    <ResourceCollectionSummary v-if="panel.kind === 'summary' && card && card.expanded" :card="card"
      :loading="runtime.summary.loading.value" :error="runtime.summary.error.value"
      @open="runtime.summary.open" @retry="runtime.summary.refresh" />
    <ResourceSummaryCard v-else-if="panel.kind === 'summary' && card" :card="card"
      :loading="runtime.summary.loading.value" :error="runtime.summary.error.value"
      @open="runtime.summary.open" @retry="runtime.summary.refresh" />
    <ResourceMessagePanel v-else-if="panel.kind === 'message'" :scope="runtime.scope.value" :initial-range="runtime.messageRange.value" />
    <a-card v-else-if="panel.kind === 'map'" class="resource-panel" :title="t('resourceDashboard.DeviceDistribution')">
      <template #extra><div :id="mapLegendId" /></template>
      <ResourceDeviceMap :legend-target="`#${mapLegendId}`" />
    </a-card>
    <ResourceDeviceDistribution v-else-if="panel.kind === 'distribution'" />
    <GatewayStatusPanel v-else-if="panel.kind === 'gateway'" :info="info" :is-edit="false" @count="runtime.onGatewayCount" />
    <VisionTaskRanking v-else-if="panel.kind === 'vision'" :info="info" />
    <ResourceSupplementalPanel v-else-if="panel.kind !== 'summary'" :kind="panel.kind" :scope="runtime.scope.value" />
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DashboardWidget } from '@jetlinks-web-core/components/DashBoardCanvas'
import GatewayStatusPanel from '../../../../visDashboard/ResourceCenter/components/GatewayStatusPanel.vue'
import VisionTaskRanking from '../../../../visDashboard/ResourceCenter/VisionTaskRanking/VisionTaskRanking.vue'
import ResourceSummaryCard from './ResourceSummaryCard.vue'
import ResourceCollectionSummary from './ResourceCollectionSummary.vue'
import ResourceMessagePanel from './ResourceMessagePanel.vue'
import ResourceSupplementalPanel from './ResourceSupplementalPanel.vue'
import ResourceDeviceDistribution from './ResourceDeviceDistribution.vue'
import ResourceDeviceMap from './ResourceDeviceMap.vue'
import { useResourcePageContext } from '../resourcePageContext'
import type { ResourcePageWidget } from '../resourcePageCanvas'

const props = defineProps<{ info: DashboardWidget }>()
const { t } = useI18n()
const runtime = useResourcePageContext()
// 每张地图使用独立的标题栏容器，重排或多实例不会把图例挂到其他卡片。
const mapLegendId = `resource-map-legend-${useId()}`
// 页面适配器只选取已授权组件和共享数据，不在卡片重排时新建查询。
const panel = computed(() => props.info.componentProps.resourcePage as Pick<ResourcePageWidget, 'kind' | 'summaryId'>)
const card = computed(() => runtime.summary.cards.value.find(item => item.id === panel.value.summaryId))
</script>

<style scoped>
.resource-dashboard-widget { width: 100%; height: 100%; min-width: 0; min-height: 0; }
</style>
