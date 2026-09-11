<template>
  <HomeWidget feature="Resources" :info="info" :is-edit="isEdit" class="project-home-resources-widget">
    <template #default="view"><HomeView v-bind="view" /></template>
  </HomeWidget>
</template>
<script setup lang="ts">
import HomeWidget from '../shared/HomeWidget.vue'
import HomeView from './components/HomeView.vue'
import type { HomeInfo } from '../shared/types'
withDefaults(defineProps<{ info?: HomeInfo; isEdit?: boolean }>(), { isEdit: false })
</script>
<style scoped>
:deep(.project-home-shell[data-home-feature="Resources"]),
.project-home-resources-widget.project-home-shell {
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 0 !important;
}
:deep(.project-home-shell[data-home-feature="Resources"] > .ant-card-head),
.project-home-resources-widget.project-home-shell > :deep(.ant-card-head) {
  display: none !important;
}
:deep(.project-home-shell[data-home-feature="Resources"] > .ant-card-body),
.project-home-resources-widget.project-home-shell > :deep(.ant-card-body) {
  padding: 0 !important;
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
}
</style>
