<template>
  <ResourceEmpty
    v-if="kind === 'Collection' && isCollectionEmpty"
    icon="LineChartOutlined"
    :title="t('resourceDashboard.noCollectionTitle')"
    :description="t('resourceDashboard.noCollectionDesc')"
    :action-text="t('resourceDashboard.actionAddCollection')"
    @action="handleConfigCollection"
  />
  <div v-else-if="kind === 'Collection'" class="collection">
    <div v-for="key in ['channel', 'collector']" :key="key" class="collection-item">
      <div><AIcon class="collect-icon" :class="key" :type="key === 'channel' ? 'PartitionOutlined' : 'FundOutlined'" /><span class="collect-label">{{ t(`resourceDashboard.${key}`) }}</span><span class="abnormal">{{ t('resourceDashboard.abnormal') }} {{ value(`${key}Error`) }}</span></div>
      <strong>{{ value(key) }}</strong>
    </div>
  </div>
  <div v-else class="metric">
    <div class="primary"><strong>{{ value(kind === 'Visualization' ? 'screen' : 'total') }}</strong>
      <span>{{ t(`resourceDashboard.${kind === 'Visualization' ? 'screenCount' : kind === 'EdgeNodes' ? 'nodeCount' : kind === 'VideoDevices' ? 'videoCount' : 'deviceCount'}`) }}</span>
    </div>
    <div class="secondary">
      <span v-for="(item, index) in metrics.slice(1)" :key="item.key" :class="item.key">
        <i :style="{ background: item.key === 'offline' ? '#bfbfbf' : colors[index % colors.length] }" />
        {{ t(`resourceDashboard.${item.key}`) }} {{ item.failed ? '—' : item.value?.toLocaleString() }}
      </span>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { useI18n } from 'vue-i18n'
import type { Metric, ResourceKind } from '../shared'
import ResourceEmpty from './ResourceEmpty.vue'

const props = defineProps<{ kind: ResourceKind; metrics: Metric[] }>()
const { t } = useI18n()
const menuStore = useMenuStore()
const colors = ['#52c41a', '#eb2f96', '#13c2c2', '#fa8c16']

const isCollectionEmpty = computed(() => !props.metrics.length || props.metrics.every(m => !m.value || m.failed))

function handleConfigCollection() {
  if (menuStore.getMenu('data-collect')) {
    menuStore.jumpPage('data-collect')
  }
}

const value = (key: string) => {
  const item = props.metrics.find(m => m.key === key)
  if (item && !item.failed && typeof item.value === 'number') return item.value.toLocaleString()
  return '—'
}
</script>
<style scoped>
.metric { display: flex; flex-direction: column; justify-content: center; height: 100%; min-height: 0; }
.primary { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
strong { font-size: 24px; font-weight: 400; line-height: 24px; font-variant-numeric: tabular-nums; }
.primary span,.secondary { font-size: 12px; color: var(--ant-color-text-secondary, #8c8c8c); }
.secondary { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 10px; line-height: 14px; }
.secondary i { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 4px; }
.secondary .online { color: #52c41a; }
@container resource-widget (min-width: 360px) {
  .metric { flex-direction: row; align-items: center; justify-content: space-between; gap: 16px; }
  .secondary { margin-top: 0; }
}
.collection { display: flex; flex-direction: column; gap: 8px; height: 100%; }
.collection-item { background: #f7f8fa; border-radius: 10px; padding: 10px 14px; flex: 1; display: flex; flex-direction: column; justify-content: center; }
.collection-item > div { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.collect-icon { font-size: 16px; flex-shrink: 0; }.channel { color: #1677ff; }.collector { color: #722ed1; }
.collect-label { flex: 1; font-size: 13px; color: #1f2937; }
.abnormal { padding: 1px 6px; border-radius: 4px; background: #fff1f0; font-size: 11px; line-height: 14px; color: #ff4d4f; flex-shrink: 0; }
</style>
