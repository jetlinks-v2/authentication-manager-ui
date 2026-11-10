<template>
  <section v-if="state.available" class="vision-ranking resource-ranking" :aria-label="state.title">
    <header class="ranking-header">
      <h3>{{ state.title }}</h3>
      <div v-if="!state.noTasks" class="ranking-toolbar">
        <a-segmented v-model:value="state.metric" :options="state.tabs" size="small" class="ranking-switch" />
      </div>
    </header>
    <ResourceEmpty v-if="state.noTasks && !state.loading && !state.error" class="vision-task-empty"
      :title="t('resourceDashboard.visionRanking.noTasks')" :description="t('resourceDashboard.visionRanking.noTasksDescription')"
      :action-text="state.canConfigure ? t('resourceDashboard.visionRanking.configureTasks') : undefined" @action="state.configure()" />
    <template v-else>
      <div v-if="!state.loading && !state.error" class="ranking-caption"><span>{{ state.metricCaption }}</span><span>{{ state.countCaption }}</span></div>
      <VisionTaskRankingContent :state="contentState" @retry="state.refresh">
        <ResourceRankList :rows="state.cardRows" :interactive="state.canOpenDetail" @select="state.openTask" />
      </VisionTaskRankingContent>
    </template>
    <component :is="state.detailComponent" v-if="state.selected && state.canOpenDetail" :key="state.selected.id"
      :task="state.selected" @close="state.selected = undefined" />
  </section>
</template>
<script setup lang="ts">
import { computed, reactive, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import ResourceRankList from '../components/ResourceRankList.vue'
import ResourceEmpty from '../components/ResourceEmpty.vue'
import VisionTaskRankingContent from '../components/VisionTaskRankingContent.vue'
import { useVisionTaskRanking } from '../hooks/useVisionTaskRanking'
import type { ResourceInfo } from '../shared'
const props = withDefaults(defineProps<{ info?: ResourceInfo; isEdit?: boolean }>(), { isEdit: false })
const { t } = useI18n()
const state = reactive(useVisionTaskRanking(toRef(props, 'info'), toRef(props, 'isEdit')))
const contentState = computed(() => ({ loading: state.loading, error: state.error, unsupported: state.unsupported,
  hasRows: state.rows.length > 0, metadataFailed: state.metadataFailed, directoryIncomplete: state.directoryIncomplete }))
</script>
<style scoped src="../components/resourceRanking.css" />
<style scoped>
.vision-task-empty { min-height: 180px; }
.vision-ranking :deep(.track > span) { background: var(--ant-color-primary, #1677ff) !important; }
</style>
