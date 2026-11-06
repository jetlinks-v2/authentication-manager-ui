<template>
  <section v-if="available" class="resource-vision-trend">
    <component :is="component" v-if="component" :title="config.title || t('resourceDashboard.VisionTaskRanking')"
      :gateways="directory.data || []" :enabled="enabled" :directory-loading="directory.loading && !directory.data"
      :directory-error="directory.error && !directory.data" />
    <ResourceEmpty v-else class="resource-vision-trend__state" :title="t('resourceDashboard.visionTrendUnavailable')" />
  </section>
</template>
<script setup lang="ts">
import { toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import ResourceEmpty from '../components/ResourceEmpty.vue'
import { useVisionTaskTrend } from './useVisionTaskTrend'
import type { ResourceInfo } from '../shared'
const props = withDefaults(defineProps<{ info?: ResourceInfo; isEdit?: boolean }>(), { isEdit: false })
const { t } = useI18n()
const { available, component, directory, enabled, config } = useVisionTaskTrend(toRef(props, 'info'), toRef(props, 'isEdit'))
</script>
<style scoped>
.resource-vision-trend { width: 100%; height: 100%; min-height: 0; }
.resource-vision-trend__state { display: flex; flex-direction: column; gap: var(--space-2, 8px); align-items: center; justify-content: center; height: 100%; }
</style>
