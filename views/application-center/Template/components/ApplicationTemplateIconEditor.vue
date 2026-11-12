<template>
  <IconValueEditor
    :model-value="modelValue"
    :preview-size="56"
    :preview-fallback="fallback"
    @update:model-value="emit('update:modelValue', $event)"
    @crop-visible-change="emit('cropVisibleChange', $event)"
    @crop-interact-busy="emit('cropInteractBusy', $event)"
    @library-visible-change="emit('libraryVisibleChange', $event)"
  >
    <template #color>
      <div class="template-palette">
        <ColorPicker
          :hex="hexColor"
          :rgba="currentColor"
          :show-opacity="false"
          :btn-style="{ width: '2.5rem', height: '2.5rem' }"
          @change="selectColor"
        />
        <span>{{ currentColor }}</span>
      </div>
    </template>
  </IconValueEditor>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ColorPicker from 'colorpicker-v3'
import 'colorpicker-v3/style.css'
import { IconValueEditor, formatIconValueColor, parseIconValue } from '@jetlinks-web-core/components/IconValue'

const props = defineProps({ modelValue: { type: String, default: '' }, fallback: { type: String, default: '' } })
const emit = defineEmits<{
  'update:modelValue': [value: string]
  cropVisibleChange: [value: boolean]
  cropInteractBusy: [value: boolean]
  libraryVisibleChange: [value: boolean]
}>()
const parsed = computed(() => parseIconValue(props.modelValue))
const currentColor = computed(() => parsed.value.kind === 'color' ? parsed.value.color : '#1677ff')
const hexColor = computed(() => /^#[\da-f]{3,8}$/i.test(currentColor.value) ? currentColor.value : '#1677ff')
// 调色即回填，保留已有色块标签；打开调色板不会自动改写旧图标。
const selectColor = ({ hex }: { hex: string }) => {
  emit('update:modelValue', formatIconValueColor(hex, parsed.value.kind === 'color' ? parsed.value.label : undefined))
}
</script>

<style scoped>
.template-palette { display: flex; align-items: center; gap: var(--space-3); padding-block: var(--space-2); }
.template-palette > span { color: var(--ink-3); font-size: var(--fs-meta); }
.template-palette :deep(.zs-color-picker-panel__visible) { z-index: 20; }
</style>
