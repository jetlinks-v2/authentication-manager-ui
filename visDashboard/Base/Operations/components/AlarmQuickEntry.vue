<template>
  <div class="alarm-entry-shell">
    <a-popover :open="open" trigger="click" placement="bottomRight" @open-change="setOpen">
    <template #content>
      <div class="alarm-list" :aria-label="title">
        <div class="alarm-list-heading">{{ title }} · {{ t('packages.ProjectHome.alarmPendingCount', { count: total }) }}</div>
        <a-spin v-if="loading" class="alarm-list-state" />
        <div v-else-if="error" class="alarm-list-state">
          <span>{{ t('packages.ProjectHome.loadError') }}</span>
          <a-button size="small" @click="load()">{{ t('packages.ProjectHome.alarmRetry') }}</a-button>
        </div>
        <a-empty v-else-if="!rows.length" :description="t('packages.ProjectHome.alarmEmpty')" />
        <template v-else>
          <button v-for="item in rows" :key="item.id" class="alarm-list-row" @click="select(item)">
            <span class="alarm-list-time">{{ item.shortTime }}</span>
            <span class="alarm-list-name">{{ item.title || '—' }}<template v-if="category === 'visionAlarm' && item.channel"> · {{ item.channel }}</template></span>
            <a-tag color="error">{{ t('packages.ProjectHome.alarmPending') }}</a-tag>
          </button>
          <a-pagination v-if="total > ALARM_PAGE_SIZE" :current="page" :total="total" :page-size="ALARM_PAGE_SIZE"
            :show-size-changer="false" size="small" @change="load" />
        </template>
      </div>
    </template>
    <button
      class="alarm-entry-card"
      :class="[`alarm-entry-card--${category}`, { 'alarm-entry-card--active': open }]"
      :disabled="disabled"
      :aria-expanded="open"
    >
      <span class="alarm-entry-top">
        <span class="alarm-entry-icon" :class="`alarm-icon--${category}`">
          <AlertOutlined v-if="category === 'deviceAlarm'" />
          <WarningOutlined v-else />
        </span>
        <span class="alarm-entry-title">{{ title }}</span>
        <strong class="alarm-entry-count">{{ count === undefined ? '—' : count.toLocaleString() }}</strong>
      </span>
      <small class="alarm-entry-description">{{ t(count === undefined ? 'packages.ProjectHome.metricUnknown' : count === 0 ? 'packages.ProjectHome.alarmZeroGuide' : 'packages.ProjectHome.alarmReview') }}</small>
    </button>
    </a-popover>
    <a-button v-if="count === 0 && canConfigure" class="alarm-entry-configure" type="text" size="small"
      @click="$emit('configure')">{{ t('packages.ProjectHome.alarmConfigure') }} ›</a-button>
  </div>
  <AlarmQuickDetail :category="category" :alarm="selected" :title="t('packages.ProjectHome.alarmDetailTitle', { title })"
    :loading="detailLoading" :failed="detailError" :submitting="submitting" :submit-error="submitError"
    @close="close" @retry="selected && select(selected)" @submit="submit" />
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { AlertOutlined, WarningOutlined } from '@ant-design/icons-vue'
import { ALARM_PAGE_SIZE, type AlarmCategory } from '../alarmService'
import { useQuickAlarms } from '../useQuickAlarms'
import AlarmQuickDetail from './AlarmQuickDetail.vue'

const props = defineProps<{ category: AlarmCategory; title: string; count?: number; disabled: boolean; canConfigure: boolean }>()
const emit = defineEmits<{ handled: []; configure: [] }>()
const { t } = useI18n()
const { open, loading, error, rows, total, page, selected, detailLoading, detailError, submitting, submitError,
  load, setOpen, select, close, submit } = useQuickAlarms(props.category, () => emit('handled'))
</script>
<style scoped lang="less">
.alarm-entry-shell {
  min-width: 0;
  padding: 0 8px 8px;
  border: 1px solid #e5effd;
  border-radius: 4px;
  background: #f8fafc;
}

.alarm-entry-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  width: 100%;
  min-height: 72px;
  padding: 8px 6px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  box-sizing: border-box;
  text-align: left;
  cursor: pointer;
  color: inherit;
  outline: none !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover:not(:disabled) {
    outline: none !important;
    background: #f5f7fa;
  }

  &:focus-visible {
    box-shadow: inset 0 0 0 2px #bfd8ff;
  }

  &--active {
    box-shadow: 0 0 0 2px rgba(30, 114, 240, 0.12);
  }

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }
}

.alarm-entry-configure {
  width: 100%;
  height: 28px;
  padding: 0 8px;
  border-radius: 4px;
  background: #eef5ff;
  color: var(--business-component-primary, #1677ff);
  font-size: 12px;
  font-weight: 500;

  &:hover, &:focus-visible {
    background: #e5f0ff;
    color: var(--business-component-primary, #1677ff);
  }
}

.alarm-entry-top {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.alarm-entry-icon {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;

  &.alarm-icon--deviceAlarm {
    background: linear-gradient(180deg, #ffffff 0%, #ffd6d6 100%);
    color: #f84343;
  }

  &.alarm-icon--visionAlarm {
    background: linear-gradient(180deg, #ffffff 0%, #ffead6 100%);
    color: #ffb24e;
  }
}

.alarm-entry-title {
  font-size: 13px;
  font-weight: 500;
  color: #1d2129;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alarm-entry-count {
  font-size: 18px;
  font-weight: 600;
  color: #1d2129;
  flex-shrink: 0;
}
.alarm-entry-description { color: var(--business-component-muted); font-size: 12px; line-height: 18px; }

@container business-component-shell (max-width: 320px) {
  .alarm-entry-icon { display: none; }
}

.alarm-list { width: min(460px, calc(100vw - 64px)); }
.alarm-list-heading { color: var(--ant-color-text-secondary, #666); margin-bottom: 8px; }
.alarm-list-row { display: grid; grid-template-columns: 92px minmax(0, 1fr) auto; align-items: center; gap: 10px; width: 100%; padding: 10px 0; background: transparent; color: inherit; border: 0; border-bottom: 1px solid var(--ant-color-border-secondary, #eee); text-align: left; cursor: pointer; }
.alarm-list-row:hover { background: var(--ant-color-fill-tertiary, #f5f5f5); }
.alarm-list-name { overflow-wrap: anywhere; }
.alarm-list-time { font-size: 12px; }
.alarm-list-state { display: flex; justify-content: center; align-items: center; gap: 12px; padding: 24px 0; }
.alarm-list :deep(.ant-pagination) { margin-top: 12px; text-align: right; }
</style>
