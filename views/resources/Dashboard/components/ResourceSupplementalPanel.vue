<template>
  <a-card v-if="enabled" class="resource-panel resource-supplemental-panel"
    :class="{ 'resource-supplemental-panel--trend': isTrend }" :title="title" :data-supplemental-kind="kind">
    <template #extra>
      <div class="supplemental-actions">
        <a-segmented v-if="isTrend" v-model:value="range" size="small" :options="options" class="ranking-switch" />
        <span v-if="(kind === 'points' || kind === 'protocols') && !loading && !error" class="supplemental-summary">{{ summary }}</span>
        <span v-if="kind === 'pools'" class="supplemental-summary">{{ t('resourceDashboard.supplemental.monthByOperator') }}</span>
        <a-button v-if="canOpen" type="link" size="small" class="action-link" @click="open">
          {{ t(kind === 'traffic' ? 'resourceDashboard.supplemental.cardLink' : kind === 'points' ? 'resourceDashboard.supplemental.pointLink' : kind === 'protocols' ? 'resourceDashboard.supplemental.channelLink' : 'resourceDashboard.supplemental.more') }}<RightOutlined class="action-arrow" />
        </a-button>
      </div>
    </template>
    <div v-if="loading" class="supplemental-state"><a-spin /></div>
    <div v-else-if="error" class="supplemental-state">
      <ResourceEmpty :title="t('resourceDashboard.loadError')">
        <a-button size="small" @click="refresh">{{ t('resourceDashboard.retry') }}</a-button>
      </ResourceEmpty>
    </div>
    <div v-else-if="empty" class="supplemental-state">
      <ResourceEmpty :title="emptyTitle" />
    </div>
    <div v-else class="supplemental-content">
      <div v-if="summary && kind !== 'points' && kind !== 'protocols'" class="supplemental-summary">{{ summary }}</div>
      <div v-if="isTrend" class="supplemental-chart">
        <Echarts :option="chartOption" :library="[LineChart, BarChart, GridComponent, TooltipComponent]" />
      </div>
      <ResourceDistributionBars v-else-if="kind === 'points' || kind === 'protocols'" :rows="distributionRows" />
      <div v-else-if="kind === 'pools'" class="supplemental-pool-content">
        <div class="supplemental-pools">
        <div v-for="pool in pools" :key="pool.id" class="supplemental-pool">
          <div class="supplemental-row supplemental-pool-row">
            <span class="supplemental-pool-identity"><span class="supplemental-name" :title="pool.name">{{ pool.name }}</span><span class="supplemental-muted">{{ pool.cardText }}</span></span>
            <span class="supplemental-pool-value">{{ pool.usedText }} / {{ pool.totalText }} <span class="supplemental-muted">{{ pool.percentText }}</span></span>
          </div>
          <a-progress :percent="pool.percent" :stroke-color="pool.color" :show-info="false" :stroke-width="7" />
        </div>
        </div>
        <div class="supplemental-summary">{{ poolSummary }}</div>
      </div>
    </div>
  </a-card>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { RightOutlined } from '@ant-design/icons-vue'
import { LineChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import Echarts from '@jetlinks-web-core/components/Echarts'
import ResourceEmpty from '../../../../visDashboard/ResourceCenter/components/ResourceEmpty.vue'
import ResourceDistributionBars from './ResourceDistributionBars.vue'
import { useResourceSupplemental } from '../useResourceSupplemental'
import type { ResourceSupplementalKind } from '../resourceSupplemental.types'

// This container binds the capability-scoped hook; loading and navigation remain outside the display template.
const props = withDefaults(defineProps<{ kind: Exclude<ResourceSupplementalKind, 'offline'>; scope: string; enabled?: boolean }>(), { enabled: true })
const { t } = useI18n()
const { title, emptyTitle, isTrend, range, options, loading, error, empty, summary,
  distributionRows, pools, poolSummary, chartOption, canOpen, open, refresh } = useResourceSupplemental(
  toRef(props, 'kind'), computed(() => props.enabled), toRef(props, 'scope'),
)
</script>

<style scoped src="../../../../visDashboard/ResourceCenter/components/resourceRanking.css" />
<style scoped>
.resource-supplemental-panel { height: 100%; min-width: 0; display: flex; flex-direction: column; container: supplemental / inline-size; }
.resource-supplemental-panel :deep(.ant-card-head) { padding-inline: 16px; }
.resource-supplemental-panel :deep(.ant-card-head-wrapper) { gap: 12px; flex-wrap: wrap; }
.resource-supplemental-panel :deep(.ant-card-head) { flex-shrink: 0; }
.resource-supplemental-panel :deep(.ant-card-body) { flex: 1; padding: 16px; display: flex; flex-direction: column; min-height: 0; }
.supplemental-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.supplemental-actions :deep(.ant-btn-link) { padding-inline: 0; }
/* 空态自身按可用高度缩小插图；不再用固定最小高度挤压窄卡正文。 */
.supplemental-state { display: flex; align-items: center; justify-content: center; flex: 1; min-height: 0; }
.supplemental-content { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 14px; }
.supplemental-summary, .supplemental-muted { color: var(--ant-color-text-secondary, #8c8c8c); font-size: 12px; }
/* 图表随正文剩余空间缩放，避免卡片调整尺寸时出现滚动条。 */
.supplemental-chart { flex: 1; min-height: 0; overflow: hidden; }
.supplemental-pools { min-height: 0; overflow: auto; display: flex; flex-direction: column; }
.supplemental-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.supplemental-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.supplemental-row > :last-child { flex-shrink: 0; font-variant-numeric: tabular-nums; }
.supplemental-pool-content { display: flex; flex: 1; min-height: 0; flex-direction: column; gap: 12px; }
.supplemental-pools { flex: 1; gap: 10px; }
.supplemental-pool { display: flex; flex-direction: column; gap: 6px; }
.supplemental-pool :deep(.ant-progress) { height: 7px; margin: 0; line-height: 1; }
.supplemental-pool-row { gap: 8px; font-size: 12px; }
.supplemental-pool-identity { display: flex; min-width: 0; align-items: center; gap: 6px; }
.supplemental-pool-identity .supplemental-muted { flex: none; white-space: nowrap; }
.supplemental-pool-value { font-size: 12px; white-space: nowrap; }
</style>
