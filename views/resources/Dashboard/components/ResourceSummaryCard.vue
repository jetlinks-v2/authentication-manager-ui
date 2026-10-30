<template>
  <a-card
    size="small"
    class="resource-summary-card" :class="{ interactive: card.interactive }"
    :role="card.interactive ? 'link' : undefined" :tabindex="card.interactive ? 0 : undefined"
    :aria-label="card.label" :aria-busy="loading"
    @click="$emit('open', card)" @keydown.enter.self.prevent="$emit('open', card)" @keydown.space.self.prevent="$emit('open', card)"
  >
    <div class="summary-main">
      <div class="summary-identity">
        <div class="summary-title">{{ card.label }}</div>
        <a-skeleton v-if="loading && card.value === undefined" active :title="false" :paragraph="{ rows: 1, width: '70%' }" />
        <div v-else class="summary-value" :class="{ zero: card.value === 0 }" :title="`${card.valueText} ${card.unit}`">
          <strong>{{ card.valueText }}</strong><span>{{ card.unit }}</span>
        </div>
      </div>
      <span class="summary-icon"><AIcon :type="card.icon" /></span>
    </div>
    <div class="summary-footer">
      <div v-if="card.statuses.length" class="summary-statuses" :class="{ 'summary-statuses--assets': card.id === 'visualization' }">
        <span v-for="status in card.statuses" :key="status.key" class="summary-status" :title="`${status.label} ${status.valueText}`">
          <i v-if="card.id !== 'visualization' && card.id !== 'message' && card.id !== 'aiEvents'" class="status-dot" :class="status.tone" />
          <span class="status-label">{{ status.label }}</span>
          <strong>{{ loading && status.value === undefined ? '…' : status.valueText }}</strong>
        </span>
      </div>
    </div>
  </a-card>
</template>

<script setup lang="ts">
import type { ResourceSummaryCard } from '../resourceSummary.types'
import type { useResourceSummary } from '../useResourceSummary'

type SummaryView = ReturnType<typeof useResourceSummary>['cards']['value'][number]
// 单张资源卡只渲染共享查询结果；所有卡片共用页面内的一次统计订阅。
defineProps<{ card: SummaryView; loading: boolean; error: boolean }>()
defineEmits<{ open: [card: ResourceSummaryCard]; retry: [] }>()
</script>

<style scoped>
/* 使用资源页专属类名，避免其他业务页的全局 summary-card flex 样式收缩正文。 */
.resource-summary-card {
  container-type: inline-size;
  width: 100%;
  height: 100%;
  overflow: hidden;
  min-width: 0;
  background: var(--ant-color-bg-container, #ffffff);
  border: 1px solid var(--jet-theme-border-secondary, #e8edf3);
  border-radius: var(--r-3, 8px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  transition: all .2s cubic-bezier(0.4, 0, 0.2, 1);
}
.resource-summary-card :deep(.ant-card-body) {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 16px;
}
.resource-summary-card.interactive {
  cursor: pointer;
}
.resource-summary-card.interactive:hover {
  border-color: var(--jet-theme-primary, #1677ff);
  box-shadow: 0 4px 14px rgba(22, 119, 255, 0.08);
  transform: translateY(-1px);
}
.resource-summary-card.interactive:hover .summary-icon {
  transform: scale(1.05);
  background: #e6f4ff;
}
.resource-summary-card.interactive:focus-visible {
  outline: 2px solid var(--jet-theme-primary, #1677ff);
  outline-offset: 2px;
}
.summary-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
}
.summary-identity {
  min-width: 0;
  flex: 1;
}
.summary-title {
  color: var(--jet-theme-text-secondary, #64748b);
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
}
.summary-value {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  margin-top: 4px;
  white-space: nowrap;
}
.summary-value strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--jet-theme-text, #17243b);
  font-size: clamp(24px, 2.2cqw, 30px);
  line-height: 36px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.summary-value span {
  color: var(--jet-theme-text-secondary, #86909c);
  font-size: 12px;
}
.summary-value.zero strong {
  color: var(--jet-theme-text-tertiary, #86909c);
}
.summary-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 42px;
  height: 42px;
  border-radius: 10px;
  background: var(--jet-theme-primary-bg, #edf5ff);
  color: var(--jet-theme-primary, #1677ff);
  font-size: 20px;
  transition: transform .2s ease, background-color .2s ease;
}
.summary-footer {
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid #f0f2f5;
  min-height: 26px;
}
.summary-statuses {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 16px;
  min-width: 0;
}
.summary-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  font-size: 12px;
  white-space: nowrap;
}
.summary-status strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--jet-theme-text, #334155);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.status-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--jet-theme-text-secondary, #86909c);
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #94a3b8;
  flex: none;
}
.status-dot.success {
  background: var(--jet-theme-success, #52c41a);
  box-shadow: 0 0 0 2px rgba(82, 196, 26, 0.16);
}
.status-dot.error {
  background: var(--jet-theme-error, #ff4d4f);
  box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.16);
}
.summary-statuses--assets {
  overflow-x: auto;
}
.summary-statuses--assets .summary-status {
  flex: none;
}
</style>
