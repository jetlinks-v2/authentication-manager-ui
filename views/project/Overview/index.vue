<template>
  <main class="project-overview">
    <div v-if="loading" class="project-overview-state"><a-spin /></div>
    <a-result v-else-if="errors.length" status="error" :title="t('projectOverview.loadError')">
      <template #extra><a-button @click="reload">{{ t('projectOverview.retry') }}</a-button></template>
    </a-result>
    <DashBoardCanvas
      v-else
      :model-value="dashboard"
      :catalog="catalog"
      :editable="false"
      :layout-editable="true"
      storage-key="project-overview-v7"
      :preview-mode="false"
    />
  </main>
</template>
<script setup lang="ts" name="ProjectSideOverview">
import { useI18n } from 'vue-i18n'
import { DashBoardCanvas } from '@jetlinks-web-core/components/DashBoardCanvas'
import { useOverviewDashboard } from './useOverviewDashboard'

const { t } = useI18n()
const { catalog, loading, errors, reload, dashboard } = useOverviewDashboard()
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
