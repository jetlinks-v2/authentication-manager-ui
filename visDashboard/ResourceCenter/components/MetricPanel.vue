<template>
  <div v-if="kind === 'Collection'" class="collection">
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
import { useI18n } from 'vue-i18n'
import type { Metric, ResourceKind } from '../shared'
const props = defineProps<{ kind: ResourceKind; metrics: Metric[] }>()
const { t } = useI18n()
const colors = ['#52c41a', '#eb2f96', '#13c2c2', '#fa8c16']
const value = (key: string) => props.metrics.find(item => item.key === key)?.value?.toLocaleString() ?? '—'
</script>
<style scoped>
.primary { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
strong { font-size: 24px; font-weight: 400; line-height: 24px; font-variant-numeric: tabular-nums; }
.primary span,.secondary { font-size: 12px; color: var(--ant-color-text-secondary, #8c8c8c); }
.secondary { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 10px; line-height: 14px; }
.secondary i { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 4px; }
.secondary .online { color: #52c41a; }
.collection { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; }
.collection-item { background: #f7f8fa; border-radius: 10px; padding: 12px 14px; }
.collection-item > div { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 8px; }
.collect-icon { font-size: 16px; }.channel { color: #1677ff; }.collector { color: #722ed1; }
.collect-label { flex: 1; font-size: 12px; color: #4b5563; }
.abnormal { padding: 1px 6px; border-radius: 4px; background: #fff1f0; font-size: 11px; line-height: 13px; color: #ff4d4f; }
@container resource-widget (max-width: 480px) {
  .collection { grid-template-columns: 1fr; gap: 8px; }
  .collection-item { padding: 10px 14px; }
  .collection-item > div { margin-bottom: 6px; }
}
</style>
