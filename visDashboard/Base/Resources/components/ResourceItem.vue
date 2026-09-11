<template>
  <a-tooltip :title="disabled ? unavailableHintText : undefined">
    <div class="resource-item-wrapper">
      <button
        type="button"
        class="resource-item-btn"
        :class="{ 'is-disabled': disabled, 'is-metric': metric }"
        :disabled="disabled"
        :aria-label="disabled ? unavailableHintText : label(row)"
        @click="$emit('navigate', row.target)"
      >
        <div v-if="showIcon" class="resource-item-icon-box" :style="{ background: disabled ? '#F2F3F5' : iconBgTone }">
          <HomeIcon :name="row.icon" :neutral="disabled" />
        </div>
        <span class="resource-item-label">{{ label(row) }}</span>
        <div class="resource-item-value-box">
          <strong class="resource-item-value">{{ number(row.value) }}</strong>
          <span v-if="row.value !== undefined" class="resource-item-unit">{{ unitText }}</span>
        </div>
      </button>
    </div>
  </a-tooltip>
</template>

<script setup lang="ts" name="ProjectHomeResourceItem">
import { computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import HomeIcon from '../../shared/HomeIcon.vue'
import type { HomeRow, HomeTarget } from '../../shared/types'

const props = defineProps({
  row: { type: Object as PropType<HomeRow>, required: true },
  metric: { type: Boolean, default: false },
  showIcon: { type: Boolean, default: true },
  canOpen: { type: Function as PropType<(target?: HomeTarget) => boolean>, required: true },
  unavailableHint: { type: String, default: '' },
})

defineEmits<{ navigate: [target?: HomeTarget] }>()

const { t } = useI18n()

const iconBgTones: Record<string, string> = {
  devices: '#E8F3FF',
  video: '#E8F3FF',
  gateway: '#E8F3FF',
  collector: '#FFF3E8',
  card: '#E8F3FF',
  screen: '#EEF2FF',
  template: '#FEF3E6',
  image: '#EBF8F2',
  component: '#F8EEFE',
  model: '#EBF5FA',
  agent: '#F3EEFF',
  algorithm: '#EBF7F7',
  coverage: '#E2F5FC',
  scene: '#FFF3E8',
}

const iconBgTone = computed(() => (props.row.icon && iconBgTones[props.row.icon]) || '#E8F3FF')

const disabled = computed(() => !props.canOpen(props.row.target))
const label = (row: HomeRow) => row.label || t(`packages.ProjectHome.${row.labelKey}`)
const number = (value?: number) => (value === undefined ? '—' : value.toLocaleString())
const unitText = computed(() => props.row.unit || t('packages.ProjectHome.unitPiece') || '个')

const unavailableHintText = computed(() => {
  if (props.unavailableHint) return props.unavailableHint
  return props.row.id === 'video'
    ? t('packages.ProjectHome.resourceUnavailableVideo')
    : t('packages.ProjectHome.resourceUnavailable', { resource: label(props.row) })
})
</script>

<style scoped lang="less">
.resource-item-wrapper {
  width: 100%;
}

.resource-item-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border: 1px solid transparent;
  border-radius: 4px;
  color: #1d2129;
  cursor: pointer;
  box-sizing: border-box;
  text-align: left;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover:not(:disabled) {
    background: #eef5ff;
    border-color: #d0e2ff;
  }

  &:focus-visible {
    outline: 2px solid var(--business-component-primary, #1677ff);
    outline-offset: -2px;
  }

  &:disabled,
  &.is-disabled {
    cursor: not-allowed;
    background: #f7f8fa;
    color: #86909c;

    .resource-item-label,
    .resource-item-value,
    .resource-item-unit {
      color: #86909c;
    }
  }
}

.resource-item-icon-box {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.2s ease;

  :deep(.home-icon) {
    width: 20px;
    height: 20px;
    flex: 0 0 20px;
    font-size: 20px;
  }
}

.resource-item-label {
  font-size: 14px;
  line-height: 22px;
  font-weight: 400;
  color: #1d2129;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resource-item-value-box {
  margin-left: auto;
  display: flex;
  align-items: baseline;
  gap: 4px;
  flex-shrink: 0;
  white-space: nowrap;
}

.resource-item-value {
  font-size: 16px;
  line-height: 22px;
  font-weight: 500;
  color: #1d2129;
  font-variant-numeric: tabular-nums;
}

.resource-item-unit {
  font-size: 14px;
  line-height: 22px;
  font-weight: 400;
  color: #4e5969;
}
</style>
