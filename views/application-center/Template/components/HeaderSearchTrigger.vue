<template>
  <div class="header-search-trigger">
    <span class="header-search-trigger__label">{{ label }}</span>
    <a-popover
      v-model:open="open"
      trigger="click"
      placement="bottom"
      :overlay-inner-style="{ padding: '0.75rem', minWidth: width }"
      @open-change="handleOpenChange"
    >
      <template #content>
        <div class="header-search-trigger__content">
          <a-input
            v-if="type === 'input'"
            v-model:value="draftValue"
            allow-clear
            :placeholder="placeholder"
            @pressEnter="handleConfirm"
          />
          <a-select
            v-else
            v-model:value="draftValue"
            allow-clear
            show-search
            option-filter-prop="label"
            :options="options"
            :placeholder="placeholder"
            style="width: 100%"
          />
          <div class="header-search-trigger__actions">
            <a-button size="small" @click="handleReset">
              {{ $t('ApplicationTemplate.common.clear') }}
            </a-button>
            <a-button type="primary" size="small" @click="handleConfirm">
              {{ $t('ApplicationTemplate.common.confirm') }}
            </a-button>
          </div>
        </div>
      </template>
      <button
        type="button"
        class="header-search-trigger__icon"
        :class="{ 'header-search-trigger__icon--active': isActive }"
      >
        <AIcon :type="isActive ? 'FilterFilled' : 'FilterOutlined'" />
      </button>
    </a-popover>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import { computed, ref, watch } from 'vue'

type SelectOption = {
  label: string
  value: string
}

const props = defineProps({
  label: { type: String, required: true },
  value: { type: String, default: undefined },
  placeholder: { type: String, default: '' },
  type: { type: String as PropType<'input' | 'select'>, default: 'input' },
  options: { type: Array as PropType<SelectOption[]>, default: () => [] },
  width: { type: String, default: '13.75rem' },
})

const emit = defineEmits<{
  (event: 'confirm', value?: string): void
  (event: 'reset'): void
}>()

const open = ref(false)
const draftValue = ref<string | undefined>(props.value)
const isActive = computed(() => !!String(props.value || '').trim())

watch(() => props.value, value => {
  if (!open.value) draftValue.value = value
})

const handleOpenChange = (nextOpen: boolean) => {
  open.value = nextOpen
  if (nextOpen) draftValue.value = props.value
}

const normalizeValue = (value?: string) => {
  const nextValue = String(value || '').trim()
  return nextValue || undefined
}

const handleConfirm = () => {
  emit('confirm', normalizeValue(draftValue.value))
  open.value = false
}

const handleReset = () => {
  draftValue.value = undefined
  emit('reset')
  open.value = false
}
</script>

<style scoped lang="less">
.header-search-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;

  &__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--jet-theme-text-disabled);
    cursor: pointer;

    &:hover,
    &--active {
      color: var(--jet-theme-primary);
    }
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
  }
}
</style>
