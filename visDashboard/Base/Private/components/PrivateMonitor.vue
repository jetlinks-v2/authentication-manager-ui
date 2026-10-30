<template>
  <PrivatePanel :title="t('privateOverview.health')" :state="{ loading, error, empty: !rows.length }" @retry="$emit('retry')">
    <template #extra>
      <div class="monitor-meta"><span v-if="version" class="monitor-version">{{ t('privateOverview.version', { version }) }}</span>
      <span v-if="rows.length" class="monitor-version">{{ t('privateOverview.nodeCount', { count: rows.length }) }}</span>
      <a-button v-if="canOpen(target)" type="link" size="small" @click="$emit('navigate', target)">{{ t('privateOverview.operations') }} ›</a-button></div>
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
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th { color: var(--business-component-muted); font-weight: 400; text-align: left; padding: 4px 5px 8px; white-space: nowrap; }
td { padding: 10px 5px; border-top: 1px solid var(--line, #f2f3f5); }
th:first-child, td:first-child { padding-left: 0; }
.node-name { display: block; max-width: 145px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.monitor-metric { display: flex; align-items: center; gap: 5px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.monitor-metric > span { min-width: 42px; text-align: right; }
.monitor-metric :deep(.ant-progress) { width: 30px; min-width: 20px; margin: 0; line-height: 1; }
</style>
