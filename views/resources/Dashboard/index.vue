<template>
  <main class="resource-dashboard">
    <div v-if="loading" class="resource-dashboard-state"><a-spin /></div>
    <a-result v-else-if="errors.length" status="error" :title="t('resourceDashboard.loadError')">
      <template #extra>
        <a-button @click="reload">{{ t('resourceDashboard.retry') }}</a-button>
      </template>
    </a-result>
    <DashBoardCanvas
      v-else
      :model-value="dashboard"
      :catalog="catalog"
      :editable="false"
      :layout-editable="true"
      storage-key="resource-center-dashboard-v3"
      :preview-mode="false"
    />
  </main>
</template>

<script setup lang="ts" name="ResourceCenterDashboard">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { DashBoardCanvas } from '@jetlinks-web-core/components/DashBoardCanvas'
import { useResourceDashboard } from './useResourceDashboard'

const { t } = useI18n()
// 正式页面只查询真实数据，布局与组件配置固定，交互边界与项目概览一致。
const { catalog, dashboard, loading, errors, reload } = useResourceDashboard(ref(false))
</script>

<style scoped>
.resource-dashboard {
  width: 100%;
  margin-inline: auto;
  height: auto;
  min-height: 0;
  box-sizing: border-box;
}
.resource-dashboard-state { min-height: 30rem; display: grid; place-items: center; }

/* 无侧栏时对齐顶部菜单起始位置，并在 2K/4K 大屏保持自适应留白 */
.basic-layout-page:not(:has(.ant-layout-sider)):not(:has(.project-secondary-menu .ant-tabs-left)) .resource-dashboard {
  --overview-side-margin: clamp(24px, 12vw, 224px);
  width: 100%;
  max-width: none;
  padding: 0 calc(var(--overview-side-margin) - var(--space-4, 16px)) var(--space-4);
}

@media (min-width: 1600px) {
  .basic-layout-page:not(:has(.ant-layout-sider)):not(:has(.project-secondary-menu .ant-tabs-left)) .resource-dashboard {
    --overview-side-margin: var(--sidebar-w, 224px);
  }
}

@media (min-width: 2560px) {
  .basic-layout-page:not(:has(.ant-layout-sider)):not(:has(.project-secondary-menu .ant-tabs-left)) .resource-dashboard {
    --overview-side-margin: 256px;
  }
}

@media (min-width: 3200px) {
  .basic-layout-page:not(:has(.ant-layout-sider)):not(:has(.project-secondary-menu .ant-tabs-left)) .resource-dashboard {
    --overview-side-margin: 336px;
  }
}
/* 由外层页面滚动，避免固定画布高度产生第二条滚动条。 */
.resource-dashboard :deep(.dashboard-card-layout),
.resource-dashboard :deep(.dashboard-card-content) {
  height: auto;
  overflow: visible;
}
.resource-dashboard :deep(.dashboard-card-content) { scrollbar-gutter: auto; }
.resource-dashboard :deep(.dashboard-grid) { min-height: 0; }
</style>
