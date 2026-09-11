<template>
  <HomeWidget feature="Visualization" :info="info" :is-edit="isEdit">
    <template #default="{ rows, canOpen, open }">
      <div class="visualization-content">
        <div class="visualization-col">
          <ResourceItem
            v-for="row in assetRows(rows)"
            :key="row.id"
            :row="row"
            :can-open="canOpen"
            @navigate="open"
          />
        </div>
        <div class="visualization-col">
          <ResourceItem
            v-for="row in screenRows(rows)"
            :key="row.id"
            :row="row"
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
import type { HomeInfo, HomeRow } from "../shared/types"

withDefaults(defineProps<{ info?: HomeInfo; isEdit?: boolean }>(), { isEdit: false })

const assetRows = (rows: HomeRow[]) => rows.filter(r => r.subgroup === "assets")
const screenRows = (rows: HomeRow[]) => rows.filter(r => r.subgroup === "screens")
</script>
<style scoped lang="less">
.visualization-content {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  height: 100%;
  box-sizing: border-box;
}
.visualization-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
@media (max-width: 600px) {
  .visualization-content {
    grid-template-columns: 1fr;
  }
}
</style>
