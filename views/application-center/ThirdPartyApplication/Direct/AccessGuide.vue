<template>
  <div class="guide-layout">
    <SectionCard icon="ApiOutlined" :title="$t('ThirdPartyApplication.direct.accessGuide.apiTab')" class="guide-card">
      <a-steps direction="vertical" size="small" :current="-1">
        <a-step :title="$t('ThirdPartyApplication.guide.credentialsTitle')">
          <template #description>
            <p>{{ $t('ThirdPartyApplication.guide.credentials') }}</p>
            <a-button type="link" size="small" @click="$emit('navigate', 'basic')">{{ $t('ThirdPartyApplication.debug.openCredentials') }}</a-button>
          </template>
        </a-step>
        <a-step :title="$t('ThirdPartyApplication.guide.grantsTitle')">
          <template #description>
            <p>{{ $t('ThirdPartyApplication.guide.grants') }}</p>
            <a-button type="link" size="small" @click="$emit('navigate', 'grants')">{{ $t('ThirdPartyApplication.direct.accessGuide.authorize') }}</a-button>
          </template>
        </a-step>
        <a-step :title="$t('ThirdPartyApplication.guide.debugTitle')">
          <template #description>
            <p>{{ $t('ThirdPartyApplication.guide.debug') }}</p>
            <a-button @click="$emit('debug', 'token')">{{ $t('ThirdPartyApplication.guide.startDebug') }}</a-button>
          </template>
        </a-step>
      </a-steps>
      <a-collapse :bordered="false">
        <a-collapse-panel key="token" :header="$t('ThirdPartyApplication.guide.tokenProtocol')">
          <div class="token-examples">
            <p>{{ $t('ThirdPartyApplication.guide.requestExampleHint') }}</p>
            <CodeBlock variant="light" :label="$t('ThirdPartyApplication.guide.requestExample')" :content="tokenRequestExample" copyable :copy-title="$t('ThirdPartyApplication.direct.accessGuide.copy')" />
            <p>{{ $t('ThirdPartyApplication.guide.responseExampleHint') }}</p>
            <CodeBlock variant="light" :label="$t('ThirdPartyApplication.guide.responseExample')" :content="tokenResponseExample" copyable :copy-title="$t('ThirdPartyApplication.direct.accessGuide.copy')" />
            <p>{{ $t('ThirdPartyApplication.guide.bearerExampleHint') }}</p>
            <CodeBlock variant="light" :label="$t('ThirdPartyApplication.guide.bearerExample')" :content="bearerExample" copyable :copy-title="$t('ThirdPartyApplication.direct.accessGuide.copy')" />
          </div>
        </a-collapse-panel>
      </a-collapse>
    </SectionCard>
    <SectionCard icon="SendOutlined" :title="$t('ThirdPartyApplication.direct.accessGuide.callbackTab')" class="guide-card">
      <a-steps direction="vertical" size="small" :current="-1">
        <a-step :title="$t('ThirdPartyApplication.guide.subscriptionTitle')">
          <template #description>
            <p>{{ $t('ThirdPartyApplication.guide.subscription') }}</p>
            <a-button type="link" size="small" @click="$emit('navigate', 'subscriptions')">{{ $t('ThirdPartyApplication.guide.openSubscriptions') }}</a-button>
          </template>
        </a-step>
        <a-step :title="$t('ThirdPartyApplication.guide.receiverTitle')">
          <template #description><p>{{ $t('ThirdPartyApplication.guide.receiver') }}</p></template>
        </a-step>
        <a-step :title="$t('ThirdPartyApplication.guide.verificationTitle')">
          <template #description>
            <p>{{ $t('ThirdPartyApplication.guide.verification') }}</p>
            <a-button @click="$emit('debug', 'callback')">{{ $t('ThirdPartyApplication.guide.tryVerification') }}</a-button>
          </template>
        </a-step>
      </a-steps>
      <a-collapse :bordered="false">
        <a-collapse-panel key="signature" :header="$t('ThirdPartyApplication.guide.signatureProtocol')">
          <a-descriptions :column="1" bordered size="small" :label-style="{ width: '11rem' }" :content-style="{ overflowWrap: 'anywhere' }">
            <a-descriptions-item v-for="header in signatureHeaders" :key="header.name" :label="header.name">{{ header.description }}</a-descriptions-item>
          </a-descriptions>
          <ol class="signature-rules">
            <li>{{ $t('ThirdPartyApplication.direct.accessGuide.digest') }}</li>
            <li>{{ $t('ThirdPartyApplication.direct.accessGuide.canonical') }}<CodeBlock variant="light" :content="signatureFields" /></li>
            <li>{{ $t('ThirdPartyApplication.direct.accessGuide.signature') }}</li>
          </ol>
          <p>{{ $t('ThirdPartyApplication.guide.rotation') }}</p>
        </a-collapse-panel>
      </a-collapse>
    </SectionCard>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useAccessGuide } from './useAccessGuide'

defineEmits<{ navigate: [tab: 'basic' | 'grants' | 'subscriptions']; debug: [mode: 'token' | 'call' | 'callback'] }>()
const { t: $t } = useI18n()
const { signatureFields, signatureHeaders, tokenRequestExample, tokenResponseExample, bearerExample } = useAccessGuide()
</script>

<style scoped>
.guide-layout { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); align-items: stretch; }
.guide-layout > .guide-card { display: grid; grid-row: span 3; grid-template-rows: subgrid; min-width: 0; margin-bottom: 0; }
.guide-card > .ant-collapse { min-width: 0; align-self: start; }
.guide-layout :deep(.ant-steps-item-description) { max-width: none; padding-bottom: var(--space-4); }
.guide-layout :deep(.ant-steps-item-title) { font-size: var(--fs-14); font-weight: 500; }
.guide-layout :deep(.ant-btn-link) { padding-inline: 0; }
.guide-layout :deep(.ant-descriptions-item-label) { overflow-wrap: anywhere; }
.guide-layout p { color: var(--ink-3); line-height: 1.7; }
.token-examples { display: grid; gap: var(--space-3); min-width: 0; }
.token-examples p { margin: 0; overflow-wrap: anywhere; }
.token-examples :deep(.cb-body) { max-height: 18rem; overflow: auto; }
.signature-rules { margin-top: var(--space-3); }
.signature-rules { padding-inline-start: var(--space-5); line-height: 1.7; }
.signature-rules li + li, .signature-rules .code-block { margin-top: var(--space-2); }
@media (max-width: 64rem) { .guide-layout { grid-template-columns: minmax(0, 1fr); } }
</style>
