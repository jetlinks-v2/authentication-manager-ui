<template>
  <div class="home-content home-operations" :class="{ 'home-operations--cards': chart.displayStyle === 'cards' }">
    <section v-for="group in groups" :key="group" class="home-operation-group" :class="`home-operation-group--${group}`">
      <h4 class="home-operation-group-title">{{ t(`packages.ProjectHome.group_${group}`) }}</h4>
      <div class="home-operation-items" :class="`items--${group}`">
        <template v-for="row in getGroupRows(group)" :key="row.id">
          <slot v-if="group === 'alarms'" name="alarm" :row="row" />
          <button
            v-else-if="group === 'health'"
            type="button"
            class="home-health-card"
            :disabled="!canOpen(row.target)"
            :title="actionHint(row)"
            @click="$emit('navigate', row.target)"
          >
            <div class="health-card-header">
              <span class="health-icon-box">
                <HomeIcon :name="row.icon || row.id" />
              </span>
              <span class="health-card-title">{{ label(row) }}</span>
            </div>
            <div class="health-card-progress">
              <div class="health-progress-bar" :style="{ width: `${healthPercent(row)}%` }" />
            </div>
            <div class="health-card-footer">
              <span class="status-item">
                <span class="status-label">{{ t('packages.ProjectHome.online') }}</span>
                <strong class="status-value">{{ number(row.online) }}</strong>
              </span>
              <span class="status-item">
                <span class="status-label">{{ t('packages.ProjectHome.offline') }}</span>
                <strong class="status-value">{{ number(row.offline) }}</strong>
              </span>
            </div>
          </button>
          <button
            v-else
            type="button"
            class="home-operation home-surface"
            :disabled="!canOpen(row.target)"
            :title="actionHint(row)"
            @click="$emit('navigate', row.target)"
          >
            <span class="home-operation-title"><HomeIcon :name="row.icon || row.id" /><span>{{ label(row) }}</span></span>
            <strong>{{ number(row.value) }}</strong>
          </button>
        </template>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts" name="ProjectHomeOperationsView">
import { computed, type PropType } from 'vue'
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
const number = (value?: number) => (value === undefined ? '—' : value.toLocaleString())
const healthPercent = (row: HomeRow) =>
  row.online !== undefined && row.offline !== undefined && row.online + row.offline > 0
    ? Math.min(100, Math.max(0, (row.online / (row.online + row.offline)) * 100))
    : 0

const groups = computed(() => {
  const allGroups = [...new Set(props.rows.map(row => row.group))]
  return allGroups.sort((a, b) => (a === 'health' ? -1 : 1))
})

const getGroupRows = (group: string) => {
  const filtered = props.rows.filter(item => item.group === group)
  if (group === 'alarms') {
    return filtered.sort((a, b) => (a.id === 'deviceAlarm' ? -1 : 1))
  }
  return filtered
}
</script>

<style scoped lang="less" src="../../shared/views.less" />
<style scoped lang="less">
.home-operations {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.home-operation-group-title {
  font-size: 13px;
  font-weight: 500;
  color: #1d2129;
  line-height: 18px;
  margin: 0 0 8px 0;
  padding: 0;
}

.home-operation-items {
  display: grid;
  gap: 10px;

  &.items--health {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  &.items--alarms {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
}

.home-health-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: #f8fafc;
  border: 1px solid #e5effd;
  border-radius: 4px;
  padding: 8px 10px;
  box-sizing: border-box;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 80px;
  color: inherit;
  outline: none !important;

  &:hover:not(:disabled) {
    background: #eef5ff;
    border-color: #bfd8ff;
    box-shadow: 0 2px 8px rgba(30, 114, 240, 0.08);
    outline: none !important;
  }

  &:focus,
  &:active,
  &:focus-visible {
    outline: none !important;
    border-color: #bfd8ff;
  }

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }
}

.health-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.health-icon-box {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  border-radius: 50%;
  background: linear-gradient(180deg, #ffffff 0%, #d6e9ff 60%, #d6e9ff 99%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #1e72f0;

  :deep(.home-icon) {
    width: 14px;
    height: 14px;
    color: #1e72f0 !important;
  }
}

.health-card-title {
  font-size: 13px;
  font-weight: 500;
  color: #1d2129;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.health-card-progress {
  height: 5px;
  border-radius: 3px;
  background: #e5ebf5;
  overflow: hidden;
  margin: 6px 0 6px;
}

.health-progress-bar {
  height: 100%;
  border-radius: 3px;
  background: #1e72f0;
  transition: width 0.3s ease;
}

.health-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #86909c;

  .status-item {
    display: inline-flex;
    align-items: baseline;
    gap: 3px;
  }

  .status-label {
    font-size: 12px;
    color: #86909c;
  }

  .status-value {
    font-size: 13px;
    font-weight: 500;
    color: #1d2129;
  }
}

@container business-component-shell (max-width: 440px) {
  .home-operation-items.items--health {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@container business-component-shell (max-width: 320px) {
  .home-operation-items.items--health,
  .home-operation-items.items--alarms {
    grid-template-columns: 1fr;
  }
}
</style>
