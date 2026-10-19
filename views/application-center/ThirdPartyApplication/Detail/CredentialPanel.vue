<template>
  <a-spin :spinning="loading">
    <a-alert v-if="error" type="error" show-icon :message="$t('ThirdPartyApplication.credential.loadError')" />
    <a-empty v-else-if="!providers.length" :description="$t('ThirdPartyApplication.credential.empty')" />
    <div v-for="provider in providers" :key="provider.type" class="credential-card">
      <div class="section-head">
        <div><h3>{{ provider.type }}</h3><p>{{ $t('ThirdPartyApplication.credential.description') }}</p></div>
        <a-badge :status="credentialOf(provider.type)?.state === 'active' ? 'success' : 'default'"
          :text="credentialStateText(provider.type)" />
      </div>
      <a-descriptions :column="1" bordered size="small">
        <a-descriptions-item :label="$t('ThirdPartyApplication.credential.clientId')">
          <a-typography-text v-if="visibleCredentialOf(provider.type)?.clientId" copyable :content="visibleCredentialOf(provider.type)?.clientId">{{ visibleCredentialOf(provider.type)?.clientId }}</a-typography-text><span v-else>-</span>
        </a-descriptions-item>
        <a-descriptions-item :label="$t('ThirdPartyApplication.credential.secret')">
          <a-space v-if="secret?.type === provider.type && secret.clientSecret">
            <a-typography-text copyable :content="secret.clientSecret" class="secret-value">{{ secret.clientSecret }}</a-typography-text>
            <a-button type="link" size="small" @click="clearSecret">{{ $t('ThirdPartyApplication.credential.hide') }}</a-button>
          </a-space>
          <span v-else>{{ visibleCredentialOf(provider.type)?.secretHint || '-' }}</span>
        </a-descriptions-item>
        <a-descriptions-item :label="$t('ThirdPartyApplication.credential.endpoint')">{{ provider.tokenEndpoint || '-' }}</a-descriptions-item>
        <a-descriptions-item :label="$t('ThirdPartyApplication.credential.grantType')">{{ provider.grantType || '-' }}</a-descriptions-item>
        <a-descriptions-item :label="$t('ThirdPartyApplication.credential.authMethods')">{{ provider.clientAuthMethods?.join(' / ') || '-' }}</a-descriptions-item>
      </a-descriptions>
      <a-form v-if="configurations[provider.type] && credentialOf(provider.type)?.state !== 'active'" layout="vertical" class="credential-config">
        <a-form-item v-for="field in provider.configMetadata?.properties || []" :key="field.id"
          :label="field.name || field.id" :extra="field.description">
          <MetadataValueItem v-model="configurations[provider.type][field.id]" :item="{ ...field, valueType: field.valueType || { type: 'string' } }" />
        </a-form-item>
      </a-form>
      <a-space class="actions">
        <a-button v-if="credentialOf(provider.type)?.state !== 'active'" type="primary" :loading="saving" @click="enable(applicationId, provider.type, configurations[provider.type] || {})">{{ $t('ThirdPartyApplication.credential.enable') }}</a-button>
        <template v-else>
          <a-button v-if="provider.features?.includes('reveal')" :loading="saving" @click="reveal(applicationId, provider.type)">{{ $t('ThirdPartyApplication.credential.reveal') }}</a-button>
          <a-popconfirm v-if="provider.features?.includes('rotate')" :title="$t('ThirdPartyApplication.credential.rotateConfirm')" @confirm="rotate(applicationId, provider.type)">
            <a-button :loading="saving">{{ $t('ThirdPartyApplication.credential.rotate') }}</a-button>
          </a-popconfirm>
          <a-popconfirm :title="$t('ThirdPartyApplication.credential.revokeConfirm')" @confirm="revoke(applicationId, provider.type)">
            <a-button danger :loading="saving">{{ $t('ThirdPartyApplication.credential.revoke') }}</a-button>
          </a-popconfirm>
        </template>
      </a-space>
      <a-alert v-if="secret?.type === provider.type && secret.clientSecret" type="warning" show-icon class="secret-panel"
        :message="$t('ThirdPartyApplication.credential.secretNotice')" />
    </div>
  </a-spin>
</template>

<script setup lang="ts">
import { reactive, watch, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCredential } from './useCredential'
const props = defineProps<{ applicationId: string; active: boolean }>()
const { t: $t } = useI18n()
const configurations = reactive<Record<string, Record<string, unknown>>>({})
const { providers, credentials, secret, loading, saving, error, load, clearSecret, enable, reveal, rotate, revoke } = useCredential()
const credentialOf = (type: string) => credentials.value.find(item => item.type === type)
const visibleCredentialOf = (type: string) => {
  const credential = credentialOf(type)
  return credential?.state === 'revoked' ? undefined : credential
}
const credentialStateText = (type: string) => {
  const state = credentialOf(type)?.state || 'unconfigured'
  return $t(`ThirdPartyApplication.credential.state.${state}`)
}
watch(() => [props.active, props.applicationId] as const, ([active, id]) => {
  if (active && id) {
    void load(id).then(() => providers.value.forEach(provider => { configurations[provider.type] = {} }))
  } else clearSecret()
}, { immediate: true })
onBeforeUnmount(clearSecret)
</script>

<style scoped>
.credential-card { padding: var(--space-4); border: 1px solid var(--line-strong); border-radius: var(--r-2); margin-bottom: var(--space-3); }
.section-head { display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--space-3); }
.section-head h3 { margin: 0; }
.section-head p { color: var(--ink-4); margin: 4px 0 0; }
.credential-config, .actions, .secret-panel { margin-top: var(--space-3); }
.secret-value { overflow-wrap: anywhere; }
</style>
