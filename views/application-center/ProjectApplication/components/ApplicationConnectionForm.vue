<template>
  <div class="connection-form">
    <a-alert v-if="view.error" type="error" show-icon :message="view.error" class="connection-message">
      <template #action><a-button size="small" @click="$emit('reload')">{{ $t('ApplicationConnection.refresh') }}</a-button></template>
    </a-alert>
    <a-form-item v-if="view.allowToggle" :label="$t('ApplicationConnection.configure')">
      <a-switch v-model:checked="draft.enabled" :disabled="disabled" />
    </a-form-item>
    <template v-if="draft.enabled">
      <a-form-item :label="$t('ApplicationConnection.endpoint')" required>
        <a-input v-model:value="draft.endpoint" :disabled="disabled || !view.supported" :placeholder="$t('ApplicationConnection.endpointPlaceholder')" />
      </a-form-item>
      <a-form-item :label="$t('ApplicationConnection.authenticationType')" required>
        <a-select v-model:value="draft.authenticationType" :options="view.typeOptions" :loading="view.loading" :disabled="disabled || draft.authenticationType !== 'oauth2'" />
      </a-form-item>
      <a-alert v-if="!view.loading && !view.error && !view.supported" type="warning" show-icon :message="$t('ApplicationConnection.unsupportedType')" class="connection-message" />
      <template v-if="draft.authenticationType === 'oauth2'">
        <a-form-item :label="$t('ApplicationConnection.tokenUrl')" required>
          <a-input v-model:value="draft.tokenUrl" :maxlength="2048" :disabled="disabled || !view.supported" />
        </a-form-item>
        <a-form-item :label="$t('ApplicationConnection.clientId')" required>
          <a-input v-model:value="draft.clientId" :maxlength="256" :disabled="disabled || !view.supported" autocomplete="off" />
        </a-form-item>
        <a-form-item :label="$t('ApplicationConnection.clientSecret')" :required="!view.secretConfigured">
          <a-space direction="vertical" class="secret-field">
            <a-badge :status="view.secretConfigured ? 'success' : 'default'" :text="$t(view.secretConfigured ? 'ApplicationConnection.secretConfigured' : 'ApplicationConnection.secretNotConfigured')" />
            <a-input-password v-model:value="draft.clientSecret" :disabled="disabled || !view.supported" autocomplete="new-password" :placeholder="$t(view.secretConfigured ? 'ApplicationConnection.keepSecret' : 'ApplicationConnection.secretPlaceholder')" />
          </a-space>
        </a-form-item>
        <a-form-item :label="$t('ApplicationConnection.clientAuthentication')" required>
          <a-select v-model:value="draft.clientAuthentication" :disabled="disabled || !view.supported">
            <a-select-option value="client_secret_basic">{{ $t('ApplicationConnection.basicAuthentication') }}</a-select-option>
            <a-select-option value="client_secret_post">{{ $t('ApplicationConnection.postAuthentication') }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item :label="$t('ApplicationConnection.scope')">
          <a-input v-model:value="draft.scope" :maxlength="1024" :disabled="disabled || !view.supported" />
        </a-form-item>
        <a-form-item :label="$t('ApplicationConnection.timeout')" required>
          <a-input-number v-model:value="draft.timeout" :min="1" :max="30" :precision="0" :disabled="disabled || !view.supported" />
        </a-form-item>
      </template>
    </template>
    <a-alert v-if="view.validationError" type="error" show-icon :message="view.validationError" />
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ApplicationConnectionDraft } from '../applicationCallbackConfiguration'
import type { ApplicationConnectionFormView } from '../useApplicationConnectionForm'
const draft = defineModel<ApplicationConnectionDraft>({ required: true })
defineProps<{ view: ApplicationConnectionFormView; disabled?: boolean }>()
defineEmits<{ (event: 'reload'): void }>()
const { t: $t } = useI18n()
</script>
<style scoped>
.connection-message { margin-bottom: var(--space-3); }
.secret-field { width: 100%; }
</style>
