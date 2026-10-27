<template>

  <DefineEmptyCreate>
    <a-button type="primary" @click="openCreate"><template #icon><AIcon type="PlusOutlined" /></template>{{ $t('ThirdPartyApplication.direct.create') }}</a-button>
  </DefineEmptyCreate>
  <j-page-container v-bind="$attrs">
    <div class="direct-page">
      <a-flex align="center" justify="space-between" :gap="12" class="direct-toolbar">
        <ConditionFilter class="direct-filter" :columns="filterColumns" target="third-party-direct" @change="search" />
        <EmptyCreateButton />
      </a-flex>
      <a-alert v-if="error" type="error" show-icon :message="error" class="page-alert" />
      <j-pro-table class="pro-table__no-padding" ref="tableRef" mode="TABLE" :columns="columns" :request="query" :params="filters" :scroll="{ x: 800 }">
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
              <a-tooltip :title="$t('ThirdPartyApplication.edit')">
                <a-button type="link" size="small" :disabled="!!busyId" :aria-label="$t('ThirdPartyApplication.edit')" @click="openEdit(row)">
                  <template #icon><AIcon type="EditOutlined" /></template>
                </a-button>
              </a-tooltip>
            </TableActionsItem>
            <TableActionsItem v-slot="{ close }" :close-on-click="false">
              <a-popconfirm :title="$t(apiState(row) === 'enabled' ? 'ThirdPartyApplication.direct.disableConfirm' : 'ThirdPartyApplication.direct.enableConfirm')" @confirm="toggle(row, close)">
                <a-button type="link" size="small" :disabled="!!busyId" :loading="busyId === row.id" :danger="apiState(row) === 'enabled'">
                  <template #icon><AIcon :type="apiState(row) === 'enabled' ? 'StopOutlined' : 'CheckCircleOutlined'" /></template>
                  {{ $t(apiState(row) === 'enabled' ? 'ThirdPartyApplication.direct.disable' : 'ApiApplication.actions.enable') }}
                </a-button>
              </a-popconfirm>
            </TableActionsItem>
          </TableActions>
        </template>
      </j-pro-table>
    </div>
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
const { error, formError, saving, busyId, formOpen, editingId, form, query, openCreate, openEdit, saveForm, openDetail, toggleState } = useDirectApplications()
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
const toggle = async (row: ApiApplication, close: () => void) => {
  if (await toggleState(row)) {
    close()
    tableRef.value?.reload()
  }
}

const [DefineEmptyCreate, EmptyCreateButton] = createReusableTemplate()
</script>
<style scoped>
.direct-page { box-sizing: border-box; min-width: 0; padding: var(--space-4); min-height: 100%; background: var(--bg); }
.direct-toolbar { margin-bottom: var(--space-3); }
.direct-filter { flex: 1 1 auto; min-width: 0; margin: 0; }
.direct-toolbar > .ant-btn { flex-shrink: 0; }
.page-alert { margin: 16px 0; }
.table-link { padding-inline: 0; }
</style>
