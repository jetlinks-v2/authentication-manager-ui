<template>
  <div class="saas-resource-container">
    <div class="saas-resource-grid" :style="{ '--resource-count': rows.length }">
      <button
        v-for="row in rows"
        :key="row.id"
        type="button"
        class="saas-resource"
        :disabled="!canOpen(row.target)"
        @click="$emit('navigate', row.target)"
      >
        <span class="saas-resource-icon"><HomeIcon :name="row.icon || row.id" neutral /></span>
        <span class="saas-resource-content">
          <span class="saas-resource-name" :title="row.label || t(`packages.ProjectHome.${row.labelKey}`)">{{ row.label || t(`packages.ProjectHome.${row.labelKey}`) }}</span>
          <MetricValue :value="row.value" :unit="row.unitKey ? t(`packages.ProjectHome.${row.unitKey}`) : row.unit" :failed="row.failed" :title="formatOverviewNumber(row.value, locale)" />
          <span v-if="row.failed" class="saas-resource-statuses">{{ t('packages.ProjectHome.metricUnknown') }}</span>
          <span v-else-if="row.statuses?.length" class="saas-resource-statuses">
            <span v-for="status in row.statuses" :key="status.labelKey" class="saas-resource-status" :title="`${t(`packages.ProjectHome.${status.labelKey}`)} ${formatOverviewNumber(status.value, locale)}`">
              <a-badge v-if="status.tone" :status="status.tone" />
              <span class="saas-status-label">{{ t(`packages.ProjectHome.${status.labelKey}`) }}</span>
              <strong>{{ formatOverviewNumber(status.value, locale) }}</strong>
            </span>
          </span>
        </span>
        <RightOutlined v-if="canOpen(row.target)" class="saas-resource-arrow" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { RightOutlined } from '@ant-design/icons-vue'
import HomeIcon from '../../shared/HomeIcon.vue'
import MetricValue from './MetricValue.vue'
import type { HomeRow, HomeTarget } from '../../shared/types'
import { formatOverviewNumber } from './presentation'

defineProps({
  rows: { type: Array as PropType<HomeRow[]>, default: () => [] },
  canOpen: { type: Function as PropType<(target?: HomeTarget) => boolean>, required: true },
})
defineEmits<{ navigate: [target?: HomeTarget] }>()
const { t, locale } = useI18n()
</script>

<style scoped lang="less">
.saas-resource-container { min-width: 0; width: 100%; container-type: inline-size; }
.saas-resource-grid { display: grid; grid-template-columns: repeat(var(--resource-count, 4), minmax(0, 1fr)); gap: 12px; }
.saas-resource {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
  min-height: 114px;
  padding: 14px 16px;
  border: 1px solid var(--jet-theme-border-secondary, #e8edf3);
  border-radius: var(--r-2, 6px);
  background: var(--home-card-surface, #f7f9fc);
  color: var(--business-component-text, #1f2329);
  font: inherit;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
  transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;

  &:hover:not(:disabled) {
    background: #ffffff;
    border-color: var(--business-component-primary, #1677ff);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

    .saas-resource-name {
      color: var(--business-component-primary, #1677ff);
    }
    .saas-resource-arrow {
      color: var(--business-component-primary, #1677ff);
      transform: translateX(2px);
    }
  }
  &:focus-visible {
    outline: 2px solid var(--business-component-primary, #1677ff);
    outline-offset: 2px;
  }
  &:disabled { cursor: default; }
}
.saas-resource-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  border-radius: var(--r-2, 6px);
  color: var(--business-component-primary, #1677ff);
  background: var(--accent-soft, #e8f3ff);
  transition: transform 0.2s ease;
}
.saas-resource:hover:not(:disabled) .saas-resource-icon {
  transform: scale(1.04);
}
.saas-resource-content {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}
.saas-resource-name {
  padding-right: 16px;
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--business-component-text, #1f2329);
  transition: color 0.2s ease;
}
.saas-resource-content :deep(.saas-metric-value) {
  min-width: 0;
  flex-wrap: nowrap;
  white-space: nowrap;
}
.saas-resource-content :deep(.saas-metric-value strong) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  overflow-wrap: normal;
  font-size: 24px;
  line-height: 30px;
}
.saas-resource-content :deep(.saas-metric-value > span) {
  flex: none;
  font-size: 12px;
  color: var(--business-component-muted, #646c73);
}
.saas-resource-statuses {
  margin-top: auto;
  padding-top: 4px;
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  min-width: 0;
  color: var(--business-component-muted, #646c73);
  font-size: 12px;
  line-height: 18px;
}
.saas-resource-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  white-space: nowrap;
}
.saas-status-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.saas-resource-status strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--business-component-text, #333842);
}
.saas-resource-status :deep(.ant-badge) { flex: none; }
.saas-resource-arrow {
  position: absolute;
  top: 16px;
  right: 14px;
  font-size: 11px;
  color: var(--business-component-muted, #86909c);
  transition: color 0.2s ease, transform 0.2s ease;
}
@container (max-width: 839px) {
  .saas-resource-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .saas-resource { min-height: 114px; }
}
@container (max-width: 479px) {
  .saas-resource-grid { grid-template-columns: minmax(0, 1fr); }
}
</style>
