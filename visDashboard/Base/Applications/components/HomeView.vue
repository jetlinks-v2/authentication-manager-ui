<template>
  <div class="home-content home-apps" :class="{ 'home-apps--cards': chart.displayStyle === 'cards' }">
    <a-tooltip
      v-for="row in rows"
      :key="row.id"
      :title="!canOpenApp(row) && !isOpening(row) ? t('packages.ProjectHome.unavailable') : undefined"
    >
      <span class="home-app-trigger">
        <button
          type="button"
          class="home-app"
          :disabled="!canOpenApp(row) || isOpening(row)"
          :aria-label="!canOpenApp(row) ? t('packages.ProjectHome.unavailable') : label(row)"
          @click="handleClick(row)"
        >
          <span class="home-app-icon">
            <a-spin v-if="isOpening(row)" size="small" />
            <HomeIcon v-else name="applications" :neutral="!canOpenApp(row)" />
          </span>
          <span class="home-app-content">
            <strong>{{ label(row) }}</strong>
            <span v-if="chart.showDescription" class="home-muted home-description">{{ row.description || row.date || '--' }}</span>
          </span>
        </button>
      </span>
    </a-tooltip>
  </div>
</template>
<script setup lang="ts" name="ProjectHomeApplicationsView">
import { type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import HomeIcon from '../../shared/HomeIcon.vue'
import type { HomeRow, HomeChart, HomeTarget } from '../../shared/types'
const props = defineProps({
  rows: { type: Array as PropType<HomeRow[]>, default: () => [] },
  chart: { type: Object as PropType<HomeChart>, required: true },
  canOpen: { type: Function as PropType<(row: HomeRow) => boolean>, default: undefined },
  openingIds: { type: Array as PropType<string[]>, default: () => [] },
})
const emit = defineEmits<{
  navigate: [target?: HomeTarget]
  open: [row: HomeRow]
}>()
const { t } = useI18n()
const label = (row: HomeRow) => row.label || (row.labelKey ? t(`packages.ProjectHome.${row.labelKey}`) : '')

const isOpening = (row: HomeRow) => props.openingIds?.includes(row.id) ?? false

const canOpenApp = (row: HomeRow) => {
  if (props.chart.navigation === false) return false
  if (props.canOpen) return props.canOpen(row)
  return row.application?.status !== 'disabled'
}

const handleClick = (row: HomeRow) => {
  if (!canOpenApp(row) || isOpening(row)) return
  emit('open', row)
}
</script>
<style scoped lang="less" src="../../shared/views.less" />
<style scoped lang="less">
.home-app-trigger { display: block; width: 100%; }
.home-apps--cards .home-app-trigger { display: flex; }
.home-app {
  width: 100%;
  border: 0;
  color: inherit;
  cursor: pointer;
  text-align: left;
  box-sizing: border-box;
  transition: background-color .18s ease;
}
.home-app-icon {
  transition: background-color .18s ease;
}
.home-app:not(:disabled):hover,
.home-app-trigger:hover > .home-app:not(:disabled) {
  outline: 0;
  background: #eef5ff;
  border-radius: 8px;
}
.home-app:not(:disabled):hover .home-app-icon,
.home-app-trigger:hover > .home-app:not(:disabled) .home-app-icon {
  background: #fff;
}
.home-app:disabled,
.home-app-trigger > .home-app:disabled {
  color: #b7bec8;
  cursor: not-allowed;
}
.home-app:disabled strong,
.home-app:disabled .home-description,
.home-app-trigger > .home-app:disabled strong,
.home-app-trigger > .home-app:disabled .home-description {
  color: #b7bec8;
}
.home-app:focus-visible {
  outline: 2px solid var(--business-component-primary);
  outline-offset: -2px;
}
.home-app-content strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.home-app-content .home-description {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
@container business-component-shell (min-width: 580px) {
  .home-apps:not(.home-apps--cards) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@container business-component-shell (min-width: 640px) {
  .home-apps--cards {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
