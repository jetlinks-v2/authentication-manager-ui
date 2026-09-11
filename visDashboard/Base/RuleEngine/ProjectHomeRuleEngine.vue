<template>
  <HomeWidget feature="RuleEngine" :info="info" :is-edit="isEdit">
    <template #default="{ rows, canOpen, open }">
      <div class="rule-engine-list">
        <ResourceItem
          v-for="row in rows"
          :key="row.id"
          :row="row"
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

withDefaults(defineProps<{ info?: HomeInfo; isEdit?: boolean }>(), { isEdit: false })
</script>
<style scoped lang="less">
.rule-engine-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  box-sizing: border-box;
}
</style>
