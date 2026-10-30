<template>
  <div class="resource-rank-list">
    <button v-for="row in rows" :key="row.id" type="button" class="resource-rank-row"
      :disabled="!interactive || !row.detailAvailable" @click="emit('select', row)">
      <span class="rank" :class="`rank-${row.rank}`">{{ row.rank > 0 ? row.rank : '—' }}</span>
      <span class="identity">
        <span v-if="row.caption" class="caption">{{ row.caption }}</span>
        <JEllipsis class="name" :tooltip="{ title: row.tooltip }">{{ row.label }}</JEllipsis>
      </span>
      <span class="track" :class="{ 'track--empty': row.rank === 0 }">
        <span :style="{ width: `${row.width}%`, background: row.color }" />
      </span>
      <span class="value" :class="{ 'value--inactive': row.online === false }" :style="{ color: row.color }">{{ row.text }}</span>
      <RightOutlined v-if="interactive && row.detailAvailable" class="row-arrow" />
    </button>
  </div>
</template>
<script setup lang="ts" generic="Row extends ResourceRankRow">
import { Ellipsis as JEllipsis } from '@jetlinks-web/components'
import { RightOutlined } from '@ant-design/icons-vue'
import type { ResourceRankRow } from './resourceRank'
defineProps<{ rows: Row[]; interactive: boolean }>()
const emit = defineEmits<{ select: [row: Row] }>()
</script>
<style scoped>
.resource-rank-list { display: flex; flex-direction: column; gap: 2px; min-height: 0; overflow: auto; }
.resource-rank-row { display: grid; grid-template-columns: 20px minmax(0, 1fr) minmax(50px, 120px) 56px 12px; align-items: center; gap: 10px; width: 100%; min-height: 38px; padding: 4px 8px; border: 0; border-radius: 6px; background: transparent; color: #1d2939; font: inherit; text-align: left; cursor: pointer; flex-shrink: 0; transition: background-color .18s ease; }
.resource-rank-row:hover:not(:disabled) { background: #f7f9fc; }
.resource-rank-row:hover:not(:disabled) :deep(.name) { color: #1677ff; }
.resource-rank-row:hover:not(:disabled) .row-arrow { color: #1677ff; transform: translateX(2px); }
.resource-rank-row:disabled { cursor: default; }
.resource-rank-row:focus-visible { outline: 2px solid #1677ff; outline-offset: -2px; }
.rank { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; background: #f1f5f9; color: #64748b; font-size: 11px; font-weight: 600; line-height: 1; flex-shrink: 0; }
.rank-1, .rank-2, .rank-3 { background: #1677ff; color: #fff; }
.rank-0 { background: #f1f5f9; color: #94a3b8; font-weight: 500; }
.identity { display: flex; flex-direction: column; min-width: 0; gap: 1px; line-height: 14px; }
.caption { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #86909c; font-size: 11px; line-height: 15px; }
/* Ellipsis 的文本节点由 Tooltip 插槽生成，需从本地父节点命中其字体样式。 */
.identity :deep(.name) { font-family: inherit; font-size: 12.5px; font-weight: 500; line-height: 17px; color: #1d2939; transition: color .18s ease; }
.track { height: 6px; border-radius: 3px; overflow: hidden; background: #f1f5f9; }
.track--empty { background: transparent !important; }
.track > span { display: block; height: 100%; border-radius: inherit; background: #1677ff; }
.value { font-size: 12px; text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; color: #334155; }
/* 状态色由业务 hook 提供，非在线既可能是离线，也可能是禁用。 */
.value--inactive { font-weight: 500; }
.row-arrow { font-size: 10px; color: #94a3b8; transition: color .18s ease, transform .18s ease; }
</style>
