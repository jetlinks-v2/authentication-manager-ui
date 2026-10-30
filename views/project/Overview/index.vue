<template>
  <main ref="overviewHost" class="project-overview" :class="isSaaS ? 'project-overview--saas' : 'project-overview--private'">
    <PrivateOverviewLayout v-if="!isSaaS" />
    <template v-else-if="saas">
      <div v-if="saas.loading.value" class="project-overview-state"><a-spin /></div>
      <a-result v-else-if="saas.errors.value.length" status="error" :title="t('projectOverview.loadError')">
        <template #extra><a-button @click="saas.reload">{{ t('projectOverview.retry') }}</a-button></template>
      </a-result>
      <SaasOverviewLayout v-else :dashboard="saas.dashboard.value" :catalog="saas.catalog" :storage-key="saas.storageKey.value" />
    </template>
  </main>
</template>
<script setup lang="ts" name="ProjectSideOverview">
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'
import { isSaaS } from '@jetlinks-web-core/utils/consts'
import { provideHomePolling } from '../../../visDashboard/Base/shared/homePollingContext'
import { useSaasOverviewDashboard } from './useSaasOverviewDashboard'
import SaasOverviewLayout from './SaasOverviewLayout.vue'
import PrivateOverviewLayout from './PrivateOverviewLayout.vue'

provideHomePolling()
const { t } = useI18n()
// 部署分支在装配前隔离，私有化不启动 SaaS 数据或旧画布的轮询。
const overviewHost = ref<HTMLElement>()
const saas = isSaaS ? useSaasOverviewDashboard(overviewHost) : undefined
</script>
<style scoped>
.project-overview {
  width: 100%;
  min-width: 0;
  margin-inline: auto;
  height: auto;
  min-height: 0;
  box-sizing: border-box;
}

/* 水平基础间距由外层页面提供，概览不再随屏幕宽度额外收窄。 */
.basic-layout-page:not(:has(.ant-layout-sider)):not(:has(.project-secondary-menu .ant-tabs-left)) .project-overview {
  padding: 0 0 var(--space-4, 16px);
}
.project-overview-state { min-height: 30rem; display: grid; place-items: center; }
.project-overview--saas, .project-overview--private {
  --business-component-text: var(--ink-1, #1f2329);
  --business-component-muted: var(--ink-3, #646c73);
  --business-component-primary: var(--accent, #1677ff);
  --home-card-surface: var(--bg-sunken, #f7f9fc);
}
/* 概览跟随网格内容自然撑高，由外层页面滚动，不在画布内创建第二个滚动容器。 */
.project-overview :deep(.dashboard-card-layout),
.project-overview :deep(.dashboard-card-content) {
  height: auto;
  overflow: visible;
}
.project-overview :deep(.dashboard-card-content) {
  scrollbar-gutter: auto;
}
.project-overview :deep(.dashboard-grid) {
  min-height: 0;
}
</style>
