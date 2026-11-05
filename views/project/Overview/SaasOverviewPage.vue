<template>
  <div ref="host" class="saas-overview-page">
    <PageRouteSkeleton v-if="overview.loading.value" />
    <a-result v-else-if="overview.errors.value.length" status="error" :title="t('projectOverview.loadError')">
      <template #extra><a-button @click="overview.reload">{{ t('projectOverview.retry') }}</a-button></template>
    </a-result>
    <SaasOverviewLayout v-else :dashboard="overview.dashboard.value" :catalog="overview.catalog" :storage-key="overview.storageKey.value" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageRouteSkeleton from '@jetlinks-web-core/components/PageRouteSkeleton/index.vue'
import { provideHomePolling } from '../../../visDashboard/Base/shared/homePollingContext'
import { useSaasOverviewDashboard } from './useSaasOverviewDashboard'
import SaasOverviewLayout from './SaasOverviewLayout.vue'

const host = ref<HTMLElement>()
const { t } = useI18n()
// 轮询与 SaaS 页面生命周期绑定，私有部署不会装配这组查询。
const overview = useSaasOverviewDashboard(host, provideHomePolling())
</script>

<style scoped>
.saas-overview-page { width: 100%; min-width: 0; }
</style>
