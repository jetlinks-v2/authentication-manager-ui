<template>
  <div class="home-content home-actions" :class="{ 'home-actions--grid': chart.displayStyle === 'grid' }">
    <button
      v-for="row in rows"
      :key="row.id"
      class="home-action"
      :disabled="!canOpen(row.target)"
      :title="actionHint(row)"
      @click="$emit('navigate', row.target)"
    >
      <span v-if="chart.showIcon" class="home-action-icon-box" :class="getToneClass(row.id)">
        <HomeIcon :name="row.id === 'video' ? 'addVideo' : row.icon" neutral />
      </span>
      <span class="home-action-copy">
        <span class="home-action-label">{{ label(row) }}</span>
        <j-ellipsis v-if="chart.showDescription" class="home-action-description">{{ row.description || (row.descriptionKey ? t(`packages.ProjectHome.${row.descriptionKey}`) : '') }}</j-ellipsis>
      </span>
    </button>
  </div>
</template>
<script setup lang="ts" name="ProjectHomeQuickActionsView">
import { type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import HomeIcon from '../../shared/HomeIcon.vue'
import type { HomeRow, HomeChart, HomeTarget } from '../../shared/types'

const props = defineProps({
  rows: { type: Array as PropType<HomeRow[]>, default: () => [] },
  chart: { type: Object as PropType<HomeChart>, required: true },
  canOpen: { type: Function as PropType<(target?: HomeTarget) => boolean>, required: true },
})
defineEmits<{ navigate: [target?: HomeTarget] }>()
const { t } = useI18n()
const label = (row: HomeRow) => row.label || t(`packages.ProjectHome.${row.labelKey}`)
const actionHint = (row: HomeRow) => props.canOpen(row.target) ? label(row) : t('packages.ProjectHome.unavailable')

const getToneClass = (id: string) => {
  if (['video', 'createApplication', 'members'].includes(id)) return 'icon-box--cyan'
  if (['space', 'visionAlarm'].includes(id)) return 'icon-box--purple'
  return 'icon-box--blue'
}
</script>
<style scoped lang="less" src="../../shared/views.less" />
<style scoped lang="less">
.home-actions {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 16px;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
}

.home-action {
  background: linear-gradient(90deg, #eff6ff 0%, #fbfdff 100%);
  border: 1px solid #e5effd;
  border-radius: 4px;
  gap: 10px;
  padding: 8px 12px;
  text-align: left;

  &:hover:not(:disabled) {
    background: linear-gradient(90deg, #e4efff 0%, #f3f8ff 100%);
    border-color: #bfd9fe;
    color: #1e72f0;
  }
}
.home-action-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 2px; overflow: hidden; }
/* Ellipsis 的 Tooltip 根节点不透传 scoped 标记，需穿透到实际文本节点。 */
.home-action-copy :deep(.home-action-description) { width: 100%; min-width: 0; max-width: 100%; display: -webkit-box; -webkit-box-orient: vertical; white-space: normal; overflow: hidden; color: var(--business-component-muted); font-size: 12px; line-height: 18px; }
.home-actions { grid-template-columns: repeat(12, minmax(0, 1fr)); grid-template-rows: none; grid-auto-rows: minmax(76px, 1fr); gap: 10px; align-content: start; }
.home-action { grid-column: span 3; }
.home-action:nth-child(5):nth-last-child(3),
.home-action:nth-child(5):nth-last-child(3) ~ .home-action { grid-column: span 4; }
@container project-home (max-width: 640px) {
  .home-actions:not(.home-actions--grid) { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: none; }
  .home-actions:not(.home-actions--grid) .home-action { grid-column: auto; }
}

.home-action-icon-box {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  transition: transform 0.2s ease;

  &.icon-box--blue {
    background: linear-gradient(135deg, #a2c7ff 0%, #488ef6 52%, #1e72f0 100%);
  }

  &.icon-box--cyan {
    background: linear-gradient(135deg, #a2e0ff 0%, #48bcf6 52%, #1eaaf0 100%);
  }

  &.icon-box--purple {
    background: linear-gradient(135deg, #b6c9ff 0%, #6d87ff 52%, #4a59fe 100%);
  }

  :deep(.home-icon) {
    width: 16px;
    height: 16px;
    color: #ffffff !important;
  }
}

.home-action:not(:disabled):hover .home-action-icon-box {
  transform: scale(1.05);
}
</style>
