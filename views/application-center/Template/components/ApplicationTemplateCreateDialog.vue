<template>
  <a-modal
    v-model:open="dialogOpen"
    :title="$t('ApplicationTemplate.list.add')"
    :confirm-loading="loading"
    :width="520"
    destroy-on-close
    @ok="handleOk"
    @cancel="dialogOpen = false"
  >
    <a-form ref="formRef" layout="vertical" :model="formData" :rules="rules">
      <a-form-item :label="$t('ApplicationConnection.applicationKind')" name="provider">
        <a-radio-group v-model:value="formData.provider" button-style="solid" :disabled="loading">
          <a-radio-button value="official">{{ $t('ApplicationConnection.businessApplication') }}</a-radio-button>
          <a-radio-button value="third-party">{{ $t('ApplicationConnection.thirdPartyApplication') }}</a-radio-button>
        </a-radio-group>
      </a-form-item>
      <a-form-item :label="$t('ApplicationTemplate.field.name')" name="name">
        <I18nTextField
          v-model:value="formData.name"
          v-model:i18nMessages="formData.i18nMessages"
          field="name"
          :label="$t('ApplicationTemplate.field.name')"
          :maxlength="64"
          :i18n-max-length="64"
          :placeholder="$t('ApplicationTemplate.field.namePlaceholder')"
        />
      </a-form-item>
      <a-form-item :label="$t('ApplicationTemplate.field.code')" name="code">
        <a-input
          v-model:value="formData.code"
          :maxlength="64"
          :placeholder="$t('ApplicationTemplate.field.codePlaceholder')"
        />
      </a-form-item>
      <a-form-item v-if="thirdParty" :label="$t('ApplicationTemplate.parameters.redirectUri')" name="redirectUri">
        <a-input
          v-model:value="formData.redirectUri"
          :disabled="loading"
          :placeholder="$t('ApplicationTemplate.parameters.redirectUriPlaceholder')"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { I18nTextField } from '@jetlinks-web-core/components'
import { useApplicationTemplateCreate } from '../useApplicationTemplateCreate'

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'created', id: string): void
}>()

const { t: $t } = useI18n()
const { dialogOpen, formRef, formData, thirdParty, rules, loading, handleOk } = useApplicationTemplateCreate({
  open: () => props.open,
  onOpenChange: value => emit('update:open', value),
  onCreated: id => emit('created', id),
})
</script>
