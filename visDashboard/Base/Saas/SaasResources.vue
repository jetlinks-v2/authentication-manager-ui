<template>
  <HomeWidget feature="SaasResources" :info="info" :is-edit="isEdit">
    <template #extra="{ canOpen, open }">
      <a-button v-if="canOpen(SAAS_TARGETS.dashboard)" type="link" size="small" @click="open(SAAS_TARGETS.dashboard)">{{ $t('packages.ProjectHome.saasResourceDashboard') }} ›</a-button>
    </template>
    <template #default="view"><ResourceOverview :rows="view.rows" :can-open="view.canOpen" @navigate="view.open" /></template>
  </HomeWidget>
</template>
<script setup lang="ts">
import HomeWidget from '../shared/HomeWidget.vue'
import ResourceOverview from './components/ResourceOverview.vue'
import { SAAS_TARGETS } from './targets'
import type { HomeInfo } from '../shared/types'
withDefaults(defineProps<{ info?: HomeInfo; isEdit?: boolean }>(), { isEdit: false })
</script>
