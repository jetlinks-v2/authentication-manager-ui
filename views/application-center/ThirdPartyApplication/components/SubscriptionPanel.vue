<template>

  <DefineEmptyCreate>
    <a-button type="primary" :disabled="saving" @click="openEditor()">
      <template #icon><AIcon type="PlusOutlined" /></template>{{ $t('ApiApplication.subscription.create') }}
    </a-button>
  </DefineEmptyCreate>
  <div class="application-list subscription-panel">
    <div class="application-list-toolbar">
      <ConditionFilter class="application-list-filter" :columns="filterColumns" :target="`api-subscriptions-${application?.id}`" @change="handleSearch" />
      <EmptyCreateButton class="application-list-create" />
    </div>
    <a-alert v-if="catalogError" type="error" show-icon :message="$t('ApiApplication.subscription.catalogError')" :description="catalogError" class="subscription-alert" />
    <a-alert v-if="listError" type="error" show-icon :message="$t('ApiApplication.subscription.loadError')" :description="listError" class="subscription-alert" />
    <a-alert v-if="operationError && !editorOpen && !detailOpen" type="error" show-icon :message="operationError" class="subscription-alert" />
    <j-pro-table v-if="application" :key="application.id" ref="tableRef" mode="TABLE"
      :columns="columns" :request="requestPage" :params="filters" :body-style="{ padding: 0 }" :alert-show="false" :pagination="{ size: 'small' }" :scroll="false">
      <template #emptyText>
        <CloudEmpty :search="filters.terms" :search-name="$t('components.Card.812844-0')">
          <EmptyCreateButton />
        </CloudEmpty>
      </template>
      <template #name="row"><a-tooltip :title="row.name"><a-button type="link" class="table-link" @click="openDetail(row)">{{ row.name }}</a-button></a-tooltip></template>
      <template #eventTypes="row">
        <SubscriptionEventSummary :scopes="row.scopes" :providers="providers" :catalog-ready="!catalogLoading && !catalogError" />
      </template>
      <template #channelProvider="row">{{ channelName(row.channelProvider) }}</template>
      <template #executionState="row"><a-tag :color="executionColor(row.executionState)">{{ executionLabel(row.executionState) }}</a-tag></template>
      <template #state="row"><a-badge :status="row.state === 'enabled' ? 'success' : 'default'"
        :text="$t(row.state === 'enabled' ? 'ApiApplication.status.enabled' : 'ApiApplication.status.disabled')" /></template>
      <template #validation="row"><a-tag :color="row.validation?.valid ? 'success' : 'warning'">
        {{ $t(row.validation?.valid ? 'ApiApplication.subscription.valid' : 'ApiApplication.subscription.invalid') }}
      </a-tag></template>
      <template #createTime="row"><span class="table-time">{{ formatTime(row.createTime) }}</span></template>
      <template #action="row">
        <TableActions>
          <TableActionsItem common>
            <j-permission-button type="link" size="small" :hasPermission="true" :disabled="saving"
              :tooltip="{ title: $t('ApiApplication.subscription.edit') }" @click="openEditor(row)">
              <template #icon><AIcon type="EditOutlined" /></template>
            </j-permission-button>
          </TableActionsItem>
          <TableActionsItem>
            <j-permission-button type="link" size="small" :hasPermission="true"
              :danger="row.state === 'enabled'" :disabled="saving || (row.state !== 'enabled' && !applicationEnabled)"
              :tooltip="{ title: $t(row.state !== 'enabled' && !applicationEnabled ? 'ApiApplication.subscription.enableApplicationFirst' : row.state === 'enabled' ? 'ApiApplication.actions.disable' : 'ApiApplication.actions.enable') }"
              :popConfirm="{ title: $t(row.state === 'enabled' ? 'ApiApplication.subscription.disableConfirm' : 'ApiApplication.subscription.enableConfirm'), okButtonProps: { loading: saving }, onConfirm: () => toggle(row) }">
              <template #icon><AIcon :type="row.state === 'enabled' ? 'StopOutlined' : 'CheckCircleOutlined'" /></template>
              {{ $t(row.state === 'enabled' ? 'ApiApplication.actions.disable' : 'ApiApplication.actions.enable') }}
            </j-permission-button>
          </TableActionsItem>
          <TableActionsItem>
            <j-permission-button type="link" size="small" danger :hasPermission="true" :disabled="saving || row.state !== 'disabled'"
              :tooltip="{ title: $t(row.state !== 'disabled' ? 'ApiApplication.subscription.deleteDisabledOnly' : 'ApiApplication.actions.delete') }"
              :popConfirm="{ title: $t('ApiApplication.subscription.deleteConfirm'), okButtonProps: { loading: saving }, onConfirm: () => remove(row) }">
              <template #icon><AIcon type="DeleteOutlined" /></template>{{ $t('ApiApplication.actions.delete') }}
            </j-permission-button>
          </TableActionsItem>
        </TableActions>
      </template>
    </j-pro-table>
  </div>

  <SubscriptionEditor v-model:open="editorOpen" :subscription="editing" :providers="providers" :channels="channels"
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
          <a-descriptions-item :label="$t('ThirdPartyApplication.subscription.eventCategories')">
            <SubscriptionEventSummary :scopes="selected.scopes" :providers="providers" :catalog-ready="!catalogLoading && !catalogError" />
          </a-descriptions-item>
          <a-descriptions-item :label="$t('ApiApplication.subscription.channel')">{{ channelName(selected.channelProvider) }}</a-descriptions-item>
          <a-descriptions-item v-if="selected.channelProvider === 'http-hook'" :label="$t('ThirdPartyApplication.subscription.signature')">
            {{ $t('ThirdPartyApplication.subscription.signingHint') }}
          </a-descriptions-item>
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
import { createReusableTemplate } from '@vueuse/core'

import { useI18n } from 'vue-i18n'
import type { ApiApplication } from '@authentication-manager-ui/api/application-center/apiApplication'
import { useSubscriptionPanel } from '../useSubscriptionPanel'
import { executionColor } from '../subscriptionState'
import { formatTime } from '../integrationUtils'
import SubscriptionEditor from './SubscriptionEditor.vue'
import SubscriptionValidation from './SubscriptionValidation.vue'
import SubscriptionEventSummary from './SubscriptionEventSummary.vue'
const props = defineProps<{ application: ApiApplication }>()
const { t: $t } = useI18n()
const { providers, channels, catalogLoading, catalogError, listError, operationError, saving, validation, clearFeedback,
  tableRef, filters, editorOpen, detailOpen, detailLoading, editing, selected, applicationEnabled,
  filterColumns, columns, requestPage, handleSearch, channelName, executionLabel,
  openEditor, openDetail, save, check, toggle, remove } = useSubscriptionPanel(() => props.application)

const [DefineEmptyCreate, EmptyCreateButton] = createReusableTemplate()
</script>

<style scoped src="../../application-list.less" lang="less"></style>
<style scoped>
.subscription-alert { margin-bottom: var(--space-4); }
.table-link { max-width: 100%; padding-inline: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.table-time { white-space: normal; }
.configuration-json { max-height: 14rem; overflow: auto; margin: var(--space-1) 0 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.detail-actions { margin-top: var(--space-4); text-align: right; }
</style>
