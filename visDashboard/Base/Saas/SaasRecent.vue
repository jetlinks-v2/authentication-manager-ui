<template>
  <a-card class="saas-recent-card" :title="t('saasRecent.title')" :bordered="false">
    <template #extra><span v-if="isStarting && rows.length" class="saas-recent-hint">{{ t('saasRecent.startHint') }}</span></template>
    <div v-if="rows.length" class="saas-recent-grid">
      <button v-for="row in rows" :key="row.id" type="button" class="saas-recent-item" :title="row.loadingTitle ? undefined : row.fullPath"
        :disabled="!!openingId" :aria-busy="openingId === row.id || row.loadingTitle" @click="open(row)">
        <span class="saas-recent-icon"><a-spin v-if="openingId === row.id" size="small" /><AIcon v-else :type="row.icon" /></span>
        <span class="saas-recent-copy">
          <SkeletonInput v-if="row.loadingTitle" class="saas-recent-name-skeleton" size="small" active />
          <span v-else class="saas-recent-name">{{ row.title }}</span>
          <span class="saas-recent-meta">{{ row.description }}</span>
        </span>
      </button>
    </div>
    <div v-else class="saas-recent-empty">{{ t('saasRecent.empty') }}</div>
  </a-card>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SkeletonInput } from 'ant-design-vue'
import { useSaasRecent } from './useSaasRecent'
const { t } = useI18n()
const { rows, isStarting, open, openingId } = useSaasRecent()
</script>
<style scoped>
.saas-recent-card { border-radius: var(--r-3, 8px); container: saas-recent / inline-size; }
.saas-recent-card :deep(.ant-card-head) { min-height: 46px; border-bottom: 1px solid var(--line, #f2f3f5); padding: 0 18px; font-size: 15px; }
.saas-recent-card :deep(.ant-card-head-title) { font-weight: 600; padding-block: 12px; }
.saas-recent-card :deep(.ant-card-body) { display: flex; flex-direction: column; padding: 12px 16px; }
.saas-recent-hint { font-size: 12px; color: var(--business-component-muted, #646c73); }
/* 所有入口始终单行均分宽度，长文本省略，不因容器变窄换行或产生横向滚动。 */
.saas-recent-grid { display: flex; flex-wrap: nowrap; flex-grow: 1; gap: 12px; min-width: 0; }
.saas-recent-item {
  flex: 1 1 0;
  box-sizing: border-box;
  border: 1px solid transparent;
  background: transparent;
  padding: 7px 10px;
  display: flex;
  gap: 10px;
  align-items: center;
  text-align: left;
  min-width: 0;
  overflow: hidden;
  cursor: pointer;
  border-radius: var(--r-2, 6px);
  color: inherit;
  font: inherit;
  transition: background-color 0.2s ease, border-color 0.2s ease;

  &:disabled { cursor: wait; opacity: .65; }

  &:hover:not(:disabled) {
    background: var(--home-card-surface, #f7f9fc);
    border-color: var(--jet-theme-border-secondary, #e8edf3);

    .saas-recent-name {
      color: var(--business-component-primary, #1677ff);
    }
    .saas-recent-icon {
      background: var(--business-component-primary, #1677ff);
      color: #ffffff;
      transform: scale(1.05);
    }
  }
  &:focus-visible {
    outline: 2px solid var(--business-component-primary, #1677ff);
    outline-offset: -2px;
  }
}
.saas-recent-icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  font-size: 16px;
  flex-shrink: 0;
  border-radius: var(--r-2, 6px);
  color: var(--business-component-primary, #1677ff);
  background: var(--accent-soft, #e8f3ff);
  transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}
.saas-recent-copy { display: flex; flex: 1; flex-direction: column; gap: 2px; min-width: 0; }
.saas-recent-name-skeleton { display: block; width: 100%; min-width: 0; height: 20px; line-height: 20px; }
.saas-recent-name-skeleton :deep(.ant-skeleton-input) { width: 100%; min-width: 0; height: 16px; vertical-align: middle; }
.saas-recent-name {
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--business-component-text, #1f2329);
  transition: color 0.2s ease;
}
.saas-recent-meta {
  font-size: 12px;
  line-height: 18px;
  color: var(--color-jet-gray-500, #8d9399);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.saas-recent-empty { color: var(--business-component-muted, #646c73); font-size: 13px; }
@container saas-recent (max-width: 560px) {
  .saas-recent-grid { gap: 6px; }
  .saas-recent-item { padding-inline: 4px; gap: 6px; }
  .saas-recent-icon { width: 24px; height: 24px; }
  .saas-recent-hint { display: none; }
}
</style>
