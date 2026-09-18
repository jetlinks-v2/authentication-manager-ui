<template>
  <BasisField
    :label="$t('Basis.Form.436809-3')"
    name="webKey"
    :column="offset + 1"
    :tooltip="$t('Basis.Form.436809-4')"
    :editing="editing"
    :display="webKey || placeholder"
  >
    <a-input v-model:value="webKeyModel" :placeholder="$t('Basis.Form.436809-5')" />
  </BasisField>
  <BasisField
    :label="$t('Basis.Form.436809-6')"
    name="apiKey"
    :column="offset + 2"
    :tooltip="$t('Basis.Form.436809-7')"
    :editing="editing"
    :display="apiKey || placeholder"
  >
    <a-input v-model:value="apiKeyModel" :placeholder="$t('Basis.Form.436809-8')" />
  </BasisField>
  <BasisField
    :label="$t('Basis.Form.436809-9')"
    :column="offset + 3"
    :tooltip="$t('Basis.Form.436809-10')"
    :editing="editing"
    :display="secretDisplay"
  >
    <a-input-password v-model:value="secretKeyModel" :placeholder="$t('Basis.Form.436809-11')" />
  </BasisField>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BasisField from './BasisField.vue'

const props = defineProps({
  webKey: String,
  apiKey: String,
  secretKey: String,
  /** 本组字段在分组内的起始列序号（从 0 开始）。 */
  offset: {
    type: Number,
    default: 0,
  },
  editing: {
    type: Boolean,
    default: true,
  },
  secretDisplay: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '',
  },
})

const emit = defineEmits([
  'update:webKey',
  'update:apiKey',
  'update:secretKey',
])

const webKeyModel = computed({
  get: () => props.webKey,
  set: value => emit('update:webKey', value),
})
const apiKeyModel = computed({
  get: () => props.apiKey,
  set: value => emit('update:apiKey', value),
})
const secretKeyModel = computed({
  get: () => props.secretKey,
  set: value => emit('update:secretKey', value),
})
</script>