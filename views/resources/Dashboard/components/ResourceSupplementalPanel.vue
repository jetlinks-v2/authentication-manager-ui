<template>
  <a-card v-if="enabled" class="resource-panel resource-supplemental-panel" :title="title" :data-supplemental-kind="kind">
    <template #extra>
      <div class="supplemental-actions">
        <a-segmented v-if="isTrend" v-model:value="range" size="small" :options="options" class="ranking-switch" />
        <a-button v-if="canOpen" type="link" size="small" class="action-link" @click="open">
          {{ t('resourceDashboard.supplemental.more') }}<RightOutlined class="action-arrow" />
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
      <ResourceEmpty :title="t(`resourceDashboard.supplemental.empty.${kind}`)" />
    </div>
    <div v-else class="supplemental-content">
      <div v-if="summary" class="supplemental-summary">{{ summary }}</div>
      <div v-if="isTrend" class="supplemental-chart">
        <Echarts :option="chartOption" :library="[LineChart, BarChart, GridComponent, TooltipComponent]" />
      </div>
      <div v-else-if="kind === 'points' || kind === 'protocols'" class="supplemental-bars">
        <div v-for="row in distributionRows" :key="row.id" class="supplemental-bar">
          <div class="supplemental-row"><span class="supplemental-name" :title="row.name">{{ row.name }}</span><span>{{ row.valueText }}</span></div>
          <a-progress :percent="row.percent" :stroke-color="row.color" :show-info="false" :stroke-width="7" />
        </div>
      </div>
      <div v-else-if="kind === 'pools'" class="supplemental-pools">
        <div v-for="pool in pools" :key="pool.id" class="supplemental-pool">
          <div class="supplemental-row"><span class="supplemental-name" :title="pool.name">{{ pool.name }}</span><span class="supplemental-muted">{{ pool.cardText }}</span></div>
          <div class="supplemental-row supplemental-pool-value"><span>{{ pool.usedText }} / {{ pool.totalText }}</span><span class="supplemental-muted">{{ pool.percentText }}</span></div>
          <a-progress :percent="pool.percent" :stroke-color="pool.color" :show-info="false" :stroke-width="7" />
        </div>
      </div>
      <div v-else class="supplemental-offline">
        <div v-for="device in devices" :key="device.id" class="supplemental-offline-row">
          <a-badge status="error" />
          <div class="supplemental-device">
            <span class="supplemental-name" :title="device.name">{{ device.name }}</span>
            <span v-if="device.description" class="supplemental-name supplemental-muted" :title="device.description">{{ device.description }}</span>
          </div>
          <span class="supplemental-muted supplemental-time" :title="device.fullTime">{{ device.offlineText }}</span>
        </div>
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
import { useResourceSupplemental } from '../useResourceSupplemental'
import type { ResourceSupplementalKind } from '../resourceSupplemental.types'

// This container binds the capability-scoped hook; loading and navigation remain outside the display template.
const props = withDefaults(defineProps<{ kind: ResourceSupplementalKind; scope: string; enabled?: boolean }>(), { enabled: true })
const { t } = useI18n()
const { title, isTrend, range, options, loading, error, empty, summary,
  distributionRows, pools, devices, chartOption, canOpen, open, refresh } = useResourceSupplemental(
  toRef(props, 'kind'), computed(() => props.enabled), toRef(props, 'scope'),
)
</script>

<style scoped>
.resource-supplemental-panel { height: 100%; min-width: 0; display: flex; flex-direction: column; }
.resource-supplemental-panel :deep(.ant-card-head) { padding-inline: 16px; }
.resource-supplemental-panel :deep(.ant-card-head-wrapper) { gap: 12px; flex-wrap: wrap; }
.resource-supplemental-panel :deep(.ant-card-head) { flex-shrink: 0; }
.resource-supplemental-panel :deep(.ant-card-body) { flex: 1; padding: 16px; display: flex; flex-direction: column; min-height: 0; }
.supplemental-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.supplemental-actions :deep(.ant-btn-link) { padding-inline: 0; }
.supplemental-state { display: flex; align-items: center; justify-content: center; flex: 1; min-height: 190px; }
.supplemental-content { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 14px; }
.supplemental-summary, .supplemental-muted { color: var(--ant-color-text-secondary, #8c8c8c); font-size: 12px; }
.supplemental-chart { flex: 1; min-height: 220px; overflow: hidden; }
.supplemental-bars, .supplemental-pools, .supplemental-offline { min-height: 0; overflow: auto; }
.supplemental-bars, .supplemental-pools { display: flex; flex-direction: column; gap: 18px; }
.supplemental-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.supplemental-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.supplemental-row > :last-child { flex-shrink: 0; font-variant-numeric: tabular-nums; }
.supplemental-pool-value { margin-top: 7px; font-size: 13px; }
.supplemental-offline-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--ant-color-border-secondary, #f0f0f0); }
.supplemental-offline-row:last-child { border-bottom: 0; }
.supplemental-device { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.supplemental-time { flex-shrink: 0; font-variant-numeric: tabular-nums; }
</style>
