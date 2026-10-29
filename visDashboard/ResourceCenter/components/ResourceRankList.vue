<template>
  <div class="resource-rank-list">
    <button v-for="row in rows" :key="row.id" type="button" class="resource-rank-row"
      :disabled="!interactive || !row.detailAvailable" @click="emit('select', row)">
      <span class="rank" :class="`rank-${row.rank}`">{{ row.rank }}</span>
      <span class="identity">
        <span v-if="row.caption" class="caption">{{ row.caption }}</span>
        <JEllipsis class="name" :tooltip="{ title: row.tooltip }">{{ row.label }}</JEllipsis>
      </span>
      <span class="track"><span :style="{ width: `${row.width}%`, background: row.color }" /></span>
      <span class="value" :style="{ color: row.color }">{{ row.text }}</span>
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
.resource-rank-row { display: grid; grid-template-columns: 18px minmax(0, 1.1fr) minmax(32px, 1fr) 58px 10px; align-items: center; gap: 7px; width: 100%; min-height: 34px; padding: 2px 5px; border: 0; border-radius: 6px; background: transparent; color: #1d2939; font: inherit; text-align: left; cursor: pointer; flex-shrink: 0; }
.resource-rank-row:hover:not(:disabled) { background: #f7f8fa; }
.resource-rank-row:disabled { cursor: default; }
.resource-rank-row:focus-visible { outline: 2px solid #1677ff; outline-offset: -2px; }
.rank { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 50%; background: #98a2b3; color: #fff; font-size: 10px; font-weight: 600; }
.rank-1 { background: #ff4d4f; }
.rank-2 { background: #faad14; }
.rank-3 { background: #1677ff; }
.identity { display: flex; flex-direction: column; min-width: 0; gap: 1px; line-height: 13px; }
.caption { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #86909c; font-size: 9.5px; }
/* Ellipsis 的文本节点由 Tooltip 插槽生成，需从本地父节点命中其字体样式。 */
.identity :deep(.name) { font-family: inherit; font-size: 11px; font-weight: 600; line-height: 13px; }
.track { height: 5px; border-radius: 4px; overflow: hidden; background: #f0f1f3; }
.track > span { display: block; height: 100%; border-radius: inherit; background: #1677ff; }
.value { font-size: 10.5px; text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.row-arrow { font-size: 9px; color: #86909c; }
</style>
