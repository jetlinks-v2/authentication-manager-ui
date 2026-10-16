<template>
  <a-modal :open="open" :title="$t('ThirdPartyApplication.project.connect')" :width="760" :confirm-loading="saving"
    :ok-button-props="{ disabled: !profile || !!validation }" :ok-text="$t('ThirdPartyApplication.project.connect')"
    @cancel="emit('update:open', false)" @ok="submitForm">
    <a-alert v-if="error" type="error" show-icon :message="error" class="form-alert" />
    <a-form layout="vertical">
      <a-form-item :label="$t('ThirdPartyApplication.project.profile')" required>
        <a-select v-model:value="profileId" :disabled="saving" show-search option-filter-prop="label"
          :options="applications.map(app => ({ value: app.appId, label: app.name }))" />
      </a-form-item>
    </a-form>
    <a-empty v-if="!applications.length" :description="$t('ThirdPartyApplication.project.noAvailableApplications')" />
    <template v-if="profile">
      <a-alert type="info" show-icon :message="$t('ThirdPartyApplication.project.connectHint')" class="form-alert" />
      <AuthorizationFields :model-value="draft" :profile="profile" :disabled="saving" :runtime-ready="runtimeReady"
        @update:model-value="Object.assign(draft, $event)" />
      <a-alert v-if="validation" type="warning" show-icon :message="validation" />
    </template>
  </a-modal>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { AvailableApplication, ProjectIntegration } from '@authentication-manager-ui/api/application-center/thirdPartyIntegration'
import AuthorizationFields from './AuthorizationFields.vue'
import { useConnectApplication } from '../useConnectApplication'
const props = defineProps<{ open: boolean; projectId: string; applications: AvailableApplication[]; runtimeReady: boolean }>()
const emit = defineEmits<{ (event: 'update:open', value: boolean): void; (event: 'saved', value: ProjectIntegration): void }>()
const { t: $t } = useI18n()
const { profileId, profile, draft, validation, saving, error, submit } = useConnectApplication(() => props)
const submitForm = async () => { const value = await submit(); if (value) { emit('saved', value); emit('update:open', false) } }
</script>
<style scoped>.form-alert { margin-bottom: 16px; }</style>
