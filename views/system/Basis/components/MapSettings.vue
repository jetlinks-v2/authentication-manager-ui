<template>
  <RegistryComponent
    is="a-descriptions"
    class="basis-section__descriptions"
    :column="3"
    :colon="false"
    :page-code="BASIS_FORM_PAGE_CODE"
    :code="BASIS_FORM_MODULE_CODE"
  >
    <a-descriptions-item key="webKey" :span="1">
      <BasisField
        :label="$t('Basis.Form.436809-3')"
        name="webKey"
        :tooltip="$t('Basis.Form.436809-4')"
        :editing="editing"
        :display="webKey || placeholder"
      >
        <a-input v-model:value="webKeyModel" :placeholder="$t('Basis.Form.436809-5')" />
      </BasisField>
    </a-descriptions-item>
    <a-descriptions-item key="apiKey" :span="1">
      <BasisField
        :label="$t('Basis.Form.436809-6')"
        name="apiKey"
        :tooltip="$t('Basis.Form.436809-7')"
        :editing="editing"
        :display="apiKey || placeholder"
      >
        <a-input v-model:value="apiKeyModel" :placeholder="$t('Basis.Form.436809-8')" />
      </BasisField>
    </a-descriptions-item>
    <a-descriptions-item key="secretKey" :span="1">
      <BasisField
        :label="$t('Basis.Form.436809-9')"
        :tooltip="$t('Basis.Form.436809-10')"
        :editing="editing"
        :display="secretDisplay"
      >
        <a-input-password v-model:value="secretKeyModel" :placeholder="$t('Basis.Form.436809-11')" />
      </BasisField>
    </a-descriptions-item>
    <slot />
  </RegistryComponent>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BasisField from './BasisField.vue'
import { BASIS_FORM_MODULE_CODE, BASIS_FORM_PAGE_CODE } from '../fieldRegistry'

const props = defineProps({
  webKey: String,
  apiKey: String,
  secretKey: String,
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