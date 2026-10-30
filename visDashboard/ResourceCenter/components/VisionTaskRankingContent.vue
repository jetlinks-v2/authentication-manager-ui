<template>
  <div class="vision-ranking-content">
    <div v-if="state.loading" class="state"><a-spin /></div>
    <ResourceEmpty v-else-if="state.unsupported" class="state" icon="FundProjectionScreenOutlined"
      :title="t('resourceDashboard.visionRanking.unavailable')" :description="t('resourceDashboard.visionRanking.unavailableDescription')" />
    <ResourceEmpty v-else-if="state.error" class="state" :title="t('resourceDashboard.loadError')">
      <a-button size="small" @click="emit('retry')">{{ t('resourceDashboard.retry') }}</a-button>
    </ResourceEmpty>
    <ResourceEmpty v-else-if="!state.hasRows && state.directoryIncomplete" class="state"
      :title="t('resourceDashboard.visionRanking.unknownTasks')" :description="t('resourceDashboard.visionRanking.unknownTasksDescription')">
      <a-button size="small" @click="emit('retry')">{{ t('resourceDashboard.retry') }}</a-button>
    </ResourceEmpty>
    <ResourceEmpty v-else-if="!state.hasRows" class="state" icon="FundProjectionScreenOutlined"
      :title="t('resourceDashboard.visionRanking.empty')" :description="t('resourceDashboard.visionRanking.emptyDescription')" />
    <slot v-else />
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ResourceEmpty from './ResourceEmpty.vue'
defineProps<{ state: { loading: boolean; unsupported: boolean; error: boolean; hasRows: boolean; metadataFailed: boolean; directoryIncomplete?: boolean } }>()
const emit = defineEmits<{ retry: [] }>()
const { t } = useI18n()
</script>
<style scoped>
.vision-ranking-content { flex: 1; min-height: 0; overflow: auto; display: flex; flex-direction: column; }
.state { flex: 1; min-height: 160px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }
</style>
