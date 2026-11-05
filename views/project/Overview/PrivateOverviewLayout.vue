<template>
  <div ref="host" class="private-overview-layout">
    <div v-if="loading" class="private-overview-loading"><a-spin /></div>
    <a-result v-else-if="errors.length" status="error" :title="t('privateOverview.loadError')">
      <template #extra><a-button @click="reload">{{ t('privateOverview.retry') }}</a-button></template>
    </a-result>
    <DashBoardCanvas v-else :key="storageKey" :model-value="dashboard" :catalog="catalog"
      :editable="false" :layout-editable="true" :preview-mode="false" :storage-key="storageKey" />
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { DashBoardCanvas } from '@jetlinks-web-core/components/DashBoardCanvas'
import { usePrivateOverviewDashboard } from './private/usePrivateOverviewDashboard'
import { provideHomePolling } from '../../../visDashboard/Base/shared/homePollingContext'

const { t } = useI18n()
// 保留私有部署中共享业务卡片的轮询生命周期，不再依赖入口装配另一种部署。
provideHomePolling()
const host = ref<HTMLElement>()
const { loading, errors, reload, dashboard, catalog, storageKey } = usePrivateOverviewDashboard(host)
</script>
<style scoped>
.private-overview-layout { width: 100%; min-width: 0; }
.private-overview-loading { min-height: 400px; display: grid; place-items: center; }
</style>
