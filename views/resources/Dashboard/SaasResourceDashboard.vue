<template>
  <main ref="host" class="resource-dashboard" :class="{ 'resource-dashboard--few-nodes': fewNodes }">
    <div v-if="capabilities.loading.value || !ready" class="resource-dashboard-state"><a-spin /></div>
    <a-result v-else-if="capabilities.errors.value.length" status="error" :title="t('resourceDashboard.loadError')">
      <template #extra><a-button @click="capabilities.reload">{{ t('resourceDashboard.retry') }}</a-button></template>
    </a-result>
    <a-empty v-else-if="!hasContent" :description="t('resourcePage.empty')" class="resource-dashboard-state" />
    <DashBoardCanvas v-else :key="storageKey" :model-value="dashboard" :catalog="catalog"
      :editable="false" :layout-editable="true" :preview-mode="false" :storage-key="storageKey" />
  </main>
</template>

<script setup lang="ts" name="ResourceCenterDashboard">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useElementSize } from '@vueuse/core'
import { DashBoardCanvas } from '@jetlinks-web-core/components/DashBoardCanvas'
import { useResourcePage } from './useResourcePage'

const { t } = useI18n()
const host = ref<HTMLElement>()
const { width } = useElementSize(host)
const { capabilities, hasContent, catalog, dashboard, storageKey, ready, fewNodes } = useResourcePage(width)
</script>

<style scoped src="./resourcePage.css" />
