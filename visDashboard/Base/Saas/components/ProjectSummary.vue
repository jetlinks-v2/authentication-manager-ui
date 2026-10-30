<template>
  <a-card class="saas-project-summary" :bordered="false">
    <div class="saas-project-summary-content">
      <div class="saas-project-copy">
        <h1>{{ t('packages.ProjectHome.saasWelcome') }}</h1>
        <div v-if="summary.name || summary.id || summary.expiresAt" class="saas-project-meta">
          <strong v-if="summary.name">{{ summary.name }}</strong>
          <span v-if="summary.id" class="saas-project-id">{{ summary.id }}</span>
          <span v-if="summary.expiresAt">{{ t('packages.ProjectHome.saasExpiresOn', { date: summary.expiresAt }) }}</span>
        </div>
        <a-spin v-if="loading" size="small" />
        <a-button v-else-if="error" type="link" size="small" class="saas-project-retry" @click="$emit('reload')">{{ t('packages.ProjectHome.saasProjectRetry') }}</a-button>
      </div>
      <div class="saas-project-actions">
        <span v-if="summary.updatedAt" class="saas-project-updated">{{ t('packages.ProjectHome.saasUpdatedAt', { time: summary.updatedAt }) }}</span>
        <div class="saas-project-buttons">
          <a-button @click="$emit('renew')">{{ t('packages.ProjectHome.saasRenew') }}</a-button>
          <a-button @click="$emit('upgrade')">{{ t('packages.ProjectHome.saasUpgrade') }}</a-button>
        </div>
      </div>
    </div>
  </a-card>
</template>

<script setup lang="ts">
import { type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SaasProjectSummary } from './presentation'

defineProps({
  summary: { type: Object as PropType<SaasProjectSummary>, required: true },
  loading: Boolean,
  error: Boolean,
})
defineEmits<{ renew: []; upgrade: []; reload: [] }>()
const { t } = useI18n()
</script>

<style scoped lang="less">
.saas-project-summary { border-radius: var(--r-3, 8px); container-type: inline-size; }
.saas-project-summary :deep(.ant-card-body) { padding: 16px; }
.saas-project-summary-content { display: flex; align-items: center; justify-content: space-between; gap: 16px 24px; }
.saas-project-copy { flex: 1; min-width: 0; }
.saas-project-copy h1 { margin: 0; color: var(--business-component-text, #1f2329); font-size: 20px; line-height: 28px; font-weight: 600; }
.saas-project-meta { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 12px; margin-top: 10px; color: var(--business-component-muted, #646c73); font-size: 13px; line-height: 20px; overflow-wrap: anywhere; }
.saas-project-meta > * { display: inline-flex; align-items: baseline; gap: 12px; min-width: 0; }
.saas-project-meta > * + *::before { content: '·'; color: var(--business-component-muted, #646c73); font-weight: 400; }
.saas-project-retry { height: auto; margin-top: 6px; padding: 0; font-size: 12px; }
.saas-project-meta strong { color: var(--business-component-text, #1f2329); font-size: 14px; font-weight: 500; }
.saas-project-id { font-variant-numeric: tabular-nums; }
.saas-project-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
.saas-project-updated { color: var(--business-component-muted, #646c73); font-size: 12px; line-height: 18px; }
.saas-project-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
@container (max-width: 699px) {
  .saas-project-summary-content { flex-direction: column; align-items: stretch; }
  .saas-project-actions { align-items: flex-start; }
}
</style>
