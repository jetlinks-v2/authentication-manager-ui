<template>

  <DefineEmptyCreate>
    <a-button type="primary" @click="openCreate"><template #icon><AIcon type="PlusOutlined" /></template>{{ $t('ThirdPartyApplication.direct.create') }}</a-button>
  </DefineEmptyCreate>
  <j-page-container v-bind="$attrs">
    <ContentPanel fill class="application-list direct-page">
      <a-flex align="center" justify="space-between" :gap="16" class="application-list-toolbar">
        <ConditionFilter class="application-list-filter" :columns="filterColumns" target="third-party-direct" @change="search" />
        <EmptyCreateButton class="application-list-create" />
      </a-flex>
      <a-alert v-if="error" type="error" show-icon :message="error" class="page-alert" />
      <j-pro-table ref="tableRef" mode="TABLE" :columns="columns" :request="query" :params="filters" :body-style="{ padding: 0 }" :alert-show="false" :pagination="{ size: 'small' }" :scroll="false">
        <template #emptyText>
          <CloudEmpty :search="filters.terms" :search-name="$t('components.EditForm.949962-3')">
            <EmptyCreateButton />
          </CloudEmpty>
        </template>
        <template #name="row"><a-button class="table-link" type="link" @click="openDetail(row)">{{ row.name }}</a-button></template>
        <template #state="row"><a-badge :status="apiState(row) === 'enabled' ? 'success' : 'default'" :text="$t('ApiApplication.status.' + apiState(row))" /></template>
        <template #createTime="row">{{ formatTime(row.createTime) }}</template>
        <template #action="row">
          <TableActions>
            <TableActionsItem common>
              <j-permission-button type="link" size="small" :hasPermission="true" :disabled="!!busyId"
                :tooltip="{ title: $t('ThirdPartyApplication.edit') }" @click="openEdit(row)">
                <template #icon><AIcon type="EditOutlined" /></template>
              </j-permission-button>
            </TableActionsItem>
            <TableActionsItem>
              <j-permission-button type="link" size="small" :hasPermission="true" :disabled="!!busyId" :loading="busyId === row.id"
                :popConfirm="{ title: $t(apiState(row) === 'enabled' ? 'ThirdPartyApplication.direct.disableConfirm' : 'ThirdPartyApplication.direct.enableConfirm'), onConfirm: () => toggle(row) }">
                <template #icon><AIcon :type="apiState(row) === 'enabled' ? 'StopOutlined' : 'CheckCircleOutlined'" /></template>
                {{ $t(apiState(row) === 'enabled' ? 'ThirdPartyApplication.direct.disable' : 'ApiApplication.actions.enable') }}
              </j-permission-button>
            </TableActionsItem>
            <TableActionsItem>
              <j-permission-button type="link" size="small" danger :hasPermission="true" :disabled="!!busyId || apiState(row) !== 'disabled'"
                :tooltip="{ title: $t(apiState(row) !== 'disabled' ? 'ThirdPartyApplication.direct.deleteDisabledOnly' : 'ApiApplication.actions.delete') }"
                :popConfirm="{ title: $t('ThirdPartyApplication.direct.deleteConfirm'), onConfirm: () => remove(row) }">
                <template #icon><AIcon type="DeleteOutlined" /></template>{{ $t('ApiApplication.actions.delete') }}
              </j-permission-button>
            </TableActionsItem>
          </TableActions>
        </template>
      </j-pro-table>
    </ContentPanel>
    <a-modal v-model:open="formOpen" :title="$t(editingId ? 'ThirdPartyApplication.edit' : 'ThirdPartyApplication.direct.create')" :confirm-loading="saving"
      :closable="!saving" :mask-closable="!saving" :cancel-button-props="{ disabled: saving }"
      :ok-button-props="{ disabled: !form.name.trim() }" @ok="save">
      <a-alert v-if="formError" type="error" show-icon :message="formError" />
      <a-form layout="vertical">
        <a-form-item :label="$t('ThirdPartyApplication.name')" required><a-input v-model:value="form.name" :disabled="saving" /></a-form-item>
        <a-form-item :label="$t('ThirdPartyApplication.description')"><a-textarea v-model:value="form.description" :rows="3" :disabled="saving" /></a-form-item>
      </a-form>
      <a-alert v-if="!editingId" type="info" show-icon :message="$t('ThirdPartyApplication.direct.createHint')" />
    </a-modal>
  </j-page-container>
</template>
<script setup lang="ts" name="DirectThirdPartyApplications">
import { createReusableTemplate } from '@vueuse/core'

import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ConditionFilterChangePayload, ConditionFilterField } from '@jetlinks-web-core/components/ConditionFilter'
import type { ApiApplication } from '@authentication-manager-ui/api/application-center/apiApplication'
import { useDirectApplications } from './useDirectApplications'
import { apiState } from '../applicationUtils'
import { formatTime } from '../integrationUtils'
const { t: $t } = useI18n()
const tableRef = ref<{ reload: () => void }>()
const filters = ref<{ terms: Array<Record<string, unknown>> }>({ terms: [] })
const { error, formError, saving, busyId, formOpen, editingId, form, query, openCreate, openEdit, saveForm, openDetail, toggleState, removeApplication } = useDirectApplications()
const filterColumns = computed<ConditionFilterField[]>(() => [
  { dataIndex: 'name', title: $t('ThirdPartyApplication.name'), search: { type: 'string', defaultTermType: 'like' } },
  { dataIndex: 'state', title: $t('ApiApplication.subscription.state'), search: { type: 'select', options: [
    { label: $t('ApiApplication.status.enabled'), value: 'enabled' }, { label: $t('ApiApplication.status.disabled'), value: 'disabled' },
  ] } },
])
const columns = computed(() => [
  { title: $t('ThirdPartyApplication.name'), dataIndex: 'name', key: 'name', scopedSlots: true },
  { title: $t('ThirdPartyApplication.direct.applicationId'), dataIndex: 'id', key: 'id' },
  { title: $t('ApiApplication.subscription.state'), dataIndex: 'state', key: 'state', scopedSlots: true },
  { title: $t('ApiApplication.columns.createTime'), key: 'createTime', scopedSlots: true },
  { title: $t('ApiApplication.columns.action'), key: 'action', scopedSlots: true, fixed: 'right' as const, width: 100 },
])
const search = ({ filter }: ConditionFilterChangePayload) => { filters.value = { terms: filter.terms as Array<Record<string, unknown>> }; tableRef.value?.reload() }
const save = async () => { if (await saveForm()) tableRef.value?.reload() }
const toggle = async (row: ApiApplication) => { if (await toggleState(row)) tableRef.value?.reload() }
const remove = async (row: ApiApplication) => { if (await removeApplication(row)) tableRef.value?.reload() }

const [DefineEmptyCreate, EmptyCreateButton] = createReusableTemplate()
</script>
<style scoped src="../../application-list.less" lang="less"></style>
<style scoped>
.direct-page { overflow: visible; }
.page-alert { margin: 16px 0; }
.table-link { padding-inline: 0; }
</style>
