<template>
  <DefineCredentialFields v-slot="{ callback = false }">
    <a-form-item :label="$t('ThirdPartyApplication.credential.clientId')">
      <a-input :value="callback ? callbackForm.clientId : clientId" :aria-label="$t('ThirdPartyApplication.credential.clientId')" readonly :placeholder="$t('ThirdPartyApplication.debug.noCredential')" />
    </a-form-item>
    <a-form-item :label="$t('ThirdPartyApplication.credential.secret')" required :extra="$t(callback && callbackIsSample ? 'ThirdPartyApplication.debug.sampleSecretHint' : 'ThirdPartyApplication.debug.secretHint')">
      <a-input-password :value="callback ? callbackForm.secret : clientSecret" :aria-label="$t('ThirdPartyApplication.credential.secret')" :disabled="busy" autocomplete="off"
        @update:value="setCredentialSecret($event, callback)" />
      <a-button v-if="canReveal && (!callback || !callbackIsSample)" type="link" size="small" class="inline-action" :disabled="busy" @click="useCurrentCredential">
        {{ $t('ThirdPartyApplication.debug.useCredential') }}
      </a-button>
    </a-form-item>
  </DefineCredentialFields>
  <DefineResult>
    <SectionCard icon="FileSearchOutlined" :title="$t('ThirdPartyApplication.debug.result')" class="debug-section result-section">
      <template #actions>
        <a-tag v-if="mode === 'callback'">{{ $t('ThirdPartyApplication.debug.callbackSource.' + callbackForm.source) }}</a-tag>
        <a-button v-if="mode === 'call' && callLogFilter" size="small" @click="$emit('logs', callLogFilter)">
          {{ $t('ThirdPartyApplication.logs.view') }}
        </a-button>
        <a-button v-if="busy" size="small" @click="cancel">{{ $t('ThirdPartyApplication.debug.cancel') }}</a-button>
      </template>
      <a-alert v-if="error" type="error" show-icon :message="error" />
      <div v-if="busy" class="result-loading" role="status"><a-spin /><span>{{ $t('ThirdPartyApplication.debug.running') }}</span></div>
      <template v-else-if="mode === 'callback' && verification">
        <a-alert :type="verification.valid ? 'success' : 'error'" show-icon
          :message="$t(callbackIsSample ? (verification.valid ? 'ThirdPartyApplication.debug.sampleVerified' : 'ThirdPartyApplication.debug.sampleFailed')
            : (verification.valid ? 'ThirdPartyApplication.debug.verified' : 'ThirdPartyApplication.debug.verificationFailed'))" />
        <a-descriptions :column="1" size="small" bordered>
          <a-descriptions-item v-for="check in verification.checks" :key="check.name" :label="$t('ThirdPartyApplication.debug.check.' + check.name)">
            <a-badge :status="check.valid ? 'success' : 'error'" :text="$t(check.valid ? 'ThirdPartyApplication.debug.pass' : 'ThirdPartyApplication.debug.fail.' + check.name)" />
          </a-descriptions-item>
        </a-descriptions>
        <a-collapse :bordered="false">
          <a-collapse-panel key="signature" :header="$t('ThirdPartyApplication.debug.signatureDetails')">
            <CodeBlock variant="light" label="SHA-256" :content="verification.bodyHash" />
            <CodeBlock variant="light" :label="$t('ThirdPartyApplication.debug.expectedSignature')" :content="verification.expectedSignature" />
            <CodeBlock variant="light" :label="$t('ThirdPartyApplication.debug.receivedSignature')" :content="verification.receivedSignature" />
          </a-collapse-panel>
        </a-collapse>
      </template>
      <template v-else-if="mode !== 'callback' && response">
        <a-space wrap>
          <a-badge :status="response.ok ? 'success' : 'error'" :text="$t(response.ok ? 'ThirdPartyApplication.debug.requestSucceeded' : 'ThirdPartyApplication.debug.requestFailed')" />
          <a-tag>HTTP {{ response.status }}</a-tag><span>{{ response.elapsed }} ms</span>
        </a-space>
        <a-descriptions v-if="mode === 'token' && token" :column="1" size="small" bordered>
          <a-descriptions-item label="Access Token">
            <a-typography-text :copyable="{ text: token.value }">••••••{{ token.value.slice(-4) }}</a-typography-text>
          </a-descriptions-item>
          <a-descriptions-item :label="$t('ThirdPartyApplication.debug.expiresAt')">
            {{ formatTime(token.expiresAt) }}<a-tag v-if="!tokenValid">{{ $t('ThirdPartyApplication.debug.expired') }}</a-tag>
          </a-descriptions-item>
        </a-descriptions>
        <a-button v-if="mode === 'token' && tokenValid" @click="mode = 'call'">{{ $t('ThirdPartyApplication.debug.tryApi') }}</a-button>
        <a-alert v-if="!response.ok" type="warning" show-icon :message="$t('ThirdPartyApplication.debug.httpHint.' + (mode === 'token' ? 'token' : response.status === 401 ? 'unauthorized' : response.status === 403 ? 'forbidden' : 'other'))" />
        <a-typography-paragraph v-if="mode === 'call' && callAddress" class="request-address">{{ callAddress }}</a-typography-paragraph>
        <CodeBlock variant="light" :label="$t('ThirdPartyApplication.debug.responseBody')" :content="response.body || $t('ThirdPartyApplication.debug.emptyBody')" copyable :copy-title="$t('ThirdPartyApplication.direct.accessGuide.copy')" />
        <a-collapse :bordered="false">
          <a-collapse-panel key="headers" :header="$t('ThirdPartyApplication.debug.responseHeaders')">
            <CodeBlock variant="light" :content="response.headers" />
          </a-collapse-panel>
        </a-collapse>
      </template>
      <a-typography-paragraph v-else-if="!error && mode === 'call'" type="secondary" class="idle-result">{{ $t('ThirdPartyApplication.debug.resultEmpty') }}</a-typography-paragraph>
      <CloudEmpty v-else-if="!error" class="result-empty" :description="$t('ThirdPartyApplication.debug.resultEmpty')" />
    </SectionCard>
  </DefineResult>
  <SegmentPanel :model-value="mode" :options="modes" fill :padding="0" :background="false" class="access-debug" @change="setMode">
    <a-spin :spinning="loading">
      <a-alert v-if="metadataError && (mode !== 'callback' || !callbackIsSample)" type="error" show-icon :message="metadataError" class="debug-notice">
        <template #action><a-button size="small" @click="loadMetadata">{{ $t('ThirdPartyApplication.debug.retry') }}</a-button></template>
      </a-alert>
      <a-alert v-else-if="!loading && (mode !== 'callback' || !callbackIsSample) && (!ready || !credentialActive || (!applicationEnabled && mode !== 'callback'))"
        type="warning" show-icon :message="$t('ThirdPartyApplication.debug.enableFirst')" class="debug-notice">
        <template #action><a-button size="small" @click="$emit('navigate', 'basic')">{{ $t('ThirdPartyApplication.debug.openCredentials') }}</a-button></template>
      </a-alert>
      <div v-show="mode === 'call'" class="call-workspace">
        <DebugApiPicker v-model="apiId" :apis="apis" :loading="loading || catalogLoading" :error="catalogError" :disabled="busy || loading || catalogLoading" @retry="loadCatalog">
          <template #empty><a-button type="link" @click="$emit('navigate', 'grants')">{{ $t('ThirdPartyApplication.direct.accessGuide.authorize') }}</a-button></template>
        </DebugApiPicker>
        <main v-if="mode === 'call' && selectedApi" class="api-workspace">
          <div class="api-columns">
            <div class="request-column">
              <SectionCard icon="ApiOutlined" :title="$t('ThirdPartyApplication.debug.requestTitle')" class="debug-section">
                <a-form layout="vertical" :disabled="busy" @submit.prevent>
                  <a-alert v-if="!tokenValid" type="info" show-icon :message="$t('ThirdPartyApplication.debug.tokenRequired')" class="debug-notice">
                    <template #action><a-button size="small" :disabled="busy" @click="mode = 'token'">{{ $t('ThirdPartyApplication.debug.acquireToken') }}</a-button></template>
                  </a-alert>
                  <div v-if="paths.length" class="request-fields">
                    <a-form-item v-for="parameter in paths" :key="parameter.name" :label="parameter.name" required>
                      <a-input v-model:value="parameter.value" :aria-label="parameter.name" :disabled="busy" />
                    </a-form-item>
                  </div>
                  <a-form-item :label="$t('ThirdPartyApplication.debug.query')" class="request-fields">
                    <div v-for="(parameter, index) in query" :key="index" class="query-row">
                      <a-input v-model:value="parameter.name" :disabled="busy" :aria-label="$t('ThirdPartyApplication.debug.parameterName')" :placeholder="$t('ThirdPartyApplication.debug.parameterName')" />
                      <a-input v-model:value="parameter.value" :disabled="busy" :aria-label="$t('ThirdPartyApplication.debug.parameterValue')" :placeholder="$t('ThirdPartyApplication.debug.parameterValue')" />
                      <a-button type="text" :disabled="busy" :aria-label="$t('ThirdPartyApplication.debug.removeParameter')" @click="removeQuery(index)">
                        <template #icon><AIcon type="DeleteOutlined" /></template>
                      </a-button>
                    </div>
                    <a-button type="link" size="small" :disabled="busy" class="inline-action" @click="addQuery">
                      <template #icon><AIcon type="PlusOutlined" /></template>{{ $t('ThirdPartyApplication.debug.addParameter') }}
                    </a-button>
                  </a-form-item>
                  <template v-if="hasBody">
                    <a-form-item label="Content-Type">
                      <a-select v-model:value="contentType" :disabled="busy" :options="contentTypes" />
                    </a-form-item>
                    <a-form-item :label="$t('ThirdPartyApplication.debug.body')" :validate-status="requestBodyError ? 'error' : undefined" :help="requestBodyError || undefined">
                      <div v-if="contentType === 'application/json'" class="json-editor" :class="{ 'json-editor--error': requestBodyError }">
                        <MonacoEditor v-model="body" theme="vs" language="json" :read-only="busy" :blur-format="false" :init="initBodyEditor"
                          :options="{ minimap: { enabled: false }, wordWrap: 'on', formatOnPaste: false, ariaLabel: $t('ThirdPartyApplication.debug.body') }" />
                      </div>
                      <a-textarea v-else v-model:value="body" :aria-label="$t('ThirdPartyApplication.debug.body')" :disabled="busy" :auto-size="{ minRows: 5, maxRows: 14 }" />
                    </a-form-item>
                  </template>
                  <a-typography-paragraph type="secondary">{{ $t('ThirdPartyApplication.debug.realRequest') }}</a-typography-paragraph>
                  <PageActions>
                    <a-popconfirm v-if="requiresConfirmation" :title="$t('ThirdPartyApplication.debug.writeConfirm')"
                      :disabled="sendDisabled" @confirm="sendApi">
                      <a-button type="primary" :disabled="sendDisabled">{{ $t('ThirdPartyApplication.debug.send') }}</a-button>
                    </a-popconfirm>
                    <a-button v-else type="primary" :disabled="sendDisabled" @click="sendApi">{{ $t('ThirdPartyApplication.debug.send') }}</a-button>
                  </PageActions>
                </a-form>
              </SectionCard>
              <DebugResult />
            </div>
            <DebugApiDocument :api="selectedApi" />
          </div>
        </main>
      </div>
      <div v-if="mode !== 'call'" class="debug-layout">
        <SectionCard icon="ApiOutlined" :title="$t('ThirdPartyApplication.debug.mode.' + mode)" class="debug-section">
          <a-form layout="vertical" :disabled="busy" @submit.prevent>
            <template v-if="mode === 'token'">
              <a-form-item :label="$t('ThirdPartyApplication.credential.endpoint')">
                <a-input :value="endpoint" :aria-label="$t('ThirdPartyApplication.credential.endpoint')" readonly />
              </a-form-item>
              <CredentialFields />
              <PageActions>
                <a-button type="primary" :disabled="!ready || !credentialActive || !applicationEnabled || !clientSecret || busy" @click="acquireToken">
                  {{ $t('ThirdPartyApplication.debug.acquireToken') }}
                </a-button>
              </PageActions>
            </template>
            <CallbackDebugForm v-else :context="callbackForm" :disabled="busy">
              <template #credentials><CredentialFields :callback="true" /></template>
            </CallbackDebugForm>
          </a-form>
        </SectionCard>
        <DebugResult />
      </div>
    </a-spin>
  </SegmentPanel>
