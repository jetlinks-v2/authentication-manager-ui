<template>

  <DefineEmptyCreate>
    <a-button v-if="canUpdate" @click="state.addParameter">
      {{ $t('ApplicationTemplate.parameters.add') }}
    </a-button>
  </DefineEmptyCreate>
  <section v-bind="$attrs" class="external-parameters">
    <header>
      <h2>{{ $t('ApplicationTemplate.parameters.title') }}</h2>
      <p>{{ $t('ApplicationTemplate.parameters.tip') }}</p>
    </header>
    <a-alert v-if="state.error.value" type="error" :message="state.error.value" show-icon />
    <a-form layout="vertical" :disabled="!canUpdate || state.saving.value">
      <a-form-item :label="$t('ApplicationTemplate.parameters.platformId')" :extra="$t('ApplicationTemplate.parameters.platformIdTip')">
        <a-input v-model:value="state.platformId.value" :maxlength="128" :placeholder="$t('ApplicationTemplate.parameters.platformIdPlaceholder')" />
      </a-form-item>
      <a-form-item :label="$t('ApplicationTemplate.parameters.redirectUri')" required>
        <a-input v-model:value="state.redirectUri.value" :placeholder="$t('ApplicationTemplate.parameters.redirectUriPlaceholder')" />
      </a-form-item>
      <div class="external-parameters__declared">
        <h3>{{ $t('ApplicationTemplate.parameters.listTitle') }}</h3>
        <CloudEmpty v-if="!state.parameters.value.length" :description="$t('ApplicationTemplate.parameters.empty')" :search-name="$t('components.EditForm.949962-12')">
          <EmptyCreateButton />
        </CloudEmpty>
        <div v-for="(parameter, index) in state.parameters.value" :key="index" class="external-parameters__row">
          <a-input v-model:value="parameter.name" :placeholder="$t('ApplicationTemplate.parameters.name')" />
          <a-select
            :value="parameter.provider"
            :options="providerOptions"
            @update:value="state.changeProvider(index, String($event))"
          />
          <a-select
            v-if="parameter.provider === 'user'"
            v-model:value="parameter.value"
            :options="fieldOptions"
          />
          <a-input v-else v-model:value="parameter.value" :placeholder="$t('ApplicationTemplate.parameters.value')" />
          <a-button v-if="canUpdate" danger @click="state.removeParameter(index)">
            {{ $t('ApplicationTemplate.parameters.remove') }}
          </a-button>
        </div>
        <EmptyCreateButton v-if="canUpdate" />
      </div>
      <h3>{{ $t('ApplicationTemplate.signature.encryptionTitle') }}</h3>
      <a-form-item :label="$t('ApplicationTemplate.parameters.notificationKeyId')">
        <a-input v-model:value="state.credential.keyId" />
      </a-form-item>
      <a-form-item :label="$t('ApplicationTemplate.parameters.notificationPublicKey')">
        <a-textarea v-model:value="state.credential.publicKey" :rows="5" />
      </a-form-item>
      <a-form-item :label="$t('ApplicationTemplate.parameters.notificationEnabled')">
        <a-switch v-model:checked="state.notification.enabled" />
      </a-form-item>
      <template v-if="state.notification.enabled">
        <a-alert type="info" show-icon :message="$t('ApplicationTemplate.parameters.notificationTip')" />
        <a-form-item :label="$t('ApplicationTemplate.parameters.notificationAddress')" required>
          <a-input v-model:value="state.notification.address" />
        </a-form-item>
      </template>
      <h3>{{ $t('ApplicationTemplate.signature.title') }}</h3>
      <p>{{ $t('ApplicationTemplate.signature.tip') }}</p>
      <a-alert v-if="signature.error.value" type="error" show-icon :message="signature.error.value" />
      <a-spin :spinning="signature.loading.value">
        <a-form-item :label="$t('ApplicationTemplate.signature.status')">
          <a-tag :color="signature.status.value.configured ? 'success' : 'default'">
            {{ $t(signature.status.value.configured ? 'ApplicationTemplate.signature.configured' : 'ApplicationTemplate.signature.notConfigured') }}
          </a-tag>
        </a-form-item>
        <a-form-item v-if="signature.status.value.configured" :label="$t('ApplicationTemplate.signature.keyId')">
          <a-typography-text copyable :content="signature.status.value.keyId || ''">{{ signature.status.value.keyId }}</a-typography-text>
        </a-form-item>
        <a-button v-if="canUpdate && signature.status.value.configured" :loading="signature.saving.value" :disabled="signature.loading.value" @click="signature.reveal">
          {{ $t('ApplicationTemplate.signature.reveal') }}
        </a-button>
        <a-button v-if="canUpdate" :disabled="signature.loading.value || signature.saving.value" @click="signature.edit">
          {{ $t('ApplicationTemplate.signature.edit') }}
        </a-button>
        <a-button v-if="signature.error.value" type="link" :disabled="signature.saving.value" @click="signature.load">{{ $t('ApplicationTemplate.signature.refresh') }}</a-button>
      </a-spin>
    </a-form>
    <a-modal :open="signature.visible.value" :title="$t('ApplicationTemplate.signature.title')" :footer="null" :closable="!signature.saving.value" :mask-closable="!signature.saving.value" :keyboard="!signature.saving.value" destroy-on-close @cancel="signature.close">
      <a-alert v-if="signature.error.value" type="error" show-icon :message="signature.error.value" />
      <a-form v-if="signature.draft.value" layout="vertical" :disabled="signature.saving.value">
        <a-alert type="warning" show-icon :message="$t('ApplicationTemplate.signature.editTip')" />
        <a-form-item :label="$t('ApplicationTemplate.signature.keyId')" :extra="$t('ApplicationTemplate.signature.keyIdTip')" required>
          <a-input v-model:value="signature.draft.value.keyId" :maxlength="128" />
        </a-form-item>
        <a-form-item :label="$t('ApplicationTemplate.signature.secret')" :extra="$t('ApplicationTemplate.signature.invalidSecret')" required>
          <a-input-password v-model:value="signature.draft.value.secret" :maxlength="256" autocomplete="new-password" />
        </a-form-item>
        <a-button :disabled="signature.saving.value" @click="signature.close">{{ $t('ApplicationTemplate.signature.cancel') }}</a-button>
        <a-button type="primary" :loading="signature.saving.value" @click="signature.save">{{ $t('ApplicationTemplate.signature.save') }}</a-button>
      </a-form>
      <template v-else>
        <a-alert type="warning" show-icon :message="$t('ApplicationTemplate.signature.secretTip')" />
        <a-descriptions v-if="signature.secret.value" :column="1" bordered class="external-parameters__secret">
          <a-descriptions-item :label="$t('ApplicationTemplate.signature.keyId')">
            <a-typography-text copyable :content="signature.secret.value.keyId">{{ signature.secret.value.keyId }}</a-typography-text>
          </a-descriptions-item>
          <a-descriptions-item label="Secret">
            <a-typography-text copyable :content="signature.secret.value.secret">{{ signature.secret.value.secret }}</a-typography-text>
          </a-descriptions-item>
        </a-descriptions>
      </template>
    </a-modal>
    <a-space v-if="canUpdate">
      <a-button :disabled="state.saving.value" @click="state.reset">{{ $t('ApplicationTemplate.parameters.reset') }}</a-button>
      <a-button type="primary" :loading="state.saving.value" @click="state.save">
        {{ $t('ApplicationTemplate.config.save') }}
      </a-button>
    </a-space>
  </section>
