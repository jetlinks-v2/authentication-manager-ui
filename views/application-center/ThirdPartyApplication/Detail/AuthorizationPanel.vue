<template>
  <div>
    <div class="grant-head">
      <p>{{ $t('ThirdPartyApplication.project.authorizationHint') }}</p>
      <a-space>
        <a-popconfirm :title="$t('ThirdPartyApplication.project.discardConfirm')" @confirm="emit('reload')">
          <a-button :disabled="saving">{{ $t('ThirdPartyApplication.project.refresh') }}</a-button>
        </a-popconfirm>
        <a-button type="primary" :loading="saving" :disabled="!editable || !!validation" @click="save">{{ $t('ApiApplication.actions.save') }}</a-button>
      </a-space>
    </div>
    <a-descriptions size="small" :column="2">
      <a-descriptions-item :label="$t('ThirdPartyApplication.project.authorizationRevision')">{{ relation.authorizationRevision }}</a-descriptions-item>
      <a-descriptions-item :label="$t('ThirdPartyApplication.project.reviewRevision')">{{ profile?.reviewRevision ?? '-' }}</a-descriptions-item>
    </a-descriptions>
    <a-alert v-if="!profile" type="warning" show-icon :message="$t('ThirdPartyApplication.project.approvalUnavailable')" class="panel-alert" />
    <a-alert v-else-if="!editable" type="warning" show-icon :message="$t('ThirdPartyApplication.project.disabledAuthorization')" class="panel-alert" />
    <a-alert v-if="error" type="error" show-icon :message="error" class="panel-alert" />
    <AuthorizationFields :model-value="draft" :profile="profile" :disabled="saving || !editable" :runtime-ready="runtimeReady"
      @update:model-value="Object.assign(draft, $event)" />
    <a-alert v-if="editable && validation" type="warning" show-icon :message="validation" />
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { AvailableApplication, ProjectIntegration } from '@authentication-manager-ui/api/application-center/thirdPartyIntegration'
import AuthorizationFields from '../components/AuthorizationFields.vue'
import { useProjectAuthorization } from './useProjectAuthorization'
const props = defineProps<{ relation: ProjectIntegration; profile?: AvailableApplication; runtimeReady: boolean }>()
const emit = defineEmits<{ (event: 'saved', value: ProjectIntegration): void; (event: 'reload'): void }>()
const { t: $t } = useI18n()
const { draft, validation, editable, saving, error, submit } = useProjectAuthorization(() => props)
const save = async () => { const result = await submit(); if (result) emit('saved', result) }
</script>
<style scoped>
.grant-head { display: flex; gap: 16px; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
.grant-head p { color: var(--ink-4); }.panel-alert { margin-bottom: 16px; }
</style>
