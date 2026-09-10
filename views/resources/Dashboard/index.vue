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
      :preview-mode="false"
    />
  </main>
</template>

<script setup lang="ts" name="ResourceCenterDashboard">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { DashBoardCanvas } from '@jetlinks-web-core/components/DashBoardCanvas'
import { useResourceDashboard } from '../../../visDashboard/ResourceCenter/useResourceDashboard'

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
  padding: var(--space-4);
  box-sizing: border-box;
}
.resource-dashboard-state { min-height: 30rem; display: grid; place-items: center; }
/* 无左侧菜单时与概览保持相同的居中留白。 */
.basic-layout-page:not(:has(.ant-layout-sider)):not(:has(.project-secondary-menu .ant-tabs-left)) .resource-dashboard {
  width: 90%;
  max-width: 1440px;
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
