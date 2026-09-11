<template>
  <section class="resource-card visualization-card">
    <h3 class="resource-card-title">{{ t('packages.ProjectHome.group_visualization') }}</h3>
    <div class="resource-card-content visualization-grid">
      <div class="visualization-col">
        <ResourceItem
          v-for="row in assetRows"
          :key="row.id"
          :row="row"
          :show-icon="showIcon"
          :can-open="canOpen"
          @navigate="$emit('navigate', $event)"
        />
      </div>
      <div class="visualization-col">
        <ResourceItem
          v-for="row in screenRows"
          :key="row.id"
          :row="row"
          :show-icon="showIcon"
          :can-open="canOpen"
          @navigate="$emit('navigate', $event)"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts" name="VisualizationCard">
import { computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import ResourceItem from './ResourceItem.vue'
import type { HomeRow, HomeTarget } from '../../shared/types'

const props = defineProps({
  rows: { type: Array as PropType<HomeRow[]>, default: () => [] },
  showIcon: { type: Boolean, default: true },
  canOpen: { type: Function as PropType<(target?: HomeTarget) => boolean>, required: true },
})

defineEmits<{ navigate: [target?: HomeTarget] }>()

const { t } = useI18n()

const assetRows = computed(() => props.rows.filter(r => r.group === 'visualization' && r.subgroup === 'assets'))
const screenRows = computed(() => props.rows.filter(r => r.group === 'visualization' && r.subgroup === 'screens'))
</script>

<style scoped lang="less">
.resource-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  box-shadow: 0 1px 3px rgba(17, 24, 39, 0.04);
  height: 100%;
}

.resource-card-title {
  font-size: 18px;
  font-weight: 600;
  line-height: 24px;
  color: #1d2129;
  margin: 0 0 16px 0;
  padding: 0;
}

.resource-card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.visualization-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  flex: 1;
}

.visualization-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  justify-content: flex-start;
}

@media (max-width: 640px) {
  .visualization-grid {
    grid-template-columns: 1fr;
  }
}
</style>
