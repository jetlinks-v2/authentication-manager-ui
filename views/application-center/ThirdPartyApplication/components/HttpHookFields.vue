<template>
  <a-form-item :label="$t('ThirdPartyApplication.subscription.endpoint')" required>
    <a-input :value="modelValue.endpoint" :disabled="disabled" :placeholder="$t('ThirdPartyApplication.subscription.endpointPlaceholder')"
      @update:value="value => emit('update:modelValue', { ...modelValue, endpoint: value })" />
  </a-form-item>
  <a-form-item :label="$t('ThirdPartyApplication.subscription.httpMethod')">
    <a-select :value="modelValue.method" :disabled="disabled" :options="['POST', 'PUT', 'PATCH'].map(value => ({ value, label: value }))"
      @update:value="value => emit('update:modelValue', { ...modelValue, method: value })" />
  </a-form-item>
  <a-form-item :label="$t('ThirdPartyApplication.subscription.headers')" :extra="$t('ThirdPartyApplication.subscription.httpHookHint')">
    <a-space v-for="(header, index) in modelValue.headers" :key="index" class="header-row">
      <a-input :value="header.name" :disabled="disabled" :placeholder="$t('ThirdPartyApplication.subscription.headerName')"
        @update:value="value => updateHeader(index, { ...header, name: value })" />
      <a-input :value="header.value" :disabled="disabled" :placeholder="$t('ThirdPartyApplication.subscription.headerValue')"
        @update:value="value => updateHeader(index, { ...header, value })" />
      <a-button type="text" danger :disabled="disabled" @click="removeHeader(index)">{{ $t('ApiApplication.actions.delete') }}</a-button>
    </a-space>
    <a-button :disabled="disabled" @click="emit('update:modelValue', { ...modelValue, headers: [...modelValue.headers, { name: '', value: '' }] })">
      {{ $t('ThirdPartyApplication.subscription.addHeader') }}
    </a-button>
  </a-form-item>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { HeaderRow, HttpHookForm } from '../useSubscriptionEditorForm'
const props = defineProps<{ modelValue: HttpHookForm; disabled?: boolean }>()
const emit = defineEmits<{ (event: 'update:modelValue', value: HttpHookForm): void }>()
const { t: $t } = useI18n()
const updateHeader = (index: number, header: HeaderRow) => emit('update:modelValue', {
  ...props.modelValue, headers: props.modelValue.headers.map((row, i) => i === index ? header : row),
})
const removeHeader = (index: number) => emit('update:modelValue', {
  ...props.modelValue, headers: props.modelValue.headers.filter((_, i) => i !== index),
})
</script>
<style scoped>.header-row { display: flex; margin-bottom: 12px; }.header-row :deep(.ant-space-item:not(:last-child)) { flex: 1; min-width: 0; }</style>
