<template>
  <section class="resource-card visualization-card">
    <h3 class="resource-card-title">{{ t('packages.ProjectHome.group_visualization') }}</h3>
    <div class="resource-card-content visualization-grid" :class="{ 'is-private': !isSaaS }">
      <div v-for="(group, index) in groups" :key="group[0]?.id || index" class="visualization-col">
        <ResourceItem
          v-for="row in group"
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
import { isSaaS } from '@jetlinks-web-core/utils/consts'
import { visualizationGroups } from '../../shared/resources'

const props = defineProps({
  rows: { type: Array as PropType<HomeRow[]>, default: () => [] },
  showIcon: { type: Boolean, default: true },
  canOpen: { type: Function as PropType<(target?: HomeTarget) => boolean>, required: true },
})

defineEmits<{ navigate: [target?: HomeTarget] }>()

const { t } = useI18n()

const groups = computed(() => visualizationGroups(props.rows))
</script>

<style scoped lang="less">
.resource-card {
  background: #ffffff;
  border-radius: 6px;
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
  gap: var(--space-4);
  flex: 1;
}

.visualization-col {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}
.visualization-grid.is-private {
  grid-auto-rows: minmax(min-content, 1fr);
}
.visualization-grid.is-private > .visualization-col:last-child:nth-child(odd) {
  grid-column: 1 / -1;
}
.visualization-grid.is-private .visualization-col > :deep(*) {
  flex: 1;
}
.visualization-grid.is-private :deep(.resource-item-btn) {
  height: 100%;
}

@media (max-width: 640px) {
  .visualization-grid {
    grid-template-columns: 1fr;
  }
}
</style>
