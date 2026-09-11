<template>
  <div class="home-resources-root" :class="{ 'home-resources-root--metrics': chart.displayStyle === 'metrics' }">
    <template v-if="chart.displayStyle === 'default'">
      <div class="resources-grid-container">
        <div class="resources-row">
          <DeviceAccessCard
            class="resource-card-access"
            :rows="rows"
            :show-icon="chart.showIcon"
            :can-open="canOpen"
            @navigate="open"
          />
          <VisualizationCard
            class="resource-card-visualization"
            :rows="rows"
            :show-icon="chart.showIcon"
            :can-open="canOpen"
            @navigate="open"
          />
        </div>
        <div class="resources-row">
          <AiCenterCard
            class="resource-card-ai"
            :rows="rows"
            :show-icon="chart.showIcon"
            :can-open="canOpen"
            @navigate="open"
          />
          <RuleEngineCard
            class="resource-card-rules"
            :rows="rows"
            :show-icon="chart.showIcon"
            :can-open="canOpen"
            @navigate="open"
          />
        </div>
      </div>
    </template>
    <template v-else>
      <div class="resources-metrics-grid">
        <ResourceItem
          v-for="row in rows"
          :key="row.id"
          metric
          :row="row"
          :show-icon="chart.showIcon"
          :can-open="canOpen"
          @navigate="open"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts" name="ProjectHomeResourcesView">
import type { PropType } from 'vue'
import DeviceAccessCard from './DeviceAccessCard.vue'
import VisualizationCard from './VisualizationCard.vue'
import AiCenterCard from './AiCenterCard.vue'
import RuleEngineCard from './RuleEngineCard.vue'
import ResourceItem from './ResourceItem.vue'
import type { HomeRow, HomeChart, HomeTarget } from '../../shared/types'

defineProps({
  rows: { type: Array as PropType<HomeRow[]>, default: () => [] },
  chart: { type: Object as PropType<HomeChart>, required: true },
  canOpen: { type: Function as PropType<(target?: HomeTarget) => boolean>, required: true },
  open: { type: Function as PropType<(target?: HomeTarget) => void>, required: true },
})
</script>

<style scoped lang="less">
.home-resources-root {
  width: 100%;
  height: 100%;
}

.resources-grid-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  height: 100%;
}

.resources-row {
  display: flex;
  gap: 16px;
  width: 100%;
  flex: 1;
  min-height: 0;
  align-items: stretch;
}

.resource-card-access {
  flex: 317;
  min-width: 0;
}

.resource-card-visualization {
  flex: 681;
  min-width: 0;
}

.resource-card-ai {
  flex: 1;
  min-width: 0;
}

.resource-card-rules {
  flex: 1;
  min-width: 0;
}

.resources-metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

@media (max-width: 900px) {
  .resources-row {
    flex-direction: column;
  }
}
</style>
