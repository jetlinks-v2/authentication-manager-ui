<template>
  <SegmentPanel :model-value="context.source" :options="context.sourceOptions" class="callback-sources" @change="context.setSource">
    <div class="callback-notice">
      <a-typography-paragraph type="secondary">{{ $t(context.isSample ? 'ThirdPartyApplication.debug.sampleHint' : 'ThirdPartyApplication.debug.localOnly') }}</a-typography-paragraph>
      <a-button v-if="context.isSample" size="small" :disabled="disabled" @click="context.generateSample">{{ $t('ThirdPartyApplication.debug.newSample') }}</a-button>
    </div>
    <slot name="credentials" />
    <a-form-item :label="$t('ThirdPartyApplication.debug.headers')" required>
      <a-table :columns="context.headerColumns" :data-source="context.headers" row-key="name" size="small" :pagination="false" table-layout="fixed">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <a-tooltip :title="record.description">
              <span class="header-name"><span v-if="record.required" class="header-required" aria-hidden="true">*</span>{{ record.name }}</span>
            </a-tooltip>
            <span v-if="!record.required" class="header-optional">{{ $t('ThirdPartyApplication.debug.optionalHeader') }}</span>
          </template>
          <a-input v-else v-model:value="context.form.headers[record.name]" :aria-label="record.name" :aria-required="record.required"
            :disabled="disabled" :placeholder="$t('ThirdPartyApplication.debug.headerValuePlaceholder')" autocomplete="off" />
        </template>
      </a-table>
    </a-form-item>
    <a-form-item :label="$t('ThirdPartyApplication.debug.originalBody')" required
      :validate-status="context.bodyError ? 'error' : undefined" :help="context.bodyError || undefined">
      <a-textarea v-if="!context.bodyFile" v-model:value="context.form.body" class="raw-json" :aria-label="$t('ThirdPartyApplication.debug.originalBody')"
        :placeholder="$t('ThirdPartyApplication.debug.callbackBodyPlaceholder')" :disabled="disabled" :auto-size="{ minRows: 6, maxRows: 12 }" :spellcheck="false" />
      <a-typography-paragraph v-else class="body-file">{{ context.bodyFile.name }} · {{ context.bodyFile.size }} B</a-typography-paragraph>
      <a-space wrap>
        <a-upload :before-upload="context.chooseBodyFile" :show-upload-list="false" :disabled="disabled">
          <a-button type="link" size="small" :disabled="disabled" class="inline-action">{{ $t('ThirdPartyApplication.debug.chooseBodyFile') }}</a-button>
        </a-upload>
        <a-button v-if="context.bodyFile" type="link" size="small" :disabled="disabled" @click="context.clearBodyFile">{{ $t('ThirdPartyApplication.debug.useTextBody') }}</a-button>
      </a-space>
    </a-form-item>
    <a-collapse :bordered="false" class="callback-details">
      <a-collapse-panel v-if="context.preview" key="preview" :header="$t('ThirdPartyApplication.debug.jsonPreview')">
        <CodeBlock variant="light" label="JSON" :content="context.preview" />
      </a-collapse-panel>
      <a-collapse-panel key="help" :header="$t('ThirdPartyApplication.debug.callbackHelp')">
        <p>{{ $t('ThirdPartyApplication.debug.originalBodyHint') }}</p>
        <p>{{ $t('ThirdPartyApplication.debug.headersHint') }}</p>
        <p>{{ $t('ThirdPartyApplication.debug.windowHint') }}</p>
      </a-collapse-panel>
    </a-collapse>
    <a-form-item :label="$t('ThirdPartyApplication.debug.window')" required>
      <a-input-number v-model:value="context.form.windowSeconds" :aria-label="$t('ThirdPartyApplication.debug.window')" :min="1" :precision="0" :disabled="disabled" />
    </a-form-item>
    <PageActions>
      <a-button type="primary" :disabled="disabled || !context.canVerify" @click="context.verify">{{ $t('ThirdPartyApplication.debug.verify') }}</a-button>
    </PageActions>
  </SegmentPanel>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { CallbackDebugFormState } from './useCallbackDebug'

defineProps<{ context: CallbackDebugFormState; disabled: boolean }>()
const { t: $t } = useI18n()
</script>

<style scoped>
.callback-sources { height: auto; padding: 0; background: transparent; border: 0; }
.callback-sources :deep(.segment-panel__content) { flex: initial; }
.callback-notice { display: flex; align-items: start; flex-wrap: wrap; gap: var(--space-3); margin-bottom: var(--space-4); }
.callback-notice > .ant-typography { flex: 1; min-width: 12rem; margin: 0; }
.callback-notice > .ant-btn { flex: none; }
.header-name { overflow-wrap: anywhere; }
.header-required { margin-inline-end: var(--space-1); color: var(--danger); }
.header-optional { display: block; margin-top: var(--space-1); color: var(--ink-4); font-size: var(--fs-12); }
.raw-json { font-family: var(--font-mono, monospace); tab-size: 2; }
.body-file { overflow-wrap: anywhere; }
.inline-action { padding-inline: 0; }
.callback-details { margin-bottom: var(--space-4); }
.callback-details p { color: var(--ink-3); line-height: 1.7; overflow-wrap: anywhere; }
.callback-details :deep(.cb-body) { max-height: 20rem; overflow: auto; }
</style>
