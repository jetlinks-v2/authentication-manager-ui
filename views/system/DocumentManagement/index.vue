<template>
  <j-page-container>
    <FullPage transparentBackground>
      <EqualHeightColumns left-width="18.75rem" right-width="1fr">
        <template #left>
          <aside class="document-scope">
            <a-typography-text strong>{{ t('DocumentManagement.groups') }}</a-typography-text>
            <a-input v-model:value="routeKeyword" :placeholder="t('DocumentManagement.routeSearch')" allow-clear>
              <template #prefix><AIcon type="SearchOutlined" /></template>
            </a-input>
            <AutoTree block-node :show-line="{ showLeafIcon: false }" :tree-data="treeData" :selected-keys="[scope]" @select="selectScope" />
          </aside>
        </template>
        <template #right>
          <section class="document-list">
            <div class="document-list__heading"><a-typography-text strong>{{ title }}</a-typography-text><a-typography-text v-if="loaded && !failed" type="secondary">{{ t('DocumentManagement.count', { count: filteredRows.length }) }}</a-typography-text></div>
            <a-alert v-if="failed" type="error" show-icon :message="t('DocumentManagement.loadFailed')">
              <template #action><a-button size="small" @click="load()">{{ t('DocumentManagement.retry') }}</a-button></template>
            </a-alert>
            <a-spin v-else :spinning="loading" class="document-list__body">
              <JProTable style="padding: 1rem 0 0" mode="TABLE" :columns="columns" :request="queryRows" :params="{ scope, terms, rows: filteredRows }" row-key="id" :row-selection="rowSelection" :scroll="{ x: 820 }" :pagination="{ pageSize: 10 }" :alert-render="false">
                <template #headerLeftRender>
                  <a-flex gap="small" wrap="wrap">
                    <ConditionFilter v-model="terms" :fields="fields" :placeholder="t('DocumentManagement.search')" class="document-filter" />
                    <BatchDropdown v-model:isCheck="isCheck" :actions="batchActions" />
                  </a-flex>
                </template>
                <template #name="row"><j-ellipsis>{{ row.name }}</j-ellipsis></template>
                <template #configured="row"><a-badge :status="row.enabled ? 'success' : 'default'" :text="t(!row.configured ? 'DocumentManagement.missing' : row.enabled ? 'DocumentManagement.enabled' : 'DocumentManagement.disabled')" /></template>
                <template #action="row">
                  <a-space :size="4">
                    <j-permission-button type="link" size="small" :disabled="Boolean(updating)" has-permission="system/DocumentManagement:save" @click="edit(row)">{{ t(row.configured ? 'DocumentManagement.edit' : 'DocumentManagement.configure') }}</j-permission-button>
                    <j-permission-button v-if="row.configured" type="link" size="small" :loading="updating === row.id" :disabled="Boolean(updating) && updating !== row.id" has-permission="system/DocumentManagement:save" @click="toggleEnabled(row)">{{ t(row.enabled ? 'DocumentManagement.disable' : 'DocumentManagement.enable') }}</j-permission-button>
                    <DocumentHelp v-if="row.configured" placement="left" :width="420"><span>{{ t('DocumentManagement.preview') }}</span><template #content><MarkdownPreview v-if="row.content.trim()" :content="row.content" /><a-typography-text v-else type="secondary">{{ t('DocumentManagement.emptyDescription') }}</a-typography-text></template></DocumentHelp>
                  </a-space>
                </template>
                <template #emptyText><CloudEmpty :description="t('DocumentManagement.emptyPoints')" /></template>
              </JProTable>
            </a-spin>
          </section>
        </template>
      </EqualHeightColumns>
    </FullPage>
    <JlDrawerShell :open="Boolean(current)" :title="t('DocumentManagement.configureTitle')" :width="800" :closable="!saving" :mask-closable="!saving" :keyboard="!saving" destroy-on-close @update:open="onDrawerOpenChange">
      <template v-if="current">
        <a-typography-title :level="5">{{ current.name }}</a-typography-title>
        <a-descriptions :column="1" size="small">
          <a-descriptions-item :label="t('DocumentManagement.page')">{{ current.page }}</a-descriptions-item>
          <a-descriptions-item :label="t('DocumentManagement.code')">{{ current.code }}</a-descriptions-item>
          <a-descriptions-item :label="t('DocumentManagement.key')">{{ current.key }}</a-descriptions-item>
        </a-descriptions>
        <a-divider />
        <a-form layout="vertical">
          <a-form-item :label="t('DocumentManagement.enableStatus')" :help="t('DocumentManagement.enableHint')">
            <a-switch v-model:checked="draftEnabled" :disabled="saving" :checked-children="t('DocumentManagement.enabled')" :un-checked-children="t('DocumentManagement.disabled')" />
          </a-form-item>
          <a-form-item :label="t('DocumentManagement.description')" :help="t('DocumentManagement.markdownHint')">
            <MarkdownEditor v-model="draft" :sanitize="sanitizeHelpMarkdown" :disabled="saving" :show-upload-file-toolbar="false" :rows="8" :toolbars="toolbars" />
          </a-form-item>
        </a-form>
        <div class="help-preview">
          <a-typography-text strong>{{ t('DocumentManagement.helperPreview') }}</a-typography-text>
          <div class="help-preview__sample"><span>{{ current.name }}</span><DocumentHelp placement="topLeft" :width="420"><template #content><MarkdownPreview v-if="draft.trim()" :content="draft" /><a-typography-text v-else type="secondary">{{ t('DocumentManagement.emptyDescription') }}</a-typography-text></template></DocumentHelp></div>
        </div>
        <a-alert v-if="saveFailed" type="error" show-icon :message="t('DocumentManagement.saveFailed')" />
      </template>
      <template #foot><a-button :disabled="saving" @click="close">{{ t('DocumentManagement.cancel') }}</a-button><j-permission-button type="primary" :loading="saving" has-permission="system/DocumentManagement:save" @click="save">{{ t('DocumentManagement.save') }}</j-permission-button></template>
    </JlDrawerShell>
  </j-page-container>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import FullPage from '@jetlinks-web-core/layout/FullPage.vue'
