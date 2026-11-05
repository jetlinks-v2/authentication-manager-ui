<template>
  <HomeWidget feature="SaasResources" :info="info" :is-edit="isEdit">
    <template #extra="{ canOpen, open }">
      <HomeWidgetLink v-if="canOpen(SAAS_TARGETS.dashboard)" @click="open(SAAS_TARGETS.dashboard)">{{ $t('packages.ProjectHome.saasResourceDashboard') }}</HomeWidgetLink>
    </template>
    <template #default="view"><ResourceOverview :rows="view.rows" :can-open="view.canOpen" @navigate="view.open" /></template>
  </HomeWidget>
</template>
<script setup lang="ts">
import HomeWidget from '../shared/HomeWidget.vue'
import HomeWidgetLink from '../shared/HomeWidgetLink.vue'
import ResourceOverview from './components/ResourceOverview.vue'
import { SAAS_TARGETS } from './targets'
import type { HomeInfo } from '../shared/types'
withDefaults(defineProps<{ info?: HomeInfo; isEdit?: boolean }>(), { isEdit: false })
</script>
