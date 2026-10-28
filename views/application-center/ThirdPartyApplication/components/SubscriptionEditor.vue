<template>
  <JlDrawerShell :open="open" :width="860" icon="BellOutlined"
    :title="$t(subscription ? 'ApiApplication.subscription.edit' : 'ApiApplication.subscription.create')"
    :mask-closable="false" :keyboard="!saving" @update:open="value => !saving && emit('update:open', value)">
    <a-spin :spinning="catalogLoading">
      <div v-if="open" class="editor-content">
        <a-alert v-if="catalogError" type="error" show-icon :message="$t('ApiApplication.subscription.catalogError')" :description="catalogError" />
        <a-form layout="vertical" :model="form" class="subscription-form">
          <div class="subscription-identity">
            <a-form-item :label="$t('ApiApplication.subscription.name')" required>
              <a-input v-model:value="form.name" :maxlength="128" show-count :disabled="saving" />
            </a-form-item>
            <a-form-item :label="$t('ApiApplication.subscription.description')">
              <a-textarea v-model:value="form.description" :maxlength="1024" :auto-size="{ minRows: 1, maxRows: 2 }" show-count :disabled="saving" />
            </a-form-item>
          </div>
          <SlantedTabs v-model:active-key="activeTab" :options="tabOptions" class="subscription-tabs">
            <template #default="{ option }">
              <div v-if="option.key === 'configuration'" class="configuration-tab tab-content">
                <ContentPanel :title="$t('ApiApplication.subscription.events')" :padding="0" :background="false" fill>
                  <SubscriptionEventPicker v-model="selectedEventIds" :providers="providers"
                    :disabled="saving || catalogLoading || !!catalogError" :loading="catalogLoading" @inspect="showEventDocument" />
                </ContentPanel>
                <a-divider class="configuration-divider" />
                <ContentPanel :title="$t('ThirdPartyApplication.subscription.receiveSettings')" :padding="0" :background="false" fill>
                  <a-form-item :label="$t('ApiApplication.subscription.channel')">
                    <a-select :value="form.channelProvider" allow-clear :disabled="saving" :options="channelOptions"
                      :placeholder="$t(channels.length ? 'ApiApplication.subscription.selectChannel' : 'ApiApplication.subscription.noChannels')"
                      @update:value="changeChannel" />
                    <p v-if="!channels.length" class="field-note">{{ $t('ApiApplication.subscription.noChannelsHint') }}</p>
                  </a-form-item>
                  <HttpHookFields v-if="form.channelProvider === 'http-hook'" :model-value="http" :disabled="saving"
                    @update:model-value="Object.assign(http, $event)" />
                  <a-alert v-else-if="form.channelProvider && channelAvailable" type="warning" show-icon
                    :message="$t('ThirdPartyApplication.subscription.channelFormUnavailable')" />
                  <a-alert v-if="form.channelProvider && !channelAvailable" type="warning" show-icon
                    :message="$t('ApiApplication.subscription.unavailableChannel')" />
                  <p v-if="form.channelProvider === 'http-hook'" class="field-note signing-note">{{ $t('ThirdPartyApplication.subscription.signingHint') }}</p>
                  <a-alert v-if="formError" type="warning" show-icon :message="formError" />
                </ContentPanel>
              </div>
              <SubscriptionEventDocument v-else v-model:event-id="documentEventId" :providers="providers" class="tab-content" />
            </template>
          </SlantedTabs>
        </a-form>
      </div>
    </a-spin>
    <template #foot>
      <div class="editor-footer-shell">
        <div v-if="operationError || validation" class="editor-feedback">
          <a-alert v-if="operationError" type="error" show-icon :message="operationError" />
          <SubscriptionValidation :validation="validation" />
        </div>
        <div class="editor-footer">
          <span class="footer-hint">{{ $t(subscription?.state === 'enabled' ? 'ApiApplication.subscription.enabledEditHint' : 'ApiApplication.subscription.draftHint') }}</span>
          <a-space wrap>
            <a-button :disabled="saving" @click="emit('update:open', false)">{{ $t('ApiApplication.actions.cancel') }}</a-button>
            <a-button :loading="saving" :disabled="saving || catalogLoading || !!catalogError || !!formError" @click="emit('validate', payload())">{{ $t('ApiApplication.subscription.validate') }}</a-button>
            <a-button type="primary" :loading="saving" :disabled="saving || !form.name.trim() || !!formError" @click="emit('save', payload())">{{ $t('ApiApplication.actions.save') }}</a-button>
          </a-space>
        </div>
      </div>
    </template>
  </JlDrawerShell>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SlantedTabs from '@jetlinks-web-core/components/SlantedTabs'
import type { ApplicationSubscription, SubscriptionChannel, SubscriptionConfiguration, SubscriptionEventProvider, SubscriptionValidation as Validation } from '@authentication-manager-ui/api/application-center/applicationSubscription'
import { useSubscriptionEditorForm } from '../useSubscriptionEditorForm'
import HttpHookFields from './HttpHookFields.vue'
import SubscriptionValidation from './SubscriptionValidation.vue'
import SubscriptionEventPicker from './SubscriptionEventPicker.vue'
import SubscriptionEventDocument from './SubscriptionEventDocument.vue'
const props = defineProps<{
  open: boolean
  subscription?: ApplicationSubscription
  providers: SubscriptionEventProvider[]
  channels: SubscriptionChannel[]
  catalogLoading: boolean
  catalogError: string
  saving: boolean
  operationError: string
  validation?: Validation
}>()
const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'save' | 'validate', value: SubscriptionConfiguration): void
  (event: 'change'): void
}>()
const { t: $t } = useI18n()
const { form, http, formError, payload, selectedEventIds, channelOptions, channelAvailable, changeChannel,
  activeTab, documentEventId, tabOptions, showEventDocument } = useSubscriptionEditorForm(() => props, () => emit('change'))
</script>
<style scoped>
.editor-content, .subscription-form { display: grid; gap: var(--space-5); min-width: 0; }
.subscription-identity { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--space-4); }
.subscription-identity :deep(.ant-form-item) { margin-bottom: 0; min-width: 0; }
.subscription-tabs { --slanted-tabs-active-bg: var(--accent-soft); --slanted-tabs-inactive-bg: transparent; --slanted-tabs-panel-bg: var(--bg); }
.tab-content { padding-top: var(--space-5); }
.configuration-tab { display: grid; gap: var(--space-5); min-width: 0; }
.configuration-divider { margin: 0; }
.subscription-form :deep(.ant-form-item-extra) { font-size: var(--fs-12); line-height: var(--lh-normal); overflow-wrap: anywhere; }
.field-note, .footer-hint { color: var(--ink-4); font-size: var(--fs-12); line-height: var(--lh-normal); overflow-wrap: anywhere; }
.field-note { margin: var(--space-2) 0 0; }
.signing-note { margin: 0 0 var(--space-3); }
.editor-footer-shell { display: grid; gap: var(--space-3); width: 100%; min-width: 0; }
.editor-feedback { display: grid; gap: var(--space-2); max-height: min(12rem, 25vh); overflow: auto; overflow-wrap: anywhere; }
.editor-footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: var(--space-3); width: 100%; }
.footer-hint { flex: 1 1 20rem; }
@media (max-width: 40rem) { .subscription-identity { grid-template-columns: minmax(0, 1fr); } }
</style>