import EqualHeightColumns from '@jetlinks-web-core/components/EqualHeightColumns/index.vue'
import AutoTree from '@jetlinks-web-core/components/AutoTree/index.vue'
import BatchDropdown from '@jetlinks-web-core/components/BatchDropdown/index.vue'
import ConditionFilter, { type ConditionFieldSchema } from '@jetlinks-web-core/components/ConditionFilter'
import JlDrawerShell from '@jetlinks-web-core/components/JlDrawerShell/index.vue'
import DocumentHelp from '@jetlinks-web-core/components/DocumentHelp'
import MarkdownPreview from '@jetlinks-web-core/components/DocumentHelp/MarkdownPreview.vue'
import MarkdownEditor from '@jetlinks-web-core/components/MarkdownEditor/index.vue'
import { sanitizeHelpMarkdown } from '@jetlinks-web-core/utils/documentHelpMarkdown'

import { useDocumentManagement } from './useDocumentManagement'

const { t } = useI18n()
const { rows, filteredRows, scope, routeKeyword, terms, nodes, title, loading, failed, loaded,
  current, draft, draftEnabled, saving, updating, selectedKeys, saveFailed, load, edit, close, save, toggleEnabled, batchToggle } = useDocumentManagement()
const treeData = computed(() => nodes.value.map(node => {
  const label = 'code' in node ? `${node.title} · ${node.code}` : node.title
  return { key: node.key, title: loaded.value && !failed.value ? `${label} (${node.count})` : label }
}))
const configuredCount = computed(() => rows.value.filter(row => row.configured).length)
const selectedConfiguredCount = computed(() => rows.value.filter(row => row.configured && selectedKeys.value.includes(row.id)).length)
const isCheck = ref(false)
const batchActions = computed(() => [
  { key: 'enableConfigured', text: t('DocumentManagement.enableConfigured'), icon: 'CheckCircleOutlined',
    permission: 'system/DocumentManagement:save', disabled: Boolean(updating.value) || !configuredCount.value,
    onClick: () => batchToggle(true, true) },
  { key: 'enable', text: t('DocumentManagement.batchEnable'), icon: 'CheckOutlined',
    permission: 'system/DocumentManagement:save', disabled: Boolean(updating.value),
    selected: {
      get disabled() { return Boolean(updating.value) || !selectedConfiguredCount.value },
      onClick: () => batchToggle(true),
    } },
  { key: 'disable', text: t('DocumentManagement.batchDisable'), icon: 'StopOutlined',
    permission: 'system/DocumentManagement:save', disabled: Boolean(updating.value),
    selected: {
      get disabled() { return Boolean(updating.value) || !selectedConfiguredCount.value },
      onClick: () => batchToggle(false),
    } },
])
const rowSelection = computed(() => isCheck.value ? {
  selectedRowKeys: selectedKeys.value,
  onChange: (keys: (string | number)[]) => { selectedKeys.value = keys.map(String) },
  getCheckboxProps: (row: { configured: boolean }) => ({ disabled: !row.configured || Boolean(updating.value) }),
} : undefined)
watch(isCheck, value => { if (!value) selectedKeys.value = [] })
watch([scope, terms], () => { selectedKeys.value = [] }, { deep: true })
const toolbars: NonNullable<InstanceType<typeof MarkdownEditor>['$props']['toolbars']> = ['bold', 'italic', 'title', 'unorderedList', 'orderedList', 'quote', 'link', 'table', 'revoke', 'next', '=', 'preview']
const columns = computed(() => [
  { title: t('DocumentManagement.position'), dataIndex: 'name', key: 'name', scopedSlots: true, width: 160 },
  { title: t('DocumentManagement.key'), dataIndex: 'key', key: 'key', width: 220 },
  { title: t('DocumentManagement.page'), dataIndex: 'page', key: 'page', width: 140 },
  { title: t('DocumentManagement.status'), dataIndex: 'configured', key: 'configured', scopedSlots: true, width: 100 },
  { title: t('DocumentManagement.actions'), dataIndex: 'action', key: 'action', scopedSlots: true, width: 170 },
])
const fields = computed<ConditionFieldSchema[]>(() => ['name', 'page', 'key'].map(dataIndex => ({
  title: t(`DocumentManagement.${dataIndex === 'name' ? 'position' : dataIndex}`), dataIndex,
  search: { type: 'string', termTypeOptions: ['like', 'eq'] },
})))
function onDrawerOpenChange(open: boolean) { if (!open) close() }
function selectScope(keys: (string | number)[]) { if (keys.length) scope.value = String(keys[0]) }
async function queryRows(params: { pageIndex?: number; pageSize?: number }) {
  const pageIndex = params.pageIndex || 0, pageSize = params.pageSize || 10
  return { success: true, result: { data: filteredRows.value.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize), total: filteredRows.value.length, pageIndex, pageSize } }
}
</script>

<style scoped lang="less">
.document-scope { display: flex; flex-direction: column; gap: var(--space-4); height: 100%; min-height: 0;  }
.document-scope > :deep(strong) { font-size: var(--fs-18); line-height: var(--lh-24); }
.document-list { display: flex; flex-direction: column; height: 100%; min-height: 0; overflow: auto; }
.document-list__heading { margin-bottom: var(--space-4); display: flex; align-items: center; justify-content: space-between; }
.document-list__body { flex: 1; min-height: 0; }
.document-list__body :deep(.ant-spin-container) { height: 100%; }
.document-filter { width: 15rem; max-width: 100%; }
.help-preview { margin-block: var(--space-6); }
.help-preview__sample { display: flex; align-items: center; gap: var(--space-1); margin-top: var(--space-3); padding: var(--space-4); background: var(--jet-theme-bg-layout); border-radius: var(--r-2); }
</style>
