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
      <div class="announcement-main">
        <span v-if="row.isNew" class="announcement-tag">New</span>
        <span class="announcement-title">{{ label(row) }}</span>
      </div>
      <time v-if="chart.showDate && row.date" class="announcement-date">{{ row.date }}</time>
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
  gap: 16px;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.home-announcement {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  outline: none !important;
  text-align: left;
  line-height: 22px;
  transition: color 0.2s ease;

  &:hover:not(:disabled) {
    outline: none !important;

    .announcement-title {
      color: #1e72f0;
    }
  }

  &:focus,
  &:active,
  &:focus-visible {
    outline: none !important;
  }

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }
}

.announcement-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.announcement-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  height: 18px;
  line-height: 18px;
  border-radius: 11px 11px 11px 0;
  background: linear-gradient(135deg, #ff7d00 0%, #f7ba1e 100%);
  color: #ffffff;
  font-family: Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
}

.announcement-title {
  font-size: 14px;
  font-weight: 400;
  color: #1d2129;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s ease;
}

.announcement-date {
  font-size: 13px;
  color: #86909c;
  flex-shrink: 0;
  margin-left: 16px;
  white-space: nowrap;
}
</style>
