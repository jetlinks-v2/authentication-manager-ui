<template>
  <a-card class="resource-panel resource-message-panel" :title="t('resourcePage.messageTitle')" size="small">
    <template #extra>
      <div class="resource-message-actions">
        <a-segmented v-model:value="range" :options="ranges" size="small" class="ranking-switch" />
        <a-button v-if="target" type="link" size="small" class="action-link" @click="openDevices">
          {{ t('resourceDashboard.IotDevices') }}<RightOutlined class="action-arrow" />
        </a-button>
      </div>
    </template>
    <div v-if="query.loading && !query.data" class="resource-panel-state"><a-spin /></div>
    <ResourceEmpty v-else-if="query.error" class="resource-panel-state" :title="t('resourceDashboard.loadError')">
      <a-button size="small" @click="query.refresh">{{ t('resourceDashboard.retry') }}</a-button>
    </ResourceEmpty>
    <template v-else>
      <div class="resource-trend-total">
        <span class="resource-trend-legend"><i />{{ t(`resourceDashboard.range.${range}`) }} {{ total }} {{ t('resourcePage.messagesUnit') }}</span>
        <span class="resource-meta">{{ t(hourly ? 'resourcePage.hourly' : 'resourcePage.daily') }}</span>
      </div>
      <div class="resource-chart"><Echarts :option="option" :library="[BarChart, GridComponent, TooltipComponent]" /></div>
    </template>
  </a-card>
</template>
<script setup lang="ts">
import { toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { RightOutlined } from '@ant-design/icons-vue'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import Echarts from '@jetlinks-web-core/components/Echarts'
import ResourceEmpty from '../../../../visDashboard/ResourceCenter/components/ResourceEmpty.vue'
import { useResourceMessage } from '../useResourceMessage'
import type { TimeRange } from '../../../../visDashboard/ResourceCenter/shared'
const props = defineProps<{ scope: string; initialRange?: TimeRange }>()
const { t } = useI18n()
const { query, range, ranges, total, hourly, option, target, openDevices } = useResourceMessage(toRef(props, 'scope'), props.initialRange)
</script>
<style scoped src="../../../../visDashboard/ResourceCenter/components/resourceRanking.css" />
<style scoped>
.resource-message-panel { container: resource-message / inline-size; }
.resource-message-panel :deep(.ant-card-head-wrapper) { flex-wrap: wrap; gap: 8px 16px; }
.resource-message-panel :deep(.ant-card-extra) { max-width: 100%; margin-inline-start: auto; }
.resource-message-actions { display: flex; align-items: center; justify-content: flex-end; gap: 12px; min-width: 0; }
.resource-message-actions :deep(.ant-segmented) { min-width: 0; max-width: 100%; overflow-x: auto; }
.resource-message-actions :deep(.ant-btn) { flex-shrink: 0; }
.resource-meta { color: var(--ant-color-text-tertiary, #8c8c8c); font-size: 12px; white-space: nowrap; }
.resource-trend-total { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; font-size: 12px; color: var(--ant-color-text-secondary, #666); }
.resource-trend-legend { display: inline-flex; align-items: center; gap: 6px; }
.resource-trend-total i { width: 8px; height: 8px; border-radius: 2px; background: var(--ant-color-primary, #1677ff); }
/* 画布缩放或卡头换行后，图表以正文剩余高度重绘，避免固定最小高度裁切底部。 */
.resource-chart { flex: 1; min-height: 0; overflow: hidden; }
@container resource-message (max-width: 620px) {
  .resource-message-panel :deep(.ant-card-extra) { flex-basis: 100%; }
  .resource-message-actions { justify-content: space-between; gap: 12px; }
}
</style>
