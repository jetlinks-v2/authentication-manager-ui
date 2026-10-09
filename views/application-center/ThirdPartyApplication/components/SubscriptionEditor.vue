<template>
  <a-drawer :open="open" :width="720" :title="$t(subscription ? 'ApiApplication.subscription.edit' : 'ApiApplication.subscription.create')"
    :mask-closable="false" :closable="!saving" @close="emit('update:open', false)">
    <a-spin :spinning="catalogLoading">
      <a-alert v-if="catalogError" type="error" show-icon :message="$t('ApiApplication.subscription.catalogError')" :description="catalogError" class="editor-alert" />
      <a-alert v-if="operationError" type="error" show-icon :message="operationError" class="editor-alert" />
      <SubscriptionValidation :validation="validation" class="editor-alert" />
      <a-form layout="vertical" :model="form">
        <a-form-item :label="$t('ApiApplication.subscription.name')" required>
          <a-input v-model:value="form.name" :maxlength="128" show-count :disabled="saving" />
        </a-form-item>
        <a-form-item :label="$t('ApiApplication.subscription.description')">
          <a-textarea v-model:value="form.description" :maxlength="1024" :rows="3" show-count :disabled="saving" />
        </a-form-item>
        <a-form-item :label="$t('ThirdPartyApplication.subscription.scopes')">
          <div v-for="(scope, index) in form.scopes" :key="index" class="scope-card">
            <div class="scope-head">
              <strong>{{ $t('ThirdPartyApplication.subscription.scopeIndex', { index: index + 1 }) }}</strong>
              <a-button type="text" danger :disabled="saving" @click="removeScope(index)">{{ $t('ApiApplication.actions.delete') }}</a-button>
            </div>
            <a-select v-model:value="scope.eventTypes" mode="multiple" show-search allow-clear option-filter-prop="label"
              :disabled="saving" :options="eventOptions(scope)" class="event-select"
              :placeholder="$t(events.length ? 'ApiApplication.subscription.selectEvents' : 'ApiApplication.subscription.noEvents')" />
            <div class="event-previews">
              <a-button v-for="id in scope.eventTypes" :key="id" type="link" size="small" :disabled="!events.some(item => item.id === id)"
                @click="preview = events.find(item => item.id === id)">{{ events.find(item => item.id === id)?.name || id }} · {{ $t('ApiApplication.subscription.schema') }}</a-button>
            </div>
            <a-typography-text v-if="Object.keys(scope.configuration).length" type="secondary">
              {{ $t('ThirdPartyApplication.subscription.sourceConfigurationPreserved') }}
            </a-typography-text>
          </div>
          <a-button :disabled="saving" @click="addScope">{{ $t('ThirdPartyApplication.subscription.addScope') }}</a-button>
          <p class="field-note">{{ $t('ThirdPartyApplication.subscription.scopeHint') }}</p>
          <p v-if="!events.length" class="field-note">{{ $t('ApiApplication.subscription.noEventsHint') }}</p>
        </a-form-item>
        <a-form-item :label="$t('ApiApplication.subscription.channel')">
          <a-select :value="form.channelProvider" allow-clear :disabled="saving" :options="channelOptions"
            :placeholder="$t(channels.length ? 'ApiApplication.subscription.selectChannel' : 'ApiApplication.subscription.noChannels')"
            @update:value="changeChannel" />
          <div v-if="!channels.length" class="field-note">{{ $t('ApiApplication.subscription.noChannelsHint') }}</div>
        </a-form-item>
        <HttpHookFields v-if="form.channelProvider === 'http-hook'" :model-value="http" :disabled="saving"
          @update:model-value="Object.assign(http, $event)" />
        <a-alert v-else-if="form.channelProvider && channelAvailable" type="warning" show-icon class="editor-alert"
          :message="$t('ThirdPartyApplication.subscription.channelFormUnavailable')" />
        <a-alert v-if="form.channelProvider && !channelAvailable" type="warning" show-icon class="editor-alert"
          :message="$t('ApiApplication.subscription.unavailableChannel')" />
        <a-alert v-if="formError" type="warning" show-icon :message="formError" />
      </a-form>
    </a-spin>
    <template #footer>
      <div class="editor-footer">
        <span>{{ $t(subscription?.state === 'enabled' ? 'ApiApplication.subscription.enabledEditHint' : 'ApiApplication.subscription.draftHint') }}</span>
        <a-space>
          <a-button :disabled="saving" @click="emit('update:open', false)">{{ $t('ApiApplication.actions.cancel') }}</a-button>
          <a-button :loading="saving" :disabled="saving || catalogLoading || catalogError || !!formError" @click="emit('validate', payload())">{{ $t('ApiApplication.subscription.validate') }}</a-button>
          <a-button type="primary" :loading="saving" :disabled="saving || !form.name.trim() || !!formError" @click="emit('save', payload())">{{ $t('ApiApplication.actions.save') }}</a-button>
        </a-space>
      </div>
    </template>
  </a-drawer>
  <a-modal :open="!!preview" :title="preview?.name" :footer="null" :width="680" @cancel="preview = undefined">
    <p>{{ preview?.description }}</p>
    <a-typography-text type="secondary">{{ preview?.id }} · v{{ preview?.version || '-' }}</a-typography-text>
    <pre class="event-schema">{{ JSON.stringify(preview?.schema || {}, null, 2) }}</pre>
  </a-modal>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ApplicationSubscription, SubscriptionChannel, SubscriptionConfiguration, SubscriptionEvent, SubscriptionValidation as Validation } from '@authentication-manager-ui/api/application-center/applicationSubscription'
import { useSubscriptionEditorForm } from '../useSubscriptionEditorForm'
import HttpHookFields from './HttpHookFields.vue'
import SubscriptionValidation from './SubscriptionValidation.vue'
const props = defineProps<{
  open: boolean
  subscription?: ApplicationSubscription
  events: SubscriptionEvent[]
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
const preview = ref<SubscriptionEvent>()
const { form, http, formError, payload, eventOptions, channelOptions, channelAvailable, addScope, removeScope, changeChannel } =
  useSubscriptionEditorForm(() => props, () => emit('change'))
</script>
<style scoped>
.editor-alert { margin-bottom: 16px; }.scope-card { padding: 12px; border: 1px solid var(--line); border-radius: var(--r-2); margin-bottom: 12px; }
.scope-head { display: flex; align-items: center; justify-content: space-between; }.event-select { width: 100%; }.event-previews { display: flex; flex-wrap: wrap; gap: 4px; }
.event-schema { max-height: 360px; overflow: auto; padding: 12px; background: var(--bg); white-space: pre-wrap; word-break: break-word; }
.field-note, .editor-footer span { color: var(--ink-4); font-size: var(--fs-12); }.editor-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
</style>
