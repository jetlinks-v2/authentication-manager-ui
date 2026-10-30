<template>
  <div class="saas-today-container">
    <span v-if="updatedAtLabel" class="saas-today-window">{{ updatedAtLabel }}</span>
    <div class="saas-today-grid">
      <button
        v-for="row in rows"
        :key="row.id"
        type="button"
        class="saas-today-item"
        :disabled="!canOpen(row.target)"
        @click="$emit('navigate', row.target)"
      >
        <span class="saas-today-name">
          <span class="saas-today-label">{{ row.label || t(`packages.ProjectHome.${row.labelKey}`) }}</span>
          <RightOutlined v-if="canOpen(row.target)" class="saas-today-arrow" />
        </span>
        <MetricValue :value="row.value" :unit="row.unitKey ? t(`packages.ProjectHome.${row.unitKey}`) : row.unit" :failed="row.failed" />
        <span class="saas-today-yesterday">
          <span class="saas-yesterday-label">{{ t('packages.ProjectHome.saasYesterday') }}</span>
          <span class="saas-yesterday-value">{{ formatOverviewNumber(row.failed ? undefined : row.yesterday, locale) }}</span>
          <span class="saas-yesterday-unit">{{ row.unitKey ? t(`packages.ProjectHome.${row.unitKey}`) : row.unit }}</span>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { RightOutlined } from '@ant-design/icons-vue'
import type { HomeRow, HomeTarget } from '../../shared/types'
import MetricValue from './MetricValue.vue'
import { formatOverviewNumber } from './presentation'

defineProps({
  rows: { type: Array as PropType<HomeRow[]>, default: () => [] },
  canOpen: { type: Function as PropType<(target?: HomeTarget) => boolean>, required: true },
  updatedAtLabel: { type: String, default: '' },
})
defineEmits<{ navigate: [target?: HomeTarget] }>()
const { t, locale } = useI18n()
</script>

<style scoped lang="less">
.saas-today-container {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-width: 0;
  width: 100%;
  container-type: inline-size;
}
.saas-today-window {
  display: block;
  margin-bottom: 12px;
  color: var(--business-component-muted, #646c73);
  font-size: 12px;
}
.saas-today-grid {
  display: grid;
  flex: 1 0 auto;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
}
.saas-today-item {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  min-width: 0;
  padding: 4px 24px;
  border-radius: 0;
  background: transparent;
  border: 0;
  color: var(--business-component-text, #1f2329);
  font: inherit;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
  transition: color 0.2s ease;

  &:not(:last-child) {
    border-right: 1px solid #f0f2f5;
  }

  &:first-child {
    padding-left: 0;
  }

  &:last-child {
    padding-right: 0;
  }

  &:hover:not(:disabled) {
    background: transparent;

    .saas-today-label {
      color: var(--business-component-primary, #1677ff);
    }
    .saas-today-arrow {
      color: var(--business-component-primary, #1677ff);
      transform: translateX(2px);
    }
  }

  &:focus-visible {
    outline: 2px solid var(--business-component-primary, #1677ff);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: default;
  }
}
.saas-today-name {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: auto;
  max-width: 100%;
  font-size: 13px;
  line-height: 20px;
  color: #4e5969;
  margin-bottom: 6px;
  transition: color 0.2s ease;
}
.saas-today-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 400;
}
.saas-today-arrow {
  flex-shrink: 0;
  font-size: 8.5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  color: var(--business-component-muted, #86909c);
  transition: color 0.2s ease, transform 0.2s ease;
}
.saas-today-item :deep(.saas-metric-value) {
  min-width: 0;
  flex-wrap: nowrap;
  white-space: nowrap;
}
.saas-today-item :deep(.saas-metric-value strong) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  overflow-wrap: normal;
  font-size: 26px;
  line-height: 32px;
  font-weight: 600;
  color: #1f2329;
}
.saas-today-item :deep(.saas-metric-value > span) {
  flex: none;
  font-size: 12px;
  color: #86909c;
}
.saas-today-yesterday {
  margin-top: 6px;
  padding-top: 0;
  display: flex;
  align-items: baseline;
  gap: 4px;
  width: 100%;
  min-width: 0;
  color: #86909c;
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.saas-yesterday-label {
  flex-shrink: 0;
}
.saas-yesterday-value {
  flex-shrink: 0;
  font-weight: 400;
  color: #4e5969;
  font-variant-numeric: tabular-nums;
}
.saas-yesterday-unit {
  flex-shrink: 0;
}
@container (max-width: 639px) {
  .saas-today-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px 20px;
  }
  .saas-today-item {
    border-right: 0 !important;
    padding: 0 !important;
  }
}
@container (max-width: 279px) {
  .saas-today-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
