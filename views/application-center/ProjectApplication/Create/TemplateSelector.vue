<template>
  <div class="template-selector">
    <button
      v-for="item in templates"
      :key="item.id"
      type="button"
      class="template-card"
      :class="{ selected: modelValue === item.id, disabled: item.disabled }"
      :disabled="item.disabled"
      @click="selectTemplate(item)"
    >
      <span class="template-icon"><AIcon :type="item.icon" /></span>
      <span class="template-copy">
        <strong>{{ $t(item.nameKey) }}</strong>
        <span>{{ $t(item.descriptionKey) }}</span>
      </span>
      <a-button
        v-if="!item.disabled"
        type="link"
        size="small"
        class="detail-link"
        @click.prevent.stop="previewTemplate = item"
      >
        {{ $t('ProjectApplication.template.detail') }}
        <AIcon type="RightOutlined" />
      </a-button>
      <span v-else class="unavailable">{{ $t('ProjectApplication.template.unavailable') }}</span>
    </button>

    <a-modal
      :open="!!previewTemplate"
      :title="previewTemplate ? $t(previewTemplate.nameKey) : ''"
      :footer="null"
      @cancel="previewTemplate = undefined"
    >
      <div v-if="previewTemplate" class="template-preview">
        <span class="preview-icon"><AIcon :type="previewTemplate.icon" /></span>
        <p>{{ $t(previewTemplate.detailKey) }}</p>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts" name="ProjectApplicationTemplateSelector">
import type { PropType } from 'vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ApplicationTemplate } from '../types'

const props = defineProps({
  templates: {
    type: Array as PropType<ApplicationTemplate[]>,
    default: () => [],
  },
  modelValue: {
    type: String,
    default: '',
  },
})

const emits = defineEmits(['update:modelValue'])
const { t: $t } = useI18n()
const previewTemplate = ref<ApplicationTemplate>()

const selectTemplate = (item: ApplicationTemplate) => {
  if (!item.disabled) emits('update:modelValue', item.id)
}
</script>

<style scoped>
.template-selector {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
}

.template-card {
  position: relative;
  display: grid;
  min-height: 8.75rem;
  grid-template-columns: 2rem minmax(0, 1fr);
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--line);
  border-radius: var(--r-3);
  background: var(--bg);
  color: var(--ink-1);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.template-card:hover,
.template-card.selected {
  border-color: var(--accent);
  box-shadow: var(--shadow-hover);
}

.template-card.selected {
  background: var(--accent-soft);
}

.template-card.disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.template-icon,
.preview-icon {
  display: grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  border-radius: var(--r-2);
  background: var(--accent-soft);
  color: var(--accent);
  font-size: var(--fs-16);
}

.template-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--space-2);
}

.template-copy strong { font-size: var(--fs-14); }
.template-copy span { color: var(--ink-3); font-size: var(--fs-12); line-height: 1.55; }

.detail-link,
.unavailable {
  position: absolute;
  right: var(--space-3);
  bottom: var(--space-2);
  font-size: var(--fs-12);
}

.unavailable { color: var(--ink-4); }

.template-preview {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  color: var(--ink-2);
  line-height: 1.7;
}

.template-preview p { margin: 0; }

@media (max-width: 62rem) {
  .template-selector { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 40rem) {
  .template-selector { grid-template-columns: 1fr; }
}
</style>
