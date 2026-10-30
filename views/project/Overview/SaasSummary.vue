<template>
  <div class="saas-summary">
    <ProjectSummary :summary="summary" />
  </div>
</template>
<script setup lang="ts">
import ProjectSummary from '../../../visDashboard/Base/Saas/components/ProjectSummary.vue'
import { useSaasSummary } from './useSaasSummary'
const { summary } = useSaasSummary()
</script>
<style scoped>
.saas-summary { height: 100%; min-height: 0; }
/* 由容器垂直居中，内容不加外边距；缩小卡片时从顶部滚动查看完整内容。 */
.saas-summary :deep(.ant-card-body) { display: flex; flex-direction: column; justify-content: safe center; }
</style>