</template>

<script setup lang="ts">
import { createReusableTemplate } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import type { ApiApplication } from '@authentication-manager-ui/api/application-center/apiApplication'
import { formatTime } from '../integrationUtils'
import { useAccessDebug } from './useAccessDebug'
import type { ApplicationLogFilter } from './accessDebugUtils'
import DebugApiPicker from './DebugApiPicker.vue'
import CallbackDebugForm from './CallbackDebugForm.vue'
import DebugApiDocument from './DebugApiDocument.vue'

const props = defineProps<{ application: ApiApplication; initialMode?: 'token' | 'call' | 'callback' }>()
defineEmits<{ navigate: [tab: 'basic' | 'grants']; logs: [filter: ApplicationLogFilter] }>()
const { t: $t } = useI18n()
const [DefineCredentialFields, CredentialFields] = createReusableTemplate<{ callback?: boolean }>()
const [DefineResult, DebugResult] = createReusableTemplate()
const contentTypes = ['application/json', 'application/x-www-form-urlencoded', 'text/plain'].map(value => ({ label: value, value }))
const { mode, setMode, modes, loading, metadataError, error, busy, clientId, clientSecret, applicationEnabled, credentialActive,
  canReveal, ready, endpoint, token, tokenValid, response, callAddress, callLogFilter, apiId, apis, selectedApi, paths, query,
  body, contentType, hasBody, requiresConfirmation, requestBodyError, sendDisabled, catalogLoading, catalogError, callbackForm, callbackIsSample, verification, initBodyEditor,
  loadMetadata, loadCatalog, useCurrentCredential, acquireToken, sendApi, cancel, setCredentialSecret, addQuery, removeQuery } = useAccessDebug(props)
