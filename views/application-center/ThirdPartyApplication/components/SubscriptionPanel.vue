<template>
  <div class="subscription-panel">
    <a-alert type="info" show-icon :message="$t('ThirdPartyApplication.subscription.runtimeHint')" class="subscription-alert" />
    <a-alert v-if="!applicationEnabled" type="warning" show-icon :message="$t('ThirdPartyApplication.subscription.applicationDisabled')" class="subscription-alert" />
    <div class="subscription-toolbar">
      <ConditionFilter :columns="filterColumns" :target="`api-subscriptions-${application?.id}`" @change="handleSearch" />
      <a-space><a-button :loading="catalogLoading" @click="refresh">{{ $t('ThirdPartyApplication.project.refresh') }}</a-button>
      <a-button type="primary" :disabled="saving" @click="openEditor()">
        <template #icon><AIcon type="PlusOutlined" /></template>{{ $t('ApiApplication.subscription.create') }}
      </a-button></a-space>
    </div>
    <a-alert v-if="catalogError" type="error" show-icon :message="$t('ApiApplication.subscription.catalogError')" :description="catalogError" class="subscription-alert" />
    <a-alert v-if="listError" type="error" show-icon :message="$t('ApiApplication.subscription.loadError')" :description="listError" class="subscription-alert" />
    <a-alert v-if="operationError && !editorOpen && !detailOpen" type="error" show-icon :message="operationError" class="subscription-alert" />
    <j-pro-table v-if="application" :key="application.id" ref="tableRef" mode="TABLE"
      :columns="columns" :request="requestPage" :params="filters" :scroll="{ x: 1350 }">
      <template #name="row"><a-button type="link" @click="openDetail(row)">{{ row.name }}</a-button></template>
      <template #scopes="row">{{ row.scopes?.length || 0 }}</template>
      <template #eventTypes="row">{{ scopeEventCount(row.scopes) }}</template>
      <template #channelProvider="row">{{ channelName(row.channelProvider) }}</template>
      <template #executionState="row"><a-tag :color="executionColor(row.executionState)">{{ executionLabel(row.executionState) }}</a-tag></template>
      <template #state="row"><a-badge :status="row.state === 'enabled' ? 'success' : 'default'"
        :text="$t(row.state === 'enabled' ? 'ApiApplication.status.enabled' : 'ApiApplication.status.disabled')" /></template>
      <template #validation="row"><a-tag :color="row.validation?.valid ? 'success' : 'warning'">
        {{ $t(row.validation?.valid ? 'ApiApplication.subscription.valid' : 'ApiApplication.subscription.invalid') }}
      </a-tag></template>
      <template #createTime="row">{{ formatTime(row.createTime) }}</template>
      <template #action="row">
        <a-space :size="4">
          <a-button type="link" size="small" @click="openDetail(row)">{{ $t('ApiApplication.subscription.detail') }}</a-button>
          <a-button type="link" size="small" :disabled="saving" @click="openEditor(row)">{{ $t('ApiApplication.subscription.edit') }}</a-button>
          <a-popconfirm :title="$t(row.state === 'enabled' ? 'ApiApplication.subscription.disableConfirm' : 'ApiApplication.subscription.enableConfirm')"
            @confirm="toggle(row)">
            <a-button type="link" size="small" :disabled="saving || (row.state !== 'enabled' && !applicationEnabled)">
              {{ $t(row.state === 'enabled' ? 'ApiApplication.actions.disable' : 'ApiApplication.actions.enable') }}
            </a-button>
          </a-popconfirm>
          <a-popconfirm :title="$t('ApiApplication.subscription.deleteConfirm')" @confirm="remove(row)">
            <a-button type="link" size="small" danger :disabled="saving">{{ $t('ApiApplication.actions.delete') }}</a-button>
          </a-popconfirm>
        </a-space>
      </template>
    </j-pro-table>
  </div>

  <SubscriptionEditor v-model:open="editorOpen" :subscription="editing" :events="events" :channels="channels"
    :catalog-loading="catalogLoading" :catalog-error="catalogError" :saving="saving" :validation="validation" :operation-error="operationError"
    @change="clearFeedback" @validate="check($event)" @save="save($event)" />
  <a-modal v-model:open="detailOpen" :title="$t('ApiApplication.subscription.detail')" :footer="null" :width="680">
    <a-spin :spinning="detailLoading">
      <a-alert v-if="operationError" type="error" show-icon :message="operationError" class="subscription-alert" />
      <template v-if="selected">
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item :label="$t('ApiApplication.subscription.name')">{{ selected.name }}</a-descriptions-item>
          <a-descriptions-item :label="$t('ApiApplication.subscription.description')">{{ selected.description || '-' }}</a-descriptions-item>
          <a-descriptions-item :label="$t('ApiApplication.subscription.state')">{{ $t(selected.state === 'enabled' ? 'ApiApplication.status.enabled' : 'ApiApplication.status.disabled') }}</a-descriptions-item>
          <a-descriptions-item :label="$t('ApiApplication.subscription.executionState')">{{ executionLabel(selected.executionState) }}</a-descriptions-item>
          <a-descriptions-item :label="$t('ThirdPartyApplication.subscription.scopes')">
            <div v-for="(scope, index) in selected.scopes" :key="index" class="detail-scope">
              <strong>{{ $t('ThirdPartyApplication.subscription.scopeIndex', { index: index + 1 }) }}</strong>
              <a-space wrap><a-tag v-for="id in scope.eventTypes" :key="id">{{ eventName(id) }}</a-tag><span v-if="!scope.eventTypes.length">-</span></a-space>
              <div v-if="Object.keys(scope.configuration).length">
                <a-typography-text type="secondary">{{ $t('ThirdPartyApplication.subscription.sourceConfiguration') }}</a-typography-text>
                <pre class="configuration-json">{{ JSON.stringify(scope.configuration, null, 2) }}</pre>
              </div>
            </div>
            <span v-if="!selected.scopes.length">-</span>
          </a-descriptions-item>
          <a-descriptions-item :label="$t('ApiApplication.subscription.channel')">{{ channelName(selected.channelProvider) }}</a-descriptions-item>
          <a-descriptions-item :label="$t('ThirdPartyApplication.subscription.channelConfiguration')">
            <pre class="configuration-json">{{ JSON.stringify(selected.channelConfiguration, null, 2) }}</pre>
          </a-descriptions-item>
          <a-descriptions-item :label="$t('ApiApplication.subscription.createTime')">{{ formatTime(selected.createTime) }}</a-descriptions-item>
        </a-descriptions>
        <SubscriptionValidation :validation="selected.validation" class="subscription-alert" />
        <div class="detail-actions"><a-button type="primary" @click="openEditor(selected); detailOpen = false">{{ $t('ApiApplication.subscription.edit') }}</a-button></div>
      </template>
    </a-spin>
  </a-modal>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ApiApplication } from '@authentication-manager-ui/api/application-center/apiApplication'
