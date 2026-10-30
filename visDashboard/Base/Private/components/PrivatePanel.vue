<template>
  <a-card class="private-overview-panel" :bordered="false">
    <template #title>
      <div class="private-panel-heading"><h2>{{ title }}</h2><slot name="title-extra" /></div>
    </template>
    <template v-if="$slots.extra" #extra><slot name="extra" /></template>
    <div v-if="state?.loading" class="private-panel-state"><a-spin /></div>
    <div v-else-if="state?.error" class="private-panel-state">
      <CloudEmpty :description="t('privateOverview.loadError')" :image-style="{ height: '48px' }">
        <a-button size="small" @click="$emit('retry')">{{ t('privateOverview.retry') }}</a-button>
      </CloudEmpty>
    </div>
    <div v-else-if="state?.empty" class="private-panel-state">
      <slot name="empty"><CloudEmpty :description="t('privateOverview.empty')" :image-style="{ height: '48px' }" /></slot>
    </div>
    <slot v-else />
  </a-card>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import CloudEmpty from '@jetlinks-web-core/components/CloudEmpty/index.vue'

defineProps<{ title: string; state?: { loading?: boolean; error?: boolean; empty?: boolean } }>()
defineEmits<{ retry: [] }>()
const { t } = useI18n()
</script>

<style scoped lang="less">
.private-overview-panel {
  display: flex; flex-direction: column; min-width: 0; height: 100%;
  border: 1px solid var(--line, #e5e6eb); border-radius: var(--r-3, 8px);
  background: var(--ant-color-bg-container, #fff); container-type: inline-size;
  :deep(.ant-card-head) { flex: none; min-height: 56px; padding: 16px 16px 8px; border-bottom: 1px solid var(--line, #f2f3f5); }
  :deep(.ant-card-head-wrapper) { gap: 12px; }
  :deep(.ant-card-head-title) { padding: 0; min-width: 0; }
  :deep(.ant-card-extra) { padding: 0; min-width: 0; }
  :deep(.ant-card-body) { flex: 1; display: flex; flex-direction: column; min-width: 0; min-height: 0; padding: 16px; }
  :deep(.ant-card-body::before), :deep(.ant-card-body::after) { display: none; }
  :deep(.ant-btn-link) { height: auto; padding: 0; font-size: 12px; line-height: 20px; color: var(--business-component-muted, #646c73); }
  :deep(.ant-btn-link:hover:not(:disabled)) { color: var(--business-component-primary, #1677ff); }
}
.private-panel-heading { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; min-width: 0; }
.private-panel-heading h2 { margin: 0; color: var(--business-component-text, #1f2329); font-size: 15px; font-weight: 600; line-height: 22px; }
.private-panel-state { display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: center; min-height: 110px; padding: 8px; color: var(--business-component-muted, #646c73); font-size: 13px; text-align: center; }
.private-panel-state :deep(.ant-empty) { margin: 0; }
.private-panel-state :deep(.ant-empty-footer) { margin-top: 10px; }
</style>
