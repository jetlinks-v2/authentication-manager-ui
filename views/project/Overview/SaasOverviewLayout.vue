<template>
  <div class="saas-overview-layout">
    <DashBoardCanvas :key="storageKey" :model-value="dashboard" :catalog="catalog"
      :editable="false" :layout-editable="true" :preview-mode="false" :storage-key="storageKey" />
  </div>
</template>
<script setup lang="ts">
import { DashBoardCanvas, type DashboardCatalog, type DashboardValue } from '@jetlinks-web-core/components/DashBoardCanvas'

defineProps<{ dashboard: DashboardValue; catalog: DashboardCatalog; storageKey: string }>()
</script>
<style scoped lang="less">
.saas-overview-layout { width: 100%; min-width: 0; }
.saas-overview-layout :deep(.dashboard-card-layout),
.saas-overview-layout :deep(.dashboard-card-content) { height: auto; overflow: visible; }
.saas-overview-layout :deep(.dashboard-card-content) { scrollbar-gutter: auto; }
.saas-overview-layout :deep(.dashboard-grid) { min-height: 0; overflow-x: clip; overflow-y: visible; }
/* 画布控制卡片尺寸，超出内容在卡片正文内滚动，标题与拖拽手柄保持可见。 */
.saas-overview-layout :deep(.project-home-shell--saas),
.saas-overview-layout :deep(.saas-recent-card),
.saas-overview-layout :deep(.saas-utility-card) {
  display: flex; flex-direction: column; height: 100%; min-height: 0; overflow: hidden;
}
.saas-overview-layout :deep(.ant-card-head) { flex-shrink: 0; }
.saas-overview-layout :deep(.ant-card-body) { flex: 1; min-height: 0; overflow: auto; }
.saas-overview-layout :deep(.ant-card-body > *) { flex-shrink: 0; }
.saas-overview-layout :deep(.ant-card-body > .home-content) { flex: none; height: auto; overflow: visible; }
/* 统一概览画布内卡片外层留白，不改变列表项及按钮的内部间距。 */
.saas-overview-layout :deep(.project-home-shell--saas .ant-card-head),
.saas-overview-layout :deep(.saas-recent-card .ant-card-head),
.saas-overview-layout :deep(.saas-utility-card .ant-card-head) { min-height: 56px; padding: 16px 16px 8px; }
.saas-overview-layout :deep(.ant-card-head-title),
.saas-overview-layout :deep(.ant-card-extra),
.saas-overview-layout :deep(.saas-recent-card .ant-card-head-title) { padding-block: 0; }
.saas-overview-layout :deep(.project-home-shell--saas .ant-card-body) { padding: 16px !important; }
.saas-overview-layout :deep(.saas-recent-card .ant-card-body),
.saas-overview-layout :deep(.saas-utility-card .ant-card-body) { padding: 16px; }
/* 帮助列表在正文内滚动，正文的上下留白及滚动条与卡片边缘的距离保持不变。 */
.saas-overview-layout :deep(.saas-utility-card .ant-card-body) { display: flex; flex-direction: column; overflow: hidden; }
.saas-overview-layout :deep(.saas-utility-card .ant-card-body > .saas-help-list) { flex: 1 1 auto; min-height: 0; overflow-y: auto; }
/* 共享卡片的 SaaS 样式允许内容溢出；概览画布缩小时应在卡片内滚动。 */
.saas-overview-layout :deep(.project-home-shell--saas > .ant-card-body) { overflow: auto; }
/* 今日指标在正文内滚动，保留滚动区域外侧的 16px 留白。 */
.saas-overview-layout :deep(.project-home-shell--saas[data-home-feature="SaasToday"] > .ant-card-body) { overflow: hidden; }
.saas-overview-layout :deep(.project-home-shell--saas[data-home-feature="SaasToday"] .ant-card-body > .saas-today-container) {
  flex: 1 1 auto; min-height: 0; overflow-y: auto;
}
/* 应用卡片在可用高度内展示完整行，其他应用由“全部应用”入口承接。 */
.saas-overview-layout :deep(.project-home-shell--saas[data-home-feature="Applications"] .ant-card-body > .home-apps--saas) {
  flex: 1 1 0%; min-height: 0; height: auto; overflow: hidden; box-sizing: border-box;
}
</style>