import { useSubscriptionPanel } from '../useSubscriptionPanel'
import { scopeEventCount } from '../subscriptionForm'
import { executionColor } from '../subscriptionState'
import { formatTime } from '../integrationUtils'
import SubscriptionEditor from './SubscriptionEditor.vue'
import SubscriptionValidation from './SubscriptionValidation.vue'
const props = defineProps<{ application: ApiApplication }>()
const { t: $t } = useI18n()
const { events, channels, catalogLoading, catalogError, listError, operationError, saving, validation, clearFeedback,
  tableRef, filters, editorOpen, detailOpen, detailLoading, editing, selected, applicationEnabled,
  filterColumns, columns, refresh, requestPage, handleSearch, eventName, channelName, executionLabel,
  openEditor, openDetail, save, check, toggle, remove } = useSubscriptionPanel(() => props.application)
</script>

<style scoped>
.subscription-panel { padding: var(--space-3) 0; }
.subscription-alert { margin-bottom: 16px; }
.subscription-toolbar { display: flex; align-items: flex-start; gap: 16px; justify-content: space-between; }
.subscription-toolbar :deep(.condition-filter) { flex: 1; min-width: 0; }
.detail-scope { display: flex; flex-direction: column; gap: 8px; }.detail-scope + .detail-scope { margin-top: 16px; }
.configuration-json { max-height: 220px; overflow: auto; margin: 4px 0 0; white-space: pre-wrap; word-break: break-word; }
.detail-actions { margin-top: 16px; text-align: right; }
</style>