</template>

<script setup lang="ts">
import { createReusableTemplate } from '@vueuse/core'

import type { PropType } from 'vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { useApplicationTemplateParameters } from './useApplicationTemplateParameters'
import type { useTemplateNotificationSignature } from './useTemplateNotificationSignature'

defineProps({
  canUpdate: { type: Boolean, default: false },
  state: { type: Object as PropType<ReturnType<typeof useApplicationTemplateParameters>>, required: true },
  signature: { type: Object as PropType<ReturnType<typeof useTemplateNotificationSignature>>, required: true },
})
const { t: $t } = useI18n()

const providerOptions = computed(() => [
  { value: 'fixed', label: $t('ApplicationTemplate.parameters.sourceFixed') },
  { value: 'user', label: $t('ApplicationTemplate.parameters.sourceUser') },
])

const fieldOptions = computed(() => [
  { value: 'id', label: $t('ApplicationTemplate.parameters.fieldId') },
  { value: 'username', label: $t('ApplicationTemplate.parameters.fieldUsername') },
])

const [DefineEmptyCreate, EmptyCreateButton] = createReusableTemplate()
</script>

<style scoped>
.external-parameters { display: flex; flex-direction: column; gap: var(--space-4); margin-bottom: var(--space-6); }
.external-parameters h2 { margin: 0; color: var(--ink-1); font-size: var(--fs-16); }
.external-parameters p { margin: var(--space-1) 0 0; color: var(--ink-3); line-height: 1.6; }
.external-parameters__secret { margin-top: var(--space-4); overflow-wrap: anywhere; }
.external-parameters__declared { display: flex; flex-direction: column; gap: var(--space-2); }
.external-parameters__declared h3 { margin: 0; color: var(--ink-1); font-size: var(--fs-14); }
.external-parameters__row { display: grid; grid-template-columns: minmax(0, 1fr) 8rem minmax(0, 1fr) auto; gap: var(--space-2); align-items: center; }
@media (max-width: 48rem) {
  .external-parameters__row { grid-template-columns: minmax(0, 1fr); }
}
</style>
