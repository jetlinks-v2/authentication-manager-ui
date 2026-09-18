<template>
  <div class="basis-field">
    <dt class="basis-field__label" :style="columnStyle">
      <span>{{ label }}</span>
      <a-tooltip v-if="tooltip || $slots.tooltip">
        <template #title>
          <slot name="tooltip">{{ tooltip }}</slot>
        </template>
        <AIcon class="basis-field__hint" type="QuestionCircleOutlined" />
      </a-tooltip>
    </dt>
    <dd class="basis-field__value" :style="columnStyle">
      <a-form-item v-if="editing" :name="name" :rules="rules" :required="required">
        <slot />
      </a-form-item>
      <slot v-else name="view">
        <span>{{ display }}</span>
      </slot>
    </dd>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RuleObject } from 'ant-design-vue/es/form/interface'

const props = withDefaults(defineProps<{
  label: string
  name?: string
  tooltip?: string
  required?: boolean
  editing?: boolean
  display?: string
  rules?: RuleObject[]
  /** 该字段在分组内的列序号（从 1 开始）；不传则交给父级自动排布。 */
  column?: number
}>(), {
  editing: true,
})

const columnStyle = computed(() => (
  props.column ? { gridColumn: String(props.column) } : undefined
))
</script>

<style scoped lang="less">
// 字段自身不参与布局，只把「标签行 / 值行」两行交给父级行网格，
// 这样同一字段的标签与值始终处于同一列、同一行轨道。
.basis-field {
  display: contents;
}

.basis-field__label {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  grid-row: 1;
  color: var(--jet-theme-text-disabled);
  font-size: var(--fs-14);
  line-height: var(--lh-normal);
}

.basis-field__hint {
  color: var(--jet-theme-text-disabled);
  cursor: help;
}

.basis-field__value {
  min-width: 0;
  margin: 0;
  grid-row: 2;
  overflow-wrap: anywhere;
  color: var(--jet-theme-text);
  font-size: var(--fs-16);
  line-height: var(--lh-relaxed);
}

.basis-field__value:deep(.ant-form-item) {
  width: 100%;
  margin: 0;
}
</style>
