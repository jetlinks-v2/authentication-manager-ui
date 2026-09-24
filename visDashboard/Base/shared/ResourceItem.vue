<template>
  <a-tooltip :title="disabled ? unavailableHintText : undefined">
    <div class="resource-item-wrapper">
      <button
        type="button"
        class="resource-item-btn"
        :class="{ 'is-disabled': disabled, 'is-metric': metric, 'is-empty': isEmpty, 'has-icon': showIcon }"
        :disabled="disabled"
        :aria-label="accessibilityLabel"
        @click="$emit('navigate', row.target)"
      >
        <div v-if="showIcon" class="resource-item-icon-box" :style="{ background: disabled ? '#F2F3F5' : iconBgTone }">
          <HomeIcon :name="row.icon" :neutral="disabled" />
        </div>
        <span class="resource-item-copy">
          <span class="resource-item-label">{{ label(row) }}</span>
          <j-ellipsis v-if="isEmpty || row.description || row.descriptionKey" class="resource-item-description">{{ visibleDescription }}</j-ellipsis>
        </span>
        <div class="resource-item-value-box">
          <strong class="resource-item-value">{{ number(row.value) }}</strong>
          <span v-if="row.value !== undefined" class="resource-item-unit">{{ unitText }}</span>
        </div>
        <span class="resource-item-detail">
          <template v-if="row.failed || row.value === undefined">{{ t('packages.ProjectHome.metricUnknown') }}</template>
          <template v-else-if="isEmpty">
            <span v-if="!disabled" class="resource-item-action">{{ emptyAction }} ›</span>
            <span v-else class="resource-item-unavailable">{{ unavailableHintText }}</span>
          </template>
          <template v-else-if="row.online !== undefined && row.offline !== undefined">
            <span>{{ t('packages.ProjectHome.online') }} <b>{{ number(row.online) }}</b></span>
            <span>{{ t('packages.ProjectHome.offline') }} <b>{{ number(row.offline) }}</b></span>
            <span v-if="row.value > 0">{{ t('packages.ProjectHome.onlineRate', { value: Math.round(row.online / row.value * 100) }) }}</span>
          </template>
          <template v-else>{{ disabled ? unavailableHintText : t('packages.ProjectHome.resourceManage') + ' ›' }}</template>
        </span>
      </button>
    </div>
  </a-tooltip>
</template>

<script setup lang="ts" name="ProjectHomeResourceItem">
import { computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import HomeIcon from './HomeIcon.vue'
import type { HomeRow, HomeTarget } from './types'

const props = defineProps({
  row: { type: Object as PropType<HomeRow>, required: true },
  metric: { type: Boolean, default: false },
  showIcon: { type: Boolean, default: true },
  canOpen: { type: Function as PropType<(target?: HomeTarget) => boolean>, required: true },
  unavailableHint: { type: String, default: '' },
})

defineEmits<{ navigate: [target?: HomeTarget] }>()

const { t } = useI18n()

// 数量为 0 的资源共用同一引导布局，按资源类型展示对应的说明和入口。
const guidedResourceIds = new Set([
  'devices', 'video', 'gateway', 'collector', 'card',
  'image', 'component', 'model', 'screen', 'template',
  'agent', 'algorithm', 'coverage', 'scene',
])

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
const isEmpty = computed(() => !props.row.failed && props.row.value === 0)
const label = (row: HomeRow) => row.label || t(`packages.ProjectHome.${row.labelKey}`)
const description = (row: HomeRow) => row.descriptionKey ? t(`packages.ProjectHome.${row.descriptionKey}`) : ''
const emptyHint = computed(() => {
  return guidedResourceIds.has(props.row.id)
    ? t(`packages.ProjectHome.resourceEmpty_${props.row.id}`)
    : t('packages.ProjectHome.resourceZero')
})
const emptyAction = computed(() => {
  return guidedResourceIds.has(props.row.id)
    ? t(`packages.ProjectHome.resourceAction_${props.row.id}`)
    : t('packages.ProjectHome.resourceManage')
})
const visibleDescription = computed(() => isEmpty.value
  ? disabled.value ? unavailableHintText.value : emptyHint.value
  : props.row.description || description(props.row))
const accessibilityLabel = computed(() => disabled.value ? unavailableHintText.value
  : isEmpty.value ? `${label(props.row)}，${emptyHint.value}，${emptyAction.value}` : label(props.row))
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
    background: #f5f7fa;
    border-color: #e5effd;
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
.resource-item-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 2px; overflow: hidden; }
.resource-item-copy :deep(.resource-item-description) { width: 100%; min-width: 0; display: -webkit-box; -webkit-box-orient: vertical; white-space: normal; overflow: hidden; color: var(--business-component-muted); font-size: 12px; line-height: 18px; }
.resource-item-btn { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px 10px; }
.resource-item-btn.has-icon { grid-template-columns: auto minmax(0, 1fr) auto; }
.resource-item-copy { grid-column: 1; }
.resource-item-btn.has-icon .resource-item-copy { grid-column: 2; }
.resource-item-detail { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 4px 12px; padding-top: 8px; border-top: 1px solid var(--line, #edf0f5); color: var(--business-component-muted); font-size: 12px; line-height: 18px; }
.resource-item-detail b { color: var(--business-component-text); font-weight: 500; }
.resource-item-btn.is-empty .resource-item-detail { justify-content: center; padding: 6px 8px; border-top: 0; border-radius: 4px; background: #eef5ff; }
.resource-item-btn.is-empty:hover:not(:disabled) .resource-item-detail { background: #e5f0ff; }
.resource-item-btn.is-empty .resource-item-action { color: var(--business-component-primary, #1677ff); font-weight: 500; }
.resource-item-btn.is-empty:disabled .resource-item-detail { background: #f0f2f5; }
.resource-item-unavailable { color: var(--business-component-muted); }
.resource-item-btn:disabled .resource-item-copy :deep(.resource-item-description) { color: inherit; }

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
