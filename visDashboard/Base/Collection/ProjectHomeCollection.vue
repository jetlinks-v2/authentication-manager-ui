<template>
  <HomeWidget feature="Collection" :info="info" :is-edit="isEdit">
    <template #default="{ rows, chart, canOpen, open }">
      <div class="collection-list">
        <ResourceItem
          v-for="row in rows"
          :key="row.id"
          :row="row"
          :show-icon="chart.showIcon"
          :can-open="canOpen"
          @navigate="open"
        />
        <p class="capability-hint">{{ t('packages.ProjectHome.collectionHint') }}</p>
      </div>
    </template>
  </HomeWidget>
</template>
<script setup lang="ts">
import HomeWidget from "../shared/HomeWidget.vue"
import { useI18n } from 'vue-i18n'
import ResourceItem from "../shared/ResourceItem.vue"
import type { HomeInfo } from "../shared/types"

withDefaults(defineProps<{ info?: HomeInfo; isEdit?: boolean }>(), { isEdit: false })
const { t } = useI18n()
</script>
<style scoped lang="less">
.collection-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow: auto;
  box-sizing: border-box;
}
</style>
<style scoped>
.capability-hint { margin: 0; font-size: 12px; line-height: 18px; color: var(--business-component-muted); }
</style>
