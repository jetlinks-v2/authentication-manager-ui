<template>
  <a-modal :open="!!action" :title="title" :confirm-loading="saving" :ok-button-props="{ disabled: !valid, danger: action?.state === 'removed' }"
    @cancel="emit('close')" @ok="confirm">
    <a-alert :type="action?.state === 'removed' ? 'warning' : 'info'" show-icon class="state-hint"
      :message="$t(action?.state === 'removed' ? 'ThirdPartyApplication.project.removeHint' : 'ThirdPartyApplication.project.stateHint')" />
    <a-alert v-if="error" type="error" show-icon :message="error" class="state-hint" />
    <a-form layout="vertical">
      <a-form-item :label="$t('ThirdPartyApplication.project.reason')" required>
        <a-input v-model:value="reason" :maxlength="512" show-count :disabled="saving" :placeholder="$t('ThirdPartyApplication.project.reasonPlaceholder')" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { IntegrationAction, ProjectIntegration } from '@authentication-manager-ui/api/application-center/thirdPartyIntegration'
import { useIntegrationState } from '../useIntegrationState'
const props = defineProps<{ action?: IntegrationAction }>()
const emit = defineEmits<{ (event: 'close'): void; (event: 'saved', value: ProjectIntegration): void }>()
const { t: $t } = useI18n()
const { reason, saving, error, valid, title, submit } = useIntegrationState(() => props.action)
const confirm = async () => { const value = await submit(); if (value) { emit('saved', value); emit('close') } }
</script>
<style scoped>.state-hint { margin-bottom: 16px; }</style>
