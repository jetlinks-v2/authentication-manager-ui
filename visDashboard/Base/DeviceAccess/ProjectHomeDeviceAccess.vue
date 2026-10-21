<template>
  <HomeWidget feature="DeviceAccess" :info="info" :is-edit="isEdit">
    <template #default="{ rows, chart, canOpen, open }">
      <div class="device-access-list" :class="{ 'is-private': !isSaaS }">
        <ResourceItem
          v-for="row in rows"
          :key="row.id"
          :row="row"
          :show-icon="chart.showIcon"
          :can-open="canOpen"
          @navigate="open"
        />
      </div>
    </template>
  </HomeWidget>
</template>
<script setup lang="ts">
import HomeWidget from "../shared/HomeWidget.vue"
import ResourceItem from "../shared/ResourceItem.vue"
import type { HomeInfo } from "../shared/types"
import { isSaaS } from "@jetlinks-web-core/utils/consts"

withDefaults(defineProps<{ info?: HomeInfo; isEdit?: boolean }>(), { isEdit: false })
</script>
<style scoped lang="less">
.device-access-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow: auto;
  box-sizing: border-box;
}
.device-access-list.is-private {
  flex: 1;
  gap: var(--space-3);
}
.device-access-list.is-private > :deep(*) {
  flex: 1 0 auto;
}
.device-access-list.is-private :deep(.resource-item-btn) {
  height: 100%;
}
</style>
