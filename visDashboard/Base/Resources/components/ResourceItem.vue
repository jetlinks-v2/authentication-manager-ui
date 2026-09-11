<template>
  <a-tooltip :title="disabled ? unavailableHint : undefined">
    <span class="resource-item-trigger" :class="{ 'resource-item-trigger--metric': metric }">
      <button
        type="button"
        :class="metric ? 'home-resource-metric home-surface' : 'home-resource-row'"
        :disabled="disabled"
        :aria-label="disabled ? unavailableHint : label(row)"
        @click="$emit('navigate', row.target)"
      >
        <HomeIcon v-if="showIcon" :name="row.icon" :neutral="disabled" />
        <span class="resource-item-label">{{ label(row) }}</span>
        <strong>{{ number(row.value) }}</strong>
      </button>
    </span>
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
  unavailableHint: { type: String, required: true },
})
defineEmits<{ navigate: [target?: HomeTarget] }>()
const { t } = useI18n()
const disabled = computed(() => !props.canOpen(props.row.target))
const label = (row: HomeRow) => row.label || t(`packages.ProjectHome.${row.labelKey}`)
const number = (value?: number) => value === undefined ? '—' : value.toLocaleString()
</script>

<style scoped lang="less" src="../../shared/views.less" />
<style scoped lang="less">
.home-resource-row,
.home-resource-metric {
  width: 100%;
  border: 0;
  color: inherit;
  cursor: pointer;
  text-align: left;
}
.resource-item-trigger { display: block; width: 100%; }
.resource-item-trigger--metric { width: 100%; }
.home-resource-row {
  display: flex;
  align-items: center;
  min-height: 38px;
  gap: var(--space-2);
  padding: 0 8px;
  background: transparent;
  border-radius: 8px;
  box-sizing: border-box;
  transition: background-color .18s ease;

  .home-icon,
  :deep(.home-icon) {
    flex: 0 0 18px;
    width: 18px;
    height: 18px;
  }

  .resource-item-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
  }

  strong {
    margin-left: auto;
    flex-shrink: 0;
    white-space: nowrap;
  }
}
.home-resource-metric {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-2);
  transition: background-color .18s ease;
}
.home-resource-metric strong { grid-column: 1 / -1; }
.resource-item-trigger:hover > .home-resource-row:not(:disabled),
.resource-item-trigger:hover > .home-resource-metric:not(:disabled),
.home-resource-row:not(:disabled):hover,
.home-resource-metric:not(:disabled):hover {
  outline: 0;
  background: #eef5ff;
  border-radius: 8px;
}
.resource-item-trigger > .home-resource-row:disabled,
.resource-item-trigger > .home-resource-metric:disabled {
  color: #b7bec8;
  cursor: not-allowed;
}
.resource-item-trigger > .home-resource-row:disabled strong,
.resource-item-trigger > .home-resource-metric:disabled strong { color: #b7bec8; }
.home-resource-row:focus-visible,
.home-resource-metric:focus-visible {
  outline: 2px solid var(--business-component-primary);
  outline-offset: -2px;
}
</style>
