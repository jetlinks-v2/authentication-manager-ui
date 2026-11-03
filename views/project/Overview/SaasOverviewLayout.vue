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
<style scoped>
.saas-overview-layout { width: 100%; min-width: 0; }
</style>
