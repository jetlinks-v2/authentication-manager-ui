<template>
  <a-table class="gateway-node-table" size="small" row-key="id" :data-source="rows" :columns="columns"
    :pagination="false" :scroll="{ x: 440 }">
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'state'">
        <a-badge :status="record.stateBadge" :text="record.stateText" />
      </template>
      <div v-else-if="column.key === 'name'" class="node-identity">
        <a-button v-if="interactive" type="link" class="node-name" :title="record.name" @click="emit('select', record as GatewayTableRow)">{{ record.name }}</a-button>
        <span v-else class="node-name" :title="record.name">{{ record.name }}</span>
        <span v-if="record.productName" class="node-model" :title="record.productName">{{ record.productName }}</span>
      </div>
      <span v-else-if="!record.online" class="node-last-report">{{ record.lastReportText }}</span>
      <span v-else-if="column.key === 'cpu' || column.key === 'memory' || column.key === 'disk' || column.key === 'queue'"
        class="node-value" :class="{ 'is-missing': !record.metrics[column.key] }">{{ record.values[column.key] }}</span>
    </template>
  </a-table>
</template>

<script setup lang="ts">
import type { GatewayTableColumn, GatewayTableRow } from '../hooks/useGatewayStatus'

// 表格仅展示hook准备的状态和列合并规则，详情跳转由父级hook执行。
defineProps<{ rows: GatewayTableRow[]; columns: GatewayTableColumn[]; interactive: boolean }>()
const emit = defineEmits<{ select: [row: GatewayTableRow] }>()
</script>

<style scoped>
.gateway-node-table { min-height: 0; }
.gateway-node-table :deep(.ant-table) { font-size: 12px; background: transparent; }
.gateway-node-table :deep(.ant-table-thead > tr > th) { color: var(--ant-color-text-secondary, #8c8c8c); font-weight: 400; background: transparent; white-space: nowrap; }
.gateway-node-table :deep(.ant-table-tbody > tr > td) { padding-block: 12px; }
.gateway-node-table :deep(.ant-badge-status-text) { margin-inline-start: 5px; font-size: 12px; }
.node-identity { display: flex; min-width: 100px; flex-direction: column; gap: 4px; }
.node-name { display: block; max-width: 190px; height: auto; padding: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; font-size: 13px; color: var(--ant-color-text, #1d2939); }
.node-model { display: block; max-width: 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ant-color-text-secondary, #8c8c8c); font-size: 11px; }
.node-value { font-variant-numeric: tabular-nums; white-space: nowrap; }
.node-last-report, .is-missing { color: var(--ant-color-text-secondary, #8c8c8c); font-size: 12px; }
</style>
