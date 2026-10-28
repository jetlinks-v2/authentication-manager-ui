<template>
  <div class="vision-ranking-content">
    <div v-if="state.loading" class="state"><a-spin /></div>
    <ResourceEmpty v-else-if="state.unsupported" class="state" icon="FundProjectionScreenOutlined"
      :title="t('resourceDashboard.visionRanking.unavailable')" :description="t('resourceDashboard.visionRanking.unavailableDescription')" />
    <ResourceEmpty v-else-if="state.error" class="state" :title="t('resourceDashboard.loadError')">
      <a-button size="small" @click="emit('retry')">{{ t('resourceDashboard.retry') }}</a-button>
    </ResourceEmpty>
    <ResourceEmpty v-else-if="!state.hasRows" class="state" icon="FundProjectionScreenOutlined"
      :title="t('resourceDashboard.visionRanking.empty')" :description="t('resourceDashboard.visionRanking.emptyDescription')" />
    <template v-else>
      <div v-if="state.metadataFailed" class="notice">{{ t('resourceDashboard.visionRanking.metadataFailed') }}</div>
      <slot />
    </template>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ResourceEmpty from './ResourceEmpty.vue'
defineProps<{ state: { loading: boolean; unsupported: boolean; error: boolean; hasRows: boolean; metadataFailed: boolean } }>()
const emit = defineEmits<{ retry: [] }>()
const { t } = useI18n()
</script>
<style scoped>
.vision-ranking-content { flex: 1; min-height: 0; overflow: auto; display: flex; flex-direction: column; }
.state { flex: 1; min-height: 160px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }
.notice { font-size: 12px; color: var(--ant-color-warning-text, #d48806); margin-bottom: 8px; }
</style>
