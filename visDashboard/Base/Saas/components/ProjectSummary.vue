<template>
  <a-card class="saas-project-summary" :bordered="false">
    <div class="saas-project-summary-content">
      <div class="saas-project-copy">
        <h1>{{ summary.welcome }}</h1>
        <div v-if="summary.details.length" class="saas-user-details">
          <span v-for="(detail, index) in summary.details" :key="index" :title="detail">{{ detail }}</span>
        </div>
      </div>
      <span v-if="summary.updatedAt" class="saas-project-updated">{{ t('packages.ProjectHome.saasUpdatedAt', { time: summary.updatedAt }) }}</span>
    </div>
  </a-card>
</template>

<script setup lang="ts">
import { type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SaasUserSummary } from './presentation'

defineProps({
  summary: { type: Object as PropType<SaasUserSummary>, required: true },
})
const { t } = useI18n()
</script>

<style scoped lang="less">
.saas-project-summary { border-radius: var(--r-3, 8px); container-type: inline-size; }
.saas-project-summary :deep(.ant-card-body) { padding: 16px; }
.saas-project-summary-content { display: flex; align-items: center; justify-content: space-between; gap: 16px 24px; }
.saas-project-copy { flex: 1; min-width: 0; }
.saas-project-copy h1 { margin: 0; color: var(--business-component-text, #1f2329); font-size: 20px; line-height: 28px; font-weight: 600; overflow-wrap: anywhere; }
.saas-user-details { display: flex; flex-wrap: wrap; gap: 4px 0; margin-top: 4px; color: var(--business-component-muted, #646c73); font-size: 13px; line-height: 20px; }
.saas-user-details > span { min-width: 0; overflow-wrap: anywhere; }
.saas-user-details > span + span::before { content: '·'; margin: 0 10px; color: var(--business-component-muted, #646c73); }
.saas-project-updated { flex-shrink: 0; color: var(--business-component-muted, #646c73); font-size: 12px; line-height: 18px; }
@container (max-width: 699px) {
  .saas-project-summary-content { flex-direction: column; align-items: stretch; }
}
</style>
