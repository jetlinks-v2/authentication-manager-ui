<template>
  <div class="overview-card-loading" aria-busy="true">
    <div class="overview-card-loading-title" aria-hidden="true"><SkeletonInput active size="small" /></div>
    <div class="overview-card-loading-body" aria-hidden="true">
      <Skeleton active :title="false" :paragraph="{ rows: 3, width: ['92%', '76%', '60%'] }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Skeleton, SkeletonInput } from 'ant-design-vue'
</script>

<style scoped>
/* 只占用画布已分配的格子，不参与业务数据和个人布局计算。 */
.overview-card-loading { display: flex; flex-direction: column; height: 100%; min-height: 0; overflow: hidden; border-radius: var(--r-3, .5rem); background: var(--ant-color-bg-container, #fff); }
.overview-card-loading-title { display: flex; align-items: center; flex: 0 0 3rem; padding-inline: var(--space-4, 1rem); border-bottom: 1px solid var(--line, #f2f3f5); }
.overview-card-loading-title :deep(.ant-skeleton-input) { width: 7rem; height: 1rem; }
.overview-card-loading-body { flex: 1; min-height: 0; overflow: hidden; padding: var(--space-4, 1rem); }
</style>
