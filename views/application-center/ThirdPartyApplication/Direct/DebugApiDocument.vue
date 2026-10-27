<template>
  <DefineFields v-slot="{ rows }">
    <a-table :columns="columns" :data-source="rows" row-key="key" size="small" :pagination="false" :scroll="{ y: 320 }" table-layout="fixed" class="doc-table">
      <template #bodyCell="{ column, record }">
        <div v-if="column.key === 'name'" class="doc-field">
          <code>{{ record.name }}</code>
          <span v-if="record.location || record.type" class="doc-field-meta">{{ record.location }} {{ record.type }}</span>
          <a-typography-text v-if="record.required" type="danger">{{ $t('ThirdPartyApplication.debug.doc.required') }}</a-typography-text>
        </div>
        <div v-else class="doc-field">
          <span v-if="record.description">{{ record.description }}</span>
          <span v-if="record.enumValues">{{ $t('ThirdPartyApplication.debug.doc.enum') }}: <code>{{ record.enumValues }}</code></span>
          <span v-if="record.defaultValue !== undefined">{{ $t('ThirdPartyApplication.debug.doc.default') }}: <code>{{ record.defaultValue }}</code></span>
          <span v-if="record.example !== undefined">{{ $t('ThirdPartyApplication.debug.doc.example') }}: <code>{{ record.example }}</code></span>
        </div>
      </template>
    </a-table>
  </DefineFields>
  <DefineContent v-slot="{ content }">
    <div class="doc-media">
      <a-tag>{{ content.type }}</a-tag>
      <Fields v-if="content.fields.length" :rows="content.fields" />
      <CodeBlock v-for="(example, index) in content.examples" :key="index" variant="light" :label="example.name || $t('ThirdPartyApplication.debug.doc.example')"
        :content="example.value" copyable :copy-title="$t('ThirdPartyApplication.direct.accessGuide.copy')" />
      <a-collapse v-if="content.schema" :bordered="false">
        <a-collapse-panel key="schema" :header="$t('ThirdPartyApplication.debug.doc.schema')">
          <CodeBlock variant="light" label="JSON Schema" :content="content.schema" />
        </a-collapse-panel>
      </a-collapse>
    </div>
  </DefineContent>
  <SectionCard icon="FileTextOutlined" :title="$t('ThirdPartyApplication.debug.doc.title')" class="api-document">
    <a-alert v-if="error" type="warning" show-icon :message="$t('ThirdPartyApplication.debug.doc.loadFailed')" :description="error">
      <template #action><a-button size="small" @click="retry">{{ $t('ThirdPartyApplication.debug.retry') }}</a-button></template>
    </a-alert>
    <a-spin :spinning="loading">
      <div class="document-sections">
        <MarkdownEditor v-if="description" :model-value="description" readonly class="doc-description" />
        <a-typography-paragraph v-else type="secondary">{{ $t('ThirdPartyApplication.debug.doc.noDescription') }}</a-typography-paragraph>
        <a-typography-paragraph v-if="notice" type="secondary">{{ notice }}</a-typography-paragraph>
        <section v-if="document.parameters.length">
          <h3>{{ $t('ThirdPartyApplication.debug.doc.parameters') }}</h3>
          <Fields :rows="document.parameters" />
        </section>
        <section v-if="document.requestContents.length">
          <h3>{{ $t('ThirdPartyApplication.debug.doc.requestBody') }}<a-tag v-if="document.requestRequired">{{ $t('ThirdPartyApplication.debug.doc.required') }}</a-tag></h3>
          <p v-if="document.requestDescription">{{ document.requestDescription }}</p>
          <Content v-for="content in document.requestContents" :key="content.type" :content="content" />
        </section>
        <section v-if="document.responses.length">
          <h3>{{ $t('ThirdPartyApplication.debug.doc.responses') }}</h3>
          <a-collapse :bordered="false">
            <a-collapse-panel v-for="response in document.responses" :key="response.status">
              <template #header><span class="response-heading"><a-tag>{{ response.status }}</a-tag>{{ response.description }}</span></template>
              <Content v-for="content in response.contents" :key="content.type" :content="content" />
            </a-collapse-panel>
          </a-collapse>
        </section>
      </div>
    </a-spin>
  </SectionCard>
</template>

<script setup lang="ts">
import { createReusableTemplate } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import MarkdownEditor from '@jetlinks-web-core/components/MarkdownEditor'
import type { DebugApi } from './accessDebugUtils'
import type { DocContent, DocField } from './apiDebugDocument'
import { useApiDebugDocument } from './useApiDebugDocument'

const props = defineProps<{ api: DebugApi }>()
const { t: $t } = useI18n()
const [DefineFields, Fields] = createReusableTemplate<{ rows: DocField[] }>()
const [DefineContent, Content] = createReusableTemplate<{ content: DocContent }>()
const { loading, error, document, description, notice, columns, retry } = useApiDebugDocument(props)
</script>

<style scoped>
.api-document { min-width: 0; margin: 0; }
.document-sections { display: grid; gap: var(--space-4); min-width: 0; }
.document-sections h3 { display: flex; align-items: center; gap: var(--space-2); margin: 0 0 var(--space-3); font-size: var(--fs-14); font-weight: 600; }
.document-sections p { margin-bottom: 0; }
.doc-media { display: grid; justify-items: stretch; gap: var(--space-3); min-width: 0; }
.doc-media + .doc-media { margin-top: var(--space-4); }
.doc-media > .ant-tag { justify-self: start; }
.doc-field { display: flex; align-items: start; flex-direction: column; gap: var(--space-1); min-width: 0; overflow-wrap: anywhere; }
.doc-field-meta { color: var(--ink-4); font-size: var(--fs-12); }
.doc-description { max-height: 20rem; min-width: 0; overflow: auto; }
.doc-field :deep(.ant-typography) { font-size: var(--fs-12); }
.doc-table :deep(.ant-table-cell) { vertical-align: top; }
.response-heading { overflow-wrap: anywhere; }
.api-document :deep(.cb-body) { max-height: 20rem; overflow: auto; }
.api-document :deep(.md-editor-preview-wrapper) { padding: 0; }
.api-document :deep(.md-editor-preview) { overflow-wrap: anywhere; }
</style>
