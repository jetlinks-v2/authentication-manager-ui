<template>
  <div class="home-content home-announcements" :class="{ 'home-announcements--timeline': chart.displayStyle === 'timeline' }">
    <button
      v-for="row in rows"
      :key="row.id"
      type="button"
      class="home-announcement"
      :disabled="!chart.navigation"
      :title="row.description || label(row)"
      @click="$emit('select', row)"
    >
      <div class="announcement-header">
        <span class="announcement-heading">
          <span class="announcement-title">{{ label(row) }}</span>
          <span v-if="row.isNew" class="announcement-tag">{{ t('packages.ProjectHome.new') }}</span>
        </span>
        <time v-if="chart.showDate && row.date" class="announcement-date">{{ row.date }}</time>
      </div>
      <span
        v-if="chart.showDescription && row.description"
        class="announcement-description"
      >
        {{ row.description }}
      </span>
    </button>
  </div>
</template>
<script setup lang="ts" name="ProjectHomeAnnouncementsView">
import { type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { HomeRow, HomeChart, HomeTarget } from '../../shared/types'
const props = defineProps({
  rows: { type: Array as PropType<HomeRow[]>, default: () => [] },
  chart: { type: Object as PropType<HomeChart>, required: true },
  canOpen: { type: Function as PropType<(target?: HomeTarget) => boolean>, required: true },
})
defineEmits<{ select: [row: HomeRow] }>()
const { t } = useI18n()
const label = (row: HomeRow) => row.label || t(`packages.ProjectHome.${row.labelKey}`)
</script>
<style scoped lang="less" src="../../shared/views.less" />
<style scoped lang="less">
.home-announcements {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  padding: 2px;
  box-sizing: border-box;
  overflow: auto;
}

.home-content .home-announcement {
  display: flex;
  align-items: stretch;
  flex-direction: column;
  gap: 5px;
  width: 100%;
  padding: 10px 12px;
  border: 0;
  border-radius: 6px;
  background: var(--home-card-surface);
  cursor: pointer;
  outline: none !important;
  text-align: left;
  line-height: 20px;
  transition: background-color 0.2s ease;

  &:hover:not(:disabled) {
    background: #f0f6ff;
    outline: none !important;

    .announcement-title {
      color: #1e72f0;
    }
  }

  &:focus,
  &:active {
    outline: none !important;
  }

  &:focus-visible {
    outline: 2px solid var(--business-component-primary) !important;
    outline-offset: -2px;
  }

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }
}

.announcement-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.announcement-heading {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.announcement-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 17px;
  padding: 0 5px;
  border-radius: 3px;
  background: #fff1e8;
  color: #f77234;
  font-family: Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 10px;
  font-weight: 600;
  line-height: 17px;
  flex-shrink: 0;
}

.announcement-title {
  min-width: 0;
  font-size: 14px;
  font-weight: 500;
  color: #1d2129;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s ease;
}

.announcement-description {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: var(--business-component-muted);
  font-size: 12px;
  line-height: 18px;
  white-space: normal;
}

.announcement-date {
  font-size: 12px;
  color: #86909c;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
</style>
