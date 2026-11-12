<template>
  <div class="template-selector">
    <div
      v-for="item in templates"
      :key="item.id"
      class="template-card"
      :class="{ selected: modelValue === item.id, disabled: item.disabled }"
      role="button"
      :tabindex="item.disabled ? -1 : 0"
      :aria-disabled="item.disabled"
      :aria-pressed="modelValue === item.id"
      @click="selectTemplate(item)"
      @keydown.enter="selectTemplate(item)"
      @keydown.space.prevent="selectTemplate(item)"
    >
      <AIconValueView
        :value="item.icon"
        :size="44"
        :border-radius="10"
        :fallback-text="item.name"
      />
      <div class="template-content">
        <strong class="template-name" :title="item.name">{{ item.name }}</strong>
        <p class="template-description" :title="item.description">
          {{ item.description || $t('comm.table.empty') }}
        </p>
        <a-button
          v-if="!item.disabled"
          type="link"
          size="small"
          class="detail-link"
          @click.prevent.stop="emits('preview', item)"
          @keydown.enter.stop
          @keydown.space.stop
        >
          <template #icon><AIcon type="ProfileOutlined" /></template>
          <span>{{ $t('ProjectApplication.template.detail') }}</span>
        </a-button>
        <span v-else class="unavailable">
          <AIcon type="LockOutlined" />
          {{ $t('ProjectApplication.template.unavailable') }}
        </span>
      </div>
      <span v-if="modelValue === item.id" class="selection-mark" aria-hidden="true">
        <AIcon type="CheckCircleFilled" />
      </span>
    </div>
  </div>
</template>

<script setup lang="ts" name="ProjectApplicationTemplateSelector">
import type { PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ApplicationTemplate } from '../types'
import { IconValueView as AIconValueView } from '@jetlinks-web-core/components/IconValue'

defineProps({
  templates: {
    type: Array as PropType<ApplicationTemplate[]>,
    default: () => [],
  },
  modelValue: {
    type: String,
    default: '',
  },
})

const emits = defineEmits<{
  'update:modelValue': [value: string]
  preview: [template: ApplicationTemplate]
}>()
const { t: $t } = useI18n()

const selectTemplate = (item: ApplicationTemplate) => {
  if (!item.disabled) emits('update:modelValue', item.id)
}
</script>

<style scoped>
.template-selector {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-rows: 1fr;
  gap: var(--space-2);
}

.template-card {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 5.5rem;
  align-items: center;
  gap: var(--space-3);
  overflow: hidden;
  padding: var(--space-3) 0.875rem;
  border: 1px solid var(--line);
  border-radius: var(--r-5);
  background: var(--bg);
  color: var(--ink-1);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.template-card:not(.disabled):hover,
.template-card.selected {
  border-color: var(--accent);
}

.template-card.selected {
  background: var(--accent-soft);
}

.template-card:focus-visible {
  outline: none;
  box-shadow: var(--ring-focus);
}

.template-card.disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.template-content {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 0.125rem;
}

.template-name {
  display: block;
  overflow: hidden;
  padding-inline-end: var(--space-6);
  font-size: var(--fs-13);
  font-weight: 600;
  line-height: 1.25rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-description {
  margin: 0;
  overflow: hidden;
  color: var(--ink-3);
  font-size: var(--fs-12);
  line-height: 1.125rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-link {
  display: inline-flex;
  width: fit-content;
  height: 1.125rem;
  align-items: center;
  padding: 0;
  border: 0;
  color: var(--accent);
  font-size: var(--fs-12);
  line-height: 1.125rem;
}

.detail-link :deep(.anticon + span) { margin-inline-start: var(--space-1); }

.unavailable {
  display: flex;
  min-height: 1.125rem;
  align-items: center;
  gap: var(--space-1);
  color: var(--ink-4);
  font-size: var(--fs-12);
  line-height: 1.125rem;
}

.selection-mark {
  position: absolute;
  top: var(--space-3);
  inset-inline-end: var(--space-3);
  display: flex;
  color: var(--accent);
}

.selection-mark :deep(.anticon) { font-size: var(--fs-16); }

@media (max-width: 40rem) {
  .template-selector { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .template-card { transition: none; }
}
</style>
