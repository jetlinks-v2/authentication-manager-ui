<template>
  <HomeWidget feature="Quotas" :info="info" :is-edit="isEdit">
    <template #default="view"><HomeView v-bind="view" @navigate="view.open" /></template>
  </HomeWidget>
</template>
<script setup lang="ts">
import HomeWidget from '../shared/HomeWidget.vue'
import HomeView from './components/HomeView.vue'
import type { HomeInfo } from '../shared/types'
withDefaults(defineProps<{ info?: HomeInfo; isEdit?: boolean }>(), { isEdit: false })
</script>