</script>

<style scoped>
.access-debug { height: auto; flex: initial; gap: var(--space-3); }
.access-debug :deep(.segment-panel__content) { flex: initial; }
.debug-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: stretch; gap: var(--space-4); }
.debug-section { min-width: 0; margin-bottom: 0; }
.debug-notice { margin-bottom: var(--space-4); }
.request-fields { margin-top: var(--space-4); }
.query-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; gap: var(--space-2); margin-bottom: var(--space-2); }
.inline-action { padding-inline: 0; }
.request-address { overflow-wrap: anywhere; margin-bottom: 0; }
.result-loading { display: flex; align-items: center; gap: var(--space-3); padding-block: var(--space-4); color: var(--ink-3); }
.result-empty { flex: 1; display: grid; place-items: center; }
.json-editor { height: 16rem; min-width: 0; overflow: hidden; border: 1px solid var(--line); border-radius: var(--r-2); }
.json-editor--error { border-color: var(--danger); }
.debug-section :deep(.ant-alert-message), .debug-section :deep(.ant-form-item-extra), .debug-section :deep(.ant-form-item-explain) { overflow-wrap: anywhere; }
.result-section :deep(.cb-body) { max-height: 32rem; overflow: auto; }
.result-section :deep(.ant-collapse-content .code-block + .code-block) { margin-top: var(--space-3); }
.call-workspace { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); align-items: start; min-width: 0; }
.api-workspace, .request-column { display: grid; gap: var(--space-4); min-width: 0; }
.api-columns { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 28rem), 1fr)); align-items: start; gap: var(--space-4); min-width: 0; }
.idle-result { margin: 0; }
@media (max-width: 64rem) { .debug-layout { grid-template-columns: minmax(0, 1fr); } }
</style>
