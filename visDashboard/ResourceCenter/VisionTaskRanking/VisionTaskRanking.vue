<template>
  <section v-if="available" class="resource-vision-trend">
    <GatewayVisionTrend :title="config.title || t('resourceDashboard.VisionTaskRanking')"
      :scope="scope" :gateways="directory.data || []" :enabled="enabled" :directory-loading="directory.loading && !directory.data"
      :directory-error="directory.error && !directory.data" />
  </section>
</template>
<script setup lang="ts">
import { toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import GatewayVisionTrend from './trend/GatewayVisionTrend.vue'
import { useVisionTaskTrend } from './useVisionTaskTrend'
import type { ResourceInfo } from '../shared'
const props = withDefaults(defineProps<{ info?: ResourceInfo; isEdit?: boolean }>(), { isEdit: false })
const { t } = useI18n()
const { available, directory, enabled, config, scope } = useVisionTaskTrend(toRef(props, 'info'), toRef(props, 'isEdit'))
</script>
<style scoped>
.resource-vision-trend { width: 100%; height: 100%; min-height: 0; }
.resource-vision-trend__state { display: flex; flex-direction: column; gap: var(--space-2, 8px); align-items: center; justify-content: center; height: 100%; }
</style>
