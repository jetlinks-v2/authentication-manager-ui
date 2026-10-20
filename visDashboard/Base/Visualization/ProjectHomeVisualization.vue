<template>
  <HomeWidget feature="Visualization" :info="info" :is-edit="isEdit">
    <template #default="{ rows, chart, canOpen, open }">
      <div class="visualization-content" :class="{ 'is-private': !isSaaS }">
        <div v-for="(group, index) in visualizationGroups(rows)" :key="group[0]?.id || index" class="visualization-col">
          <ResourceItem
            v-for="row in group"
            :key="row.id"
            :row="row"
            :show-icon="chart.showIcon"
            :can-open="canOpen"
            @navigate="open"
          />
        </div>
      </div>
    </template>
  </HomeWidget>
</template>
<script setup lang="ts">
import HomeWidget from "../shared/HomeWidget.vue"
import ResourceItem from "../shared/ResourceItem.vue"
import type { HomeInfo } from "../shared/types"
import { isSaaS } from "@jetlinks-web-core/utils/consts"
import { visualizationGroups } from "../shared/resources"

withDefaults(defineProps<{ info?: HomeInfo; isEdit?: boolean }>(), { isEdit: false })
</script>
<style scoped lang="less">
.visualization-content {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
  min-height: 0;
  overflow: auto;
  box-sizing: border-box;
}
.visualization-col {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
}
.visualization-content.is-private {
  grid-auto-rows: minmax(min-content, 1fr);
  flex: 1;
}
.visualization-content.is-private > .visualization-col:last-child:nth-child(odd) {
  grid-column: 1 / -1;
}
.visualization-content.is-private .visualization-col > :deep(*) {
  flex: 1;
}
.visualization-content.is-private :deep(.resource-item-btn) {
  height: 100%;
}
@container project-home (max-width: 460px) {
  .visualization-content {
    grid-template-columns: 1fr;
  }
}
</style>
