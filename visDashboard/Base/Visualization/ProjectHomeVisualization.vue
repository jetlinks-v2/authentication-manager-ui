<template>
  <HomeWidget feature="Visualization" :info="info" :is-edit="isEdit">
    <template #default="{ rows, chart, canOpen, open }">
      <div class="visualization-content">
        <div class="visualization-col">
          <h4>{{ t('packages.ProjectHome.group_assets') }}</h4>
          <ResourceItem
            v-for="row in assetRows(rows)"
            :key="row.id"
            :row="row"
            :show-icon="chart.showIcon"
            :can-open="canOpen"
            @navigate="open"
          />
        </div>
        <div class="visualization-col">
          <h4>{{ t('packages.ProjectHome.group_screens') }}</h4>
          <ResourceItem
            v-for="row in screenRows(rows)"
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
import { useI18n } from 'vue-i18n'
import ResourceItem from "../shared/ResourceItem.vue"
import type { HomeInfo, HomeRow } from "../shared/types"

withDefaults(defineProps<{ info?: HomeInfo; isEdit?: boolean }>(), { isEdit: false })
const { t } = useI18n()

const assetRows = (rows: HomeRow[]) => rows.filter(r => r.subgroup === "assets")
const screenRows = (rows: HomeRow[]) => rows.filter(r => r.subgroup === "screens")
</script>
<style scoped lang="less">
.visualization-content {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  min-height: 0;
  overflow: auto;
  box-sizing: border-box;
}
.visualization-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
@container project-home (max-width: 460px) {
  .visualization-content {
    grid-template-columns: 1fr;
  }
}
.visualization-col h4 { margin: 0; color: var(--business-component-muted); font-size: 12px; font-weight: 500; }
</style>
