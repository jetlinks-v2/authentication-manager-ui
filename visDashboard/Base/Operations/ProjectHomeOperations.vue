<template>
  <HomeWidget feature="Operations" :info="info" :is-edit="isEdit" :refresh-key="refreshKey">
    <template #default="view"><HomeView v-bind="view" @navigate="view.open">
      <template #alarm="{ row }">
        <AlarmQuickEntry v-if="row.id === 'deviceAlarm' || row.id === 'visionAlarm'" :category="row.id"
          :title="t(`packages.ProjectHome.${row.id}`)" :count="row.value" :disabled="isEdit || !view.chart.navigation"
          @handled="refreshKey++" />
      </template>
    </HomeView></template>
  </HomeWidget>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AlarmQuickEntry from './components/AlarmQuickEntry.vue'
import HomeWidget from '../shared/HomeWidget.vue'
import HomeView from './components/HomeView.vue'
import type { HomeInfo } from '../shared/types'
const { t } = useI18n()
const refreshKey = ref(0)
withDefaults(defineProps<{ info?: HomeInfo; isEdit?: boolean }>(), { isEdit: false })
</script>
