<template>
  <div class="home-content home-announcements" :class="{ 'home-announcements--timeline': chart.displayStyle === 'timeline', 'home-announcements--saas': chart.displayStyle === 'saas' }">
    <button
      v-for="row in rows"
      :key="row.id"
      type="button"
      class="home-announcement"
      :class="{ 'home-announcement--unread': row.readState === 'unread', 'home-announcement--read': row.readState === 'read' }"
      :disabled="!chart.navigation"
      :title="row.description || label(row)"
      @click="$emit('select', row)"
    >
      <div class="announcement-header">
        <span class="announcement-heading">
          <a-tag v-if="chart.displayStyle === 'saas' && row.announcementType" class="announcement-type"
            :style="{ '--announcement-type-color': row.announcementType.color }">{{ row.announcementType.text }}</a-tag>
          <span class="announcement-title">{{ label(row) }}</span>
          <span v-if="chart.displayStyle !== 'saas' && row.isNew" class="announcement-tag">{{ t('packages.ProjectHome.new') }}</span>
        </span>
        <span v-if="chart.displayStyle === 'saas' && chart.showDescription && row.description" class="announcement-excerpt">{{ row.description }}</span>
        <time v-if="chart.showDate && row.date" class="announcement-date">{{ row.date }}</time>
      </div>
      <span
        v-if="chart.displayStyle !== 'saas' && chart.showDescription && row.description"
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

/* SaaS 以类型和标题字重表达主题与阅读状态，保留既有行间距与 hover 范围。 */
.home-announcements.home-announcements--saas { gap: 4px; padding: 4px 0; height: auto; overflow: visible; }
.home-announcements--saas .home-announcement {
  position: relative;
  justify-content: center;
  min-height: 40px;
  padding: 8px 12px;
  margin: 0;
  border-radius: var(--r-2, 6px);
  border: 0;
  background: transparent;
  transition: background-color 0.2s ease;
  &:hover:not(:disabled) {
    background: var(--home-card-surface, #f7f9fc);
    .announcement-title { color: var(--business-component-primary, #1677ff); }
  }
}
.home-announcements--saas .announcement-header { align-items: center; gap: 10px; }
.home-announcements--saas .announcement-title { font-size: 13px; font-weight: 400; transition: color 0.2s ease; }
.home-announcements--saas .announcement-heading { flex: 0 1 300px; }
.announcement-excerpt { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--business-component-muted, #646c73); font-size: 12px; }
.home-announcements--saas .home-announcement--unread .announcement-title { font-weight: 600; }
.home-announcements--saas .home-announcement--read:not(:hover) .announcement-title { color: var(--business-component-muted, #646c73); }
.announcement-type {
  flex-shrink: 0; margin: 0; padding: 0 6px; border: 0; border-radius: var(--r-1, 4px);
  color: var(--announcement-type-color); background: color-mix(in srgb, var(--announcement-type-color) 10%, white);
  font-size: 12px; font-weight: 400; line-height: 20px;
}
.home-announcements--saas .announcement-date { font-size: 12px; color: var(--business-component-muted, #646c73); }
@container project-home (max-width: 339px) {
  .home-announcements--saas .announcement-header { align-items: flex-start; flex-wrap: wrap; gap: 4px; }
  .home-announcements--saas .announcement-heading { flex-basis: 100%; }
}
@container project-home (max-width: 599px) {
  .home-announcements--saas .announcement-excerpt { display: none; }
  .home-announcements--saas .announcement-heading { flex: 1; }
}
</style>
