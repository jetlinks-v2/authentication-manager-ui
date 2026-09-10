<template>
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
    <button class="alarm-entry" :class="{ 'alarm-entry--active': open }" :disabled="disabled" :aria-expanded="open">
      <span><i :class="category" />{{ title }}</span><strong>{{ count === undefined ? '—' : count.toLocaleString() }}</strong>
    </button>
  </a-popover>
  <AlarmQuickDetail :category="category" :alarm="selected" :title="t('packages.ProjectHome.alarmDetailTitle', { title })"
    :loading="detailLoading" :failed="detailError" :submitting="submitting" :submit-error="submitError"
    @close="close" @retry="selected && select(selected)" @submit="submit" />
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ALARM_PAGE_SIZE, type AlarmCategory } from '../alarmService'
import { useQuickAlarms } from '../useQuickAlarms'
import AlarmQuickDetail from './AlarmQuickDetail.vue'
const props = defineProps<{ category: AlarmCategory; title: string; count?: number; disabled: boolean }>()
const emit = defineEmits<{ handled: [] }>()
const { t } = useI18n()
const { open, loading, error, rows, total, page, selected, detailLoading, detailError, submitting, submitError,
  load, setOpen, select, close, submit } = useQuickAlarms(props.category, () => emit('handled'))
</script>
<style scoped lang="less">
.alarm-entry { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 12px; gap: 8px; border: 1px solid transparent; border-radius: 8px; background: var(--home-card-surface); color: inherit; cursor: pointer; text-align: left; }
.alarm-entry > span { display: flex; align-items: center; gap: 8px; }
.alarm-entry i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--business-component-primary); }
.alarm-entry i.visionAlarm { background: #ff4d4f; }
.alarm-entry--active, .alarm-entry:hover { border-color: var(--business-component-primary); }
.alarm-entry:disabled { cursor: default; opacity: .6; }
.alarm-list { width: min(460px, calc(100vw - 64px)); }
.alarm-list-heading { color: var(--ant-color-text-secondary, #666); margin-bottom: 8px; }
.alarm-list-row { display: grid; grid-template-columns: 92px minmax(0, 1fr) auto; align-items: center; gap: 10px; width: 100%; padding: 10px 0; background: transparent; color: inherit; border: 0; border-bottom: 1px solid var(--ant-color-border-secondary, #eee); text-align: left; cursor: pointer; }
.alarm-list-row:hover { background: var(--ant-color-fill-tertiary, #f5f5f5); }
.alarm-list-name { overflow-wrap: anywhere; }
.alarm-list-time { font-size: 12px; }
.alarm-list-state { display: flex; justify-content: center; align-items: center; gap: 12px; padding: 24px 0; }
.alarm-list :deep(.ant-pagination) { margin-top: 12px; text-align: right; }
</style>
