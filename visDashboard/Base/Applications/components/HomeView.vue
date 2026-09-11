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
            <HomeIcon v-else name="applications" neutral />
          </span>
          <span class="home-app-content">
            <strong class="home-app-title">{{ label(row) }}</strong>
            <span v-if="chart.showDescription" class="home-muted home-description">{{ row.description || row.date || '--' }}</span>
          </span>
          <RightOutlined class="home-app-arrow" />
        </button>
      </span>
    </a-tooltip>
  </div>
</template>
<script setup lang="ts" name="ProjectHomeApplicationsView">
import { type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { RightOutlined } from '@ant-design/icons-vue'
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
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(90deg, #f0f6ff 0%, #fcfeff 100%);
  border: 1px solid #e5effd;
  border-radius: 4px;
  padding: 12px;
  color: inherit;
  cursor: pointer;
  text-align: left;
  box-sizing: border-box;
  transition: all .2s cubic-bezier(0.4, 0, 0.2, 1);
}
.home-app-icon {
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  border-radius: 4px;
  background: linear-gradient(135deg, #94bffe 0%, #1e72f0 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  transition: transform .2s ease;

  :deep(.home-icon) {
    width: 20px;
    height: 20px;
    color: #ffffff !important;
  }
}
.home-app:not(:disabled):hover,
.home-app-trigger:hover > .home-app:not(:disabled) {
  outline: 0;
  background: linear-gradient(90deg, #e4efff 0%, #f3f8ff 100%);
  border-color: #bfd9fe;
}
.home-app:not(:disabled):hover .home-app-icon,
.home-app-trigger:hover > .home-app:not(:disabled) .home-app-icon {
  transform: scale(1.05);
}
.home-app-arrow {
  margin-left: auto;
  flex-shrink: 0;
  color: #86909c;
  font-size: 14px;
  transition: all 0.2s ease;
}
.home-app:not(:disabled):hover .home-app-arrow,
.home-app-trigger:hover > .home-app:not(:disabled) .home-app-arrow {
  color: #1e72f0;
  transform: translateX(2px);
}
.home-app:disabled,
.home-app-trigger > .home-app:disabled {
  color: #b7bec8;
  cursor: not-allowed;
  opacity: 0.6;
}
.home-app:focus-visible {
  outline: 2px solid var(--business-component-primary);
  outline-offset: -2px;
}
.home-app-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}
.home-app-content strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1d2129;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}
.home-app-content .home-description {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: #86909c;
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
}
.home-app:disabled .home-app-content strong,
.home-app:disabled .home-app-content .home-description,
.home-app-trigger > .home-app:disabled .home-app-content strong,
.home-app-trigger > .home-app:disabled .home-app-content .home-description {
  color: #b7bec8;
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
