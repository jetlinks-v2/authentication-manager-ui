<template>
  <a-card class="resource-panel resource-collection-summary" :title="card.label" size="small" :aria-busy="loading">
    <template #extra>
      <a-button v-if="card.interactive" type="link" size="small" class="action-link" @click="$emit('open', card)">
        {{ t('resourceDashboard.supplemental.channelLink') }}<RightOutlined class="action-arrow" />
      </a-button>
    </template>
    <a-skeleton v-if="loading && card.value === undefined" active :title="false" :paragraph="{ rows: 3 }" />
    <template v-else>
      <div class="collection-summary__total" :title="`${card.valueText} ${card.unit}`">
        <strong>{{ card.valueText }}</strong><span>{{ card.unit }}</span>
      </div>
      <ResourceDistributionBars :rows="card.distributionRows" />
      <div v-if="!loading && (error || card.hasError)" class="collection-summary__error">
        <a-tooltip :title="error ? t('resourcePage.summary.loadError') : card.errorText">
          <a-button type="link" size="small" @click="$emit('retry')">{{ t('resourceDashboard.retry') }}</a-button>
        </a-tooltip>
      </div>
    </template>
  </a-card>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RightOutlined } from '@ant-design/icons-vue'
import ResourceDistributionBars from './ResourceDistributionBars.vue'
import type { ResourceSummaryCard } from '../resourceSummary.types'
import type { useResourceSummary } from '../useResourceSummary'

type SummaryView = ReturnType<typeof useResourceSummary>['cards']['value'][number]
// 展示通道状态明细，查询及导航仍由资源页统一管理。
defineProps<{ card: SummaryView; loading: boolean; error: boolean }>()
defineEmits<{ open: [card: ResourceSummaryCard]; retry: [] }>()
const { t } = useI18n()
</script>

<style scoped>
.resource-collection-summary { container: supplemental / inline-size; }
.resource-collection-summary :deep(.ant-card-body) { gap: 0; }
/* 卡片正文带有零高度的清浮动伪元素，避免 flex gap 为其额外占用两处间距。 */
.collection-summary__total { display: flex; align-items: baseline; gap: 6px; min-width: 0; margin-bottom: 2px; line-height: 30px; }
.collection-summary__total strong { overflow: hidden; text-overflow: ellipsis; color: var(--ant-color-text, #17243b); font-size: 26px; line-height: 30px; font-weight: 600; font-variant-numeric: tabular-nums; }
.collection-summary__total span { color: var(--ant-color-text-secondary, #8c8c8c); font-size: 12px; }
.collection-summary__error { text-align: right; }
.collection-summary__error :deep(.ant-btn) { height: auto; padding: 0; font-size: 12px; }
</style>
