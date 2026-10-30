<template>
  <main ref="overviewHost" class="project-overview" :class="isSaaS ? 'project-overview--saas' : 'project-overview--private'">
    <PrivateOverviewLayout v-if="!isSaaS" />
    <template v-else-if="saas">
      <div v-if="saas.loading.value" class="project-overview-state"><a-spin /></div>
      <a-result v-else-if="saas.errors.value.length" status="error" :title="t('projectOverview.loadError')">
        <template #extra><a-button @click="saas.reload">{{ t('projectOverview.retry') }}</a-button></template>
      </a-result>
      <template v-else>
        <SaasSummary class="project-overview-summary" />
        <SaasOverviewLayout :dashboard="saas.dashboard.value" :catalog="saas.catalog" :storage-key="saas.storageKey.value" />
      </template>
    </template>
  </main>
</template>
<script setup lang="ts" name="ProjectSideOverview">
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'
import { isSaaS } from '@jetlinks-web-core/utils/consts'
import { provideHomePolling } from '../../../visDashboard/Base/shared/homePollingContext'
import { useSaasOverviewDashboard } from './useSaasOverviewDashboard'
import SaasSummary from './SaasSummary.vue'
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
  margin-inline: auto;
  height: auto;
  min-height: 0;
  box-sizing: border-box;
}

/* 无侧栏时对齐顶部菜单起始位置，并在 2K/4K 大屏保持自适应留白 */
.basic-layout-page:not(:has(.ant-layout-sider)):not(:has(.project-secondary-menu .ant-tabs-left)) .project-overview {
  --overview-side-margin: clamp(24px, 12vw, 224px);
  width: 100%;
  max-width: none;
  padding: 0 calc(var(--overview-side-margin) - var(--space-4, 16px)) var(--space-4);
}

@media (min-width: 1600px) {
  .basic-layout-page:not(:has(.ant-layout-sider)):not(:has(.project-secondary-menu .ant-tabs-left)) .project-overview {
    --overview-side-margin: var(--sidebar-w, 224px);
  }
}

@media (min-width: 2560px) {
  .basic-layout-page:not(:has(.ant-layout-sider)):not(:has(.project-secondary-menu .ant-tabs-left)) .project-overview {
    --overview-side-margin: 256px;
  }
}

@media (min-width: 3200px) {
  .basic-layout-page:not(:has(.ant-layout-sider)):not(:has(.project-secondary-menu .ant-tabs-left)) .project-overview {
    --overview-side-margin: 336px;
  }
}
.project-overview-state { min-height: 30rem; display: grid; place-items: center; }
.project-overview-summary { margin-bottom: var(--space-4, 16px); }
.basic-layout-page:not(:has(.ant-layout-sider)):not(:has(.project-secondary-menu .ant-tabs-left)) .project-overview--saas {
  padding: 0 clamp(0px, calc((100vw - 1440px) / 4), 160px) var(--space-4, 16px);
}
.project-overview--saas, .project-overview--private {
  --business-component-text: var(--ink-1, #1f2329);
  --business-component-muted: var(--ink-3, #646c73);
  --business-component-primary: var(--accent, #1677ff);
  --home-card-surface: var(--bg-sunken, #f7f9fc);
}
.basic-layout-page:not(:has(.ant-layout-sider)):not(:has(.project-secondary-menu .ant-tabs-left)) .project-overview--private {
  padding: 0 0 var(--space-4, 16px);
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
