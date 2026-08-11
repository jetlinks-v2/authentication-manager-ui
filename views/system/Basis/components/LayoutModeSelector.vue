<template>
  <a-radio-group
    v-model:value="selectedMode"
    class="layout-mode-selector"
    :aria-label="$t('Basis.Form.436809-27')"
  >
    <a-radio
      v-for="mode in modes"
      :key="mode.value"
      :value="mode.value"
      :title="mode.label"
      :aria-label="mode.label"
    >
      <span
        aria-hidden="true"
        :class="['layout-mode-preview', `layout-mode-preview--${mode.value}`]"
      >
        <span class="layout-mode-preview__header" />
        <span class="layout-mode-preview__sider" />
      </span>
    </a-radio>
  </a-radio-group>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { LayoutMode } from '@jetlinks-web-core/store/system'

const props = defineProps({
  value: {
    type: String as PropType<LayoutMode>,
    default: 'side'
  }
})

const emit = defineEmits(['update:value'])
const { t: $t } = useI18n()

const modes = computed<Array<{ value: LayoutMode, label: string }>>(() => [
  { value: 'side', label: $t('Basis.Form.436809-28') },
  { value: 'top', label: $t('Basis.Form.436809-30') },
  { value: 'mix', label: $t('Basis.Form.436809-29') }
])

const selectedMode = computed({
  get: () => props.value,
  set: (value: LayoutMode) => emit('update:value', value)
})
</script>

<style scoped>
.layout-mode-selector {
  --layout-mode-navigation-bg: #001529;
  display: flex;
  gap: var(--space-3);
}

.layout-mode-selector :deep(.ant-radio-wrapper) {
  position: relative;
  margin-inline-end: 0;
}

.layout-mode-selector :deep(.ant-radio) {
  position: absolute;
  opacity: 0;
}

.layout-mode-selector :deep(.ant-radio + span) {
  padding-inline: 0;
}

.layout-mode-preview {
  position: relative;
  display: block;
  width: 2.75rem;
  height: 2.25rem;
  overflow: hidden;
  cursor: pointer;
  background: var(--jet-theme-bg-container);
  border-radius: 0.25rem;
  box-shadow: var(--jet-theme-shadow-secondary);
}

.layout-mode-preview__header,
.layout-mode-preview__sider {
  position: absolute;
  display: none;
  background: var(--layout-mode-navigation-bg);
}

.layout-mode-preview--side .layout-mode-preview__sider {
  inset: 0 auto 0 0;
  display: block;
  width: 0.9375rem;
}

.layout-mode-preview--mix .layout-mode-preview__header,
.layout-mode-preview--top .layout-mode-preview__header {
  inset: 0 0 auto;
  display: block;
  height: 0.5625rem;
}

.layout-mode-preview--mix .layout-mode-preview__sider {
  inset: 0.5625rem auto 0 0;
  display: block;
  width: 0.5rem;
  background: var(--jet-theme-bg-layout);
}

.layout-mode-selector :deep(.ant-radio-wrapper-checked) .layout-mode-preview::after {
  position: absolute;
  right: 0.4375rem;
  bottom: 0.4375rem;
  width: 0.375rem;
  height: 0.625rem;
  content: '';
  border-right: 0.125rem solid var(--jet-theme-primary, var(--accent));
  border-bottom: 0.125rem solid var(--jet-theme-primary, var(--accent));
  transform: rotate(45deg);
}

.layout-mode-selector :deep(.ant-radio-wrapper:focus-within) .layout-mode-preview {
  outline: 0.125rem solid var(--jet-theme-primary-2);
  outline-offset: 0.125rem;
}
</style>
