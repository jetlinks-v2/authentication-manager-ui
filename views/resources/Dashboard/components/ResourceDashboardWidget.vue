<template>
  <div class="resource-dashboard-widget" :data-resource-panel="panel.kind" :data-resource-summary="panel.summaryId">
    <ResourceSummaryCard v-if="panel.kind === 'summary' && card" :card="card"
      :loading="runtime.summary.loading.value" :error="runtime.summary.error.value"
      @open="runtime.summary.open" @retry="runtime.summary.refresh" />
    <ResourceMessagePanel v-else-if="panel.kind === 'message'" :scope="runtime.scope.value" :initial-range="runtime.messageRange.value" />
    <template v-else-if="panel.kind === 'map'">
      <DashboardWidgetRenderer v-if="runtime.mapWidget.value" :widget="runtime.mapWidget.value"
        :definition="runtime.mapDefinition.value" :preview-mode="false" />
      <a-card v-else class="resource-panel" :title="t('resourceDashboard.DeviceDistribution')" size="small">
        <div v-if="runtime.mapLoading.value" class="resource-panel-state"><a-spin /></div>
        <ResourceEmpty v-else class="resource-panel-state" :title="t('resourcePage.mapUnavailable')">
          <a-button size="small" @click="runtime.reloadMap">{{ t('resourceDashboard.retry') }}</a-button>
        </ResourceEmpty>
      </a-card>
    </template>
    <GatewayStatusPanel v-else-if="panel.kind === 'gateway'" :info="info" :is-edit="false" @count="runtime.onGatewayCount" />
    <VisionTaskRanking v-else-if="panel.kind === 'vision'" :info="info" />
    <ResourceSupplementalPanel v-else-if="panel.kind !== 'summary'" :kind="panel.kind" :scope="runtime.scope.value" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { DashboardWidgetRenderer, type DashboardWidget } from '@jetlinks-web-core/components/DashBoardCanvas'
import GatewayStatusPanel from '../../../../visDashboard/ResourceCenter/components/GatewayStatusPanel.vue'
import VisionTaskRanking from '../../../../visDashboard/ResourceCenter/VisionTaskRanking/VisionTaskRanking.vue'
import ResourceEmpty from '../../../../visDashboard/ResourceCenter/components/ResourceEmpty.vue'
import ResourceSummaryCard from './ResourceSummaryCard.vue'
import ResourceMessagePanel from './ResourceMessagePanel.vue'
import ResourceSupplementalPanel from './ResourceSupplementalPanel.vue'
import { useResourcePageContext } from '../resourcePageContext'
import type { ResourcePageWidget } from '../resourcePageCanvas'

const props = defineProps<{ info: DashboardWidget }>()
const { t } = useI18n()
const runtime = useResourcePageContext()
// 页面适配器只选取已授权组件和共享数据，不在卡片重排时新建查询。
const panel = computed(() => props.info.componentProps.resourcePage as Pick<ResourcePageWidget, 'kind' | 'summaryId'>)
const card = computed(() => runtime.summary.cards.value.find(item => item.id === panel.value.summaryId))
</script>

<style scoped>
.resource-dashboard-widget { width: 100%; height: 100%; min-width: 0; min-height: 0; }
</style>
