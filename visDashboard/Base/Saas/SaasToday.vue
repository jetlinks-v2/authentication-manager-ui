<template>
  <HomeWidget feature="SaasToday" :info="info" :is-edit="isEdit">
    <template #extra="{ rows }"><span v-if="todayWindowEnd(rows)" class="saas-day-window">{{ $t('packages.ProjectHome.saasTodayWindow', { time: todayWindowEnd(rows) }) }}</span></template>
    <template #default="view"><TodayOverview :rows="view.rows" :can-open="view.canOpen" @navigate="view.open" /></template>
  </HomeWidget>
</template>
<script setup lang="ts">
import HomeWidget from '../shared/HomeWidget.vue'
import TodayOverview from './components/TodayOverview.vue'
import { todayWindowEnd } from './services/presentation'
import type { HomeInfo } from '../shared/types'
withDefaults(defineProps<{ info?: HomeInfo; isEdit?: boolean }>(), { isEdit: false })
</script>
<style scoped>
.saas-day-window { color: var(--business-component-muted, #646c73); font-size: 12px; }
</style>
