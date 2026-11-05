<template>
  <PrivatePanel class="private-monitor" :title="t('privateOverview.health')" :state="{ loading, error, empty: !rows.length }" @retry="$emit('retry')">
    <template #extra>
      <div class="monitor-meta">
        <span v-if="version || rows.length" class="monitor-version">
          {{ version ? t('privateOverview.version', { version }) : '' }}
          <template v-if="version && rows.length"> · </template>
          {{ rows.length ? t('privateOverview.nodeCount', { count: rows.length }) : '' }}
        </span>
      <HomeWidgetLink v-if="canOpen(target)" @click="$emit('navigate', target)">{{ t('privateOverview.operations') }}</HomeWidgetLink></div>
    </template>
    <div class="private-monitor-table">
      <table>
        <thead><tr><th>{{ t('privateOverview.node') }}</th><th v-for="id in metricIds" :key="id">{{ t(`privateOverview.${id}`) }}</th></tr></thead>
        <tbody><tr v-for="node in rows" :key="node.id">
          <td><span class="node-name" :title="node.id">{{ node.id }}</span></td>
          <td v-for="cell in node.cells" :key="cell.id">
            <a-tooltip :title="cell.used !== undefined && cell.total !== undefined ? `${bytes(cell.used)} / ${bytes(cell.total)}` : undefined">
              <span class="monitor-metric"><span>{{ percent(cell.value) }}</span><a-progress v-if="cell.value !== undefined" :percent="cell.value" :show-info="false" :stroke-width="5" stroke-color="var(--business-component-primary, #1677ff)" /></span>
            </a-tooltip>
          </td>
        </tr></tbody>
      </table>
    </div>
  </PrivatePanel>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { HomeTarget } from '../../shared/types'
import type { MonitorOverviewRow } from '../usePrivateMonitor'
import PrivatePanel from './PrivatePanel.vue'
import HomeWidgetLink from '../../shared/HomeWidgetLink.vue'

defineProps<{ rows: MonitorOverviewRow[]; loading: boolean; error: boolean; version: string; target: HomeTarget; canOpen: (target?: HomeTarget) => boolean }>()
defineEmits<{ retry: []; navigate: [target?: HomeTarget] }>()
const { t } = useI18n()
const metricIds = ['cpu', 'memory', 'heap', 'disk']
const percent = (value?: number) => value === undefined || !Number.isFinite(value) ? '—' : `${value.toFixed(1)}%`
/** 仅格式化真实字节读数，缺失容量不推导为零。 */
function bytes(value: number) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(4, Math.max(0, Math.floor(Math.log(Math.max(1, value)) / Math.log(1024))))
  return `${(value / 1024 ** index).toFixed(1)} ${units[index]}`
}
</script>
<style scoped lang="less">
.monitor-meta { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 4px 8px; }
.monitor-version { color: var(--business-component-muted); font-size: 12px; }
.private-monitor-table { overflow: auto; max-height: 200px; }
table { width: 100%; min-width: 520px; table-layout: fixed; border-collapse: collapse; font-size: 12px; }
th { color: var(--business-component-muted); font-weight: 400; text-align: left; padding: 4px 5px 8px; white-space: nowrap; }
td { padding: 10px 5px; border-top: 1px solid var(--line, #f2f3f5); }
th:first-child, td:first-child { width: 28%; padding-left: 0; }
.node-name { display: block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.monitor-metric { display: flex; align-items: center; gap: 5px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.monitor-metric > span { flex: 0 0 42px; text-align: left; }
.monitor-metric :deep(.ant-progress) { flex: 1 1 0; width: auto; min-width: 0; margin: 0; line-height: 1; }
/* 缩窄后版本与节点信息另起一行，保留完整卡名和表格滚动区域。 */
@container (max-width: 479px) {
  .private-monitor :deep(.ant-card-head-wrapper) { flex-wrap: wrap; gap: 8px; }
  .private-monitor :deep(.ant-card-head-title) { flex: 1 1 100%; }
  .private-monitor :deep(.ant-card-extra) { width: 100%; margin-left: 0; }
  .private-monitor :deep(.monitor-meta) { justify-content: flex-start; }
}
</style>
