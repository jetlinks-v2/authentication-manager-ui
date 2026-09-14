<template>
  <div class="basis-field-row" :class="{ 'basis-field-row--start': align === 'start' }">
    <dt>
      <span>{{ label }}</span>
      <a-tooltip v-if="tooltip || $slots.tooltip">
        <template #title>
          <slot name="tooltip">{{ tooltip }}</slot>
        </template>
        <AIcon type="QuestionCircleOutlined" />
      </a-tooltip>
    </dt>
    <dd>
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
import type { RuleObject } from 'ant-design-vue/es/form/interface'

withDefaults(defineProps<{
  label: string
  name?: string
  tooltip?: string
  required?: boolean
  align?: 'center' | 'start'
  editing?: boolean
  display?: string
  rules?: RuleObject[]
}>(), {
  align: 'center',
  editing: true,
})
</script>

<style scoped lang="less">
.basis-field-row {
  display: grid;
  min-height: var(--space-12);
  grid-template-columns: 10rem minmax(0, 1fr);
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-bottom: var(--jet-theme-stroke-width) solid var(--jet-theme-border-secondary);

  &:last-child {
    border-bottom: 0;
  }

  dt {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    color: var(--jet-theme-text-disabled);
    font-size: var(--fs-14);
    font-weight: 400;
    line-height: var(--lh-normal);
  }

  dd {
    min-width: 0;
    margin: 0;
    overflow-wrap: anywhere;
    color: var(--jet-theme-text);
    font-size: var(--fs-body);
    line-height: var(--lh-relaxed);
  }
}

.basis-field-row--start {
  align-items: flex-start;
  padding-top: var(--space-4);
  padding-bottom: var(--space-4);
}

.basis-field-row :deep(.ant-form-item) {
  max-width: 42rem;
  margin: 0;
}

.basis-field-row :deep(.ant-input),
.basis-field-row :deep(.ant-input-affix-wrapper),
.basis-field-row :deep(.ant-select) {
  max-width: 42rem;
}

@media (max-width: 48rem) {
  .basis-field-row {
    min-height: 0;
    grid-template-columns: 1fr;
    gap: var(--space-2);
    padding: var(--space-4);
  }
}
</style>