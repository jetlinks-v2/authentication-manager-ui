<template>
  <DefineSignatureFields>
    <a-alert v-if="signature.error.value" type="error" show-icon :message="signature.error.value" />
    <a-spin :spinning="signature.loading.value">
      <div class="external-parameters__signature-values">
        <span class="external-parameters__signature-label">{{ $t('ApplicationTemplate.signature.keyId') }}</span>
        <a-typography-text v-if="signature.status.value.keyId" copyable :content="signature.status.value.keyId">
          {{ signature.status.value.keyId }}
        </a-typography-text>
        <span v-else class="external-parameters__empty">{{ notConfigured }}</span>
      </div>
      <div class="external-parameters__signature-values">
        <span class="external-parameters__signature-label">Secret</span>
        <span>{{ signature.status.value.configured ? '••••••••••••••••' : notConfigured }}</span>
        <a-tag :color="signature.status.value.configured ? 'success' : 'default'">
          {{ signature.status.value.configured ? $t('ApplicationTemplate.signature.configured') : notConfigured }}
        </a-tag>
      </div>
      <a-space v-if="canUpdate || signature.error.value" wrap class="external-parameters__signature-actions">
        <a-button v-if="canUpdate && signature.status.value.configured" size="small" :loading="signature.saving.value" :disabled="signature.loading.value" @click="signature.reveal">
          {{ $t('ApplicationTemplate.signature.reveal') }}
        </a-button>
        <a-button v-if="canUpdate" size="small" :disabled="signature.loading.value || signature.saving.value" @click="signature.edit">
          {{ $t('ApplicationTemplate.signature.edit') }}
        </a-button>
        <a-button v-if="signature.error.value" type="link" size="small" :disabled="signature.saving.value" @click="signature.load">
          {{ $t('ApplicationTemplate.signature.refresh') }}
        </a-button>
      </a-space>
    </a-spin>
  </DefineSignatureFields>

  <section v-bind="$attrs" class="external-parameters">
    <header class="external-parameters__header">
      <h2>{{ $t(editing ? 'ApplicationTemplate.parameters.edit' : 'ApplicationTemplate.parameters.view') }}</h2>
      <a-space v-if="canUpdate">
        <template v-if="editing">
          <a-button :disabled="state.saving.value" @click="state.cancel">{{ $t('ApplicationTemplate.common.cancel') }}</a-button>
          <a-button type="primary" :loading="state.saving.value" @click="state.save">
            <template #icon><AIcon type="SaveOutlined" /></template>
            {{ $t('ApplicationTemplate.parameters.save') }}
          </a-button>
        </template>
        <a-button v-else type="primary" @click="state.edit">
          <template #icon><AIcon type="EditOutlined" /></template>
          {{ $t('ApplicationTemplate.parameters.edit') }}
        </a-button>
      </a-space>
    </header>

    <a-alert v-if="state.error.value" type="error" :message="state.error.value" show-icon />

    <a-form v-if="editing" layout="vertical" :disabled="state.saving.value" class="external-parameters__form">
      <a-form-item>
        <template #label>
          <span class="external-parameters__label">
            {{ $t('ApplicationTemplate.parameters.platformId') }}
            <a-tooltip :title="$t('ApplicationTemplate.parameters.platformIdTip')"><AIcon type="QuestionCircleOutlined" /></a-tooltip>
          </span>
        </template>
        <a-input v-model:value="state.platformId.value" :maxlength="128" :aria-label="$t('ApplicationTemplate.parameters.platformId')" :placeholder="$t('ApplicationTemplate.parameters.platformIdPlaceholder')" />
      </a-form-item>
      <a-form-item :label="$t('ApplicationTemplate.parameters.redirectUri')" required>
        <a-input v-model:value="state.redirectUri.value" :aria-label="$t('ApplicationTemplate.parameters.redirectUri')" :placeholder="$t('ApplicationTemplate.parameters.redirectUriPlaceholder')" />
      </a-form-item>
      <a-form-item>
        <template #label>
          <span class="external-parameters__label">
            {{ $t('ApplicationTemplate.parameters.notificationEnabled') }}
            <a-tooltip :title="$t('ApplicationTemplate.parameters.notificationTip')"><AIcon type="QuestionCircleOutlined" /></a-tooltip>
          </span>
        </template>
        <a-space>
          <a-switch v-model:checked="state.notification.enabled" size="small" :aria-label="$t('ApplicationTemplate.parameters.notificationEnabled')" />
          <span>{{ notificationStatus }}</span>
        </a-space>
      </a-form-item>

      <div v-if="state.notification.enabled" class="external-parameters__group">
        <a-form-item :label="$t('ApplicationTemplate.parameters.notificationAddress')" required>
          <a-input v-model:value="state.notification.address" :aria-label="$t('ApplicationTemplate.parameters.notificationAddress')" :placeholder="$t('ApplicationTemplate.parameters.redirectUriPlaceholder')" />
        </a-form-item>
      </div>

      <div class="external-parameters__group">
        <h3>{{ $t('ApplicationTemplate.signature.encryptionTitle') }}</h3>
        <div class="external-parameters__rsa-fields">
          <a-form-item :label="$t('ApplicationTemplate.parameters.notificationKeyId')">
            <a-input v-model:value="state.credential.keyId" :aria-label="$t('ApplicationTemplate.parameters.notificationKeyId')" :placeholder="$t('ApplicationTemplate.parameters.notificationKeyId')" />
          </a-form-item>
          <a-form-item :label="$t('ApplicationTemplate.parameters.notificationPublicKey')">
            <a-textarea v-model:value="state.credential.publicKey" :auto-size="{ minRows: 1, maxRows: 5 }" :aria-label="$t('ApplicationTemplate.parameters.notificationPublicKey')" :placeholder="$t('ApplicationTemplate.parameters.notificationPublicKey')" />
          </a-form-item>
        </div>
      </div>

      <div class="external-parameters__group">
        <h3 class="external-parameters__label">
          {{ $t('ApplicationTemplate.signature.title') }}
          <a-tooltip :title="$t('ApplicationTemplate.signature.tip')"><AIcon type="QuestionCircleOutlined" /></a-tooltip>
        </h3>
        <SignatureFields />
      </div>

      <div class="external-parameters__declared">
        <h3 class="external-parameters__label">
          {{ $t('ApplicationTemplate.parameters.listTitle') }}
          <span class="external-parameters__optional">{{ $t('ApplicationTemplate.parameters.optional') }}</span>
        </h3>
        <p v-if="!state.parameters.value.length" class="external-parameters__empty">{{ notConfigured }}</p>
        <div v-for="(parameter, index) in state.parameters.value" :key="index" class="external-parameters__row">
          <a-input v-model:value="parameter.name" :aria-label="$t('ApplicationTemplate.parameters.name')" :placeholder="$t('ApplicationTemplate.parameters.name')" />
          <a-select
            :value="parameter.provider"
            :aria-label="$t('ApplicationTemplate.parameters.provider')"
            :options="providerOptions"
            @update:value="state.changeProvider(index, String($event))"
          />
          <a-select
            v-if="parameter.provider === 'user'"
            v-model:value="parameter.value"
            :aria-label="$t('ApplicationTemplate.parameters.value')"
            :options="fieldOptions"
          />
          <a-input v-else v-model:value="parameter.value" :aria-label="$t('ApplicationTemplate.parameters.value')" :placeholder="$t('ApplicationTemplate.parameters.value')" />
          <a-button type="text" danger :aria-label="$t('ApplicationTemplate.parameters.remove')" :title="$t('ApplicationTemplate.parameters.remove')" @click="state.removeParameter(index)">
            <template #icon><AIcon type="DeleteOutlined" /></template>
          </a-button>
        </div>
        <a-button type="dashed" block @click="state.addParameter">
          <template #icon><AIcon type="PlusOutlined" /></template>
          {{ $t('ApplicationTemplate.parameters.add') }}
        </a-button>
      </div>
    </a-form>

    <a-descriptions v-else :column="1" :colon="false" class="external-parameters__view">
      <a-descriptions-item v-for="item in viewItems" :key="item.label" :label="item.label">{{ item.value }}</a-descriptions-item>
      <a-descriptions-item>
        <template #label>
          <span class="external-parameters__label">
            {{ $t('ApplicationTemplate.signature.title') }}
            <a-tooltip :title="$t('ApplicationTemplate.signature.tip')"><AIcon type="QuestionCircleOutlined" /></a-tooltip>
          </span>
        </template>
        <SignatureFields />
      </a-descriptions-item>
      <a-descriptions-item :label="$t('ApplicationTemplate.parameters.listTitle')">
        <span v-if="!state.parameters.value.length" class="external-parameters__empty">{{ notConfigured }}</span>
        <div v-else class="external-parameters__parameter-values">
          <div v-for="(parameter, index) in state.parameters.value" :key="index" class="external-parameters__parameter-value">
            <span>{{ parameter.name || notConfigured }}</span>
            <a-tag>{{ $t(parameter.provider === 'user' ? 'ApplicationTemplate.parameters.sourceUser' : 'ApplicationTemplate.parameters.sourceFixed') }}</a-tag>
            <span>{{ parameter.provider === 'user' ? $t(parameter.value === 'username' ? 'ApplicationTemplate.parameters.fieldUsername' : 'ApplicationTemplate.parameters.fieldId') : parameter.value || notConfigured }}</span>
          </div>
        </div>
      </a-descriptions-item>
    </a-descriptions>

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
        <a-space>
          <a-button :disabled="signature.saving.value" @click="signature.close">{{ $t('ApplicationTemplate.signature.cancel') }}</a-button>
          <a-button type="primary" :loading="signature.saving.value" @click="signature.save">{{ $t('ApplicationTemplate.signature.save') }}</a-button>
        </a-space>
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
  </section>
</template>

<script setup lang="ts">
import { createReusableTemplate } from '@vueuse/core'
import type { PropType } from 'vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { useApplicationTemplateParameters } from './useApplicationTemplateParameters'
import type { useTemplateNotificationSignature } from './useTemplateNotificationSignature'

const props = defineProps({
  canUpdate: { type: Boolean, default: false },
  state: { type: Object as PropType<ReturnType<typeof useApplicationTemplateParameters>>, required: true },
  signature: { type: Object as PropType<ReturnType<typeof useTemplateNotificationSignature>>, required: true },
})
const { t: $t } = useI18n()
const editing = computed(() => props.canUpdate && props.state.editing.value)
const notConfigured = computed(() => $t('Basis.Config.notConfigured'))
const notificationStatus = computed(() => $t(props.state.notification.enabled
  ? 'ApplicationTemplate.parameters.notificationOn'
  : 'ApplicationTemplate.parameters.notificationOff'))
const viewItems = computed(() => [
  { label: $t('ApplicationTemplate.parameters.platformId'), value: props.state.platformId.value.trim() || notConfigured.value },
  { label: $t('ApplicationTemplate.parameters.redirectUri'), value: props.state.redirectUri.value.trim() || notConfigured.value },
  { label: $t('ApplicationTemplate.parameters.notificationEnabled'), value: notificationStatus.value },
  ...(props.state.notification.enabled
    ? [{ label: $t('ApplicationTemplate.parameters.notificationAddress'), value: props.state.notification.address.trim() || notConfigured.value }]
    : []),
  { label: $t('ApplicationTemplate.parameters.notificationKeyId'), value: props.state.credential.keyId.trim() || notConfigured.value },
  { label: $t('ApplicationTemplate.parameters.notificationPublicKey'), value: props.state.credential.publicKey.trim() || notConfigured.value },
])
const providerOptions = computed(() => [
  { value: 'fixed', label: $t('ApplicationTemplate.parameters.sourceFixed') },
  { value: 'user', label: $t('ApplicationTemplate.parameters.sourceUser') },
])
const fieldOptions = computed(() => [
  { value: 'id', label: $t('ApplicationTemplate.parameters.fieldId') },
  { value: 'username', label: $t('ApplicationTemplate.parameters.fieldUsername') },
])
const [DefineSignatureFields, SignatureFields] = createReusableTemplate()
</script>

<style scoped>
.external-parameters { display: flex; min-width: 0; flex-direction: column; gap: var(--space-4); }
/* 沿用 StickyActionBar 的局部层级，滚动长表单时保持保存入口可见。 */
.external-parameters__header { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding-block: var(--space-2) var(--space-3); border-bottom: 1px solid var(--jet-theme-border-color-1); background: var(--jet-theme-bg-container); }
.external-parameters h2 { margin: 0; color: var(--ink-1); font-size: var(--fs-14); font-weight: 600; }
.external-parameters h3 { margin: 0 0 var(--space-2); color: var(--ink-1); font-size: var(--fs-14); font-weight: 500; }
.external-parameters__label { display: inline-flex; align-items: center; gap: var(--space-1); }
.external-parameters__label :deep(.anticon) { color: var(--ink-4); font-size: var(--fs-12); }
.external-parameters__form { display: flex; min-width: 0; flex-direction: column; gap: var(--space-4); }
.external-parameters__form :deep(.ant-form-item) { margin-bottom: 0; }
.external-parameters__form :deep(.ant-form-item-label) { padding-bottom: var(--space-1); }
.external-parameters__group { min-width: 0; padding: var(--space-3); border: 1px solid var(--jet-theme-border-color-1); border-radius: var(--r-4); background: color-mix(in srgb, var(--ink-1) 2%, transparent); }
.external-parameters__rsa-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-2); }
.external-parameters__signature-values { display: flex; align-items: baseline; flex-wrap: wrap; gap: var(--space-2); line-height: 1.8; overflow-wrap: anywhere; }
.external-parameters__signature-label { flex: 0 0 7rem; color: var(--ink-4); font-size: var(--fs-12); }
.external-parameters__signature-values :deep(.ant-tag) { margin: 0; }
.external-parameters__signature-values :deep(.ant-typography) { min-width: 0; overflow-wrap: anywhere; }
.external-parameters__signature-actions { margin-top: var(--space-2); }
.external-parameters__empty, .external-parameters__optional { color: var(--ink-4); }
.external-parameters__optional { font-size: var(--fs-12); font-weight: 400; }
.external-parameters__view :deep(.ant-descriptions-view table) { table-layout: fixed; }
.external-parameters__view :deep(.ant-descriptions-row > td) { padding-block: var(--space-3); border-bottom: 1px dashed var(--jet-theme-border-color-1); }
.external-parameters__view :deep(.ant-descriptions-row:first-child > td) { padding-top: 0; }
.external-parameters__view :deep(.ant-descriptions-row:last-child > td) { border-bottom: 0; }
.external-parameters__view :deep(.ant-descriptions-item-container) { align-items: baseline; gap: var(--space-2); }
.external-parameters__view :deep(.ant-descriptions-item-label) { width: 9rem; flex-shrink: 0; color: var(--ink-4); font-size: var(--fs-12); }
.external-parameters__view :deep(.ant-descriptions-item-content) { min-width: 0; color: var(--ink-1); font-size: var(--fs-12); white-space: pre-wrap; overflow-wrap: anywhere; }
.external-parameters__declared { display: flex; flex-direction: column; gap: var(--space-2); }
.external-parameters__declared h3, .external-parameters__declared p { margin: 0; }
.external-parameters__row { display: grid; grid-template-columns: minmax(0, 1fr) 8rem minmax(0, 1fr) auto; gap: var(--space-2); align-items: start; }
.external-parameters__parameter-value { display: flex; align-items: baseline; flex-wrap: wrap; gap: var(--space-2); overflow-wrap: anywhere; }
.external-parameters__parameter-values { display: flex; min-width: 0; flex-direction: column; gap: var(--space-2); }
.external-parameters__parameter-value :deep(.ant-tag) { margin: 0; }
.external-parameters__secret { margin-top: var(--space-4); overflow-wrap: anywhere; }
@media (max-width: 48rem) {
  .external-parameters__rsa-fields, .external-parameters__row { grid-template-columns: minmax(0, 1fr); }
  .external-parameters__row { padding-bottom: var(--space-3); border-bottom: 1px dashed var(--jet-theme-border-color-1); }
  .external-parameters__view :deep(.ant-descriptions-item-container) { flex-direction: column; gap: var(--space-1); }
  .external-parameters__view :deep(.ant-descriptions-item-label) { width: auto; }
}
</style>
