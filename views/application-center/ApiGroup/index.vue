<template>

  <DefineEmptyCreate>
    <j-permission-button :hasPermission="groupMenu + ':add'" type="primary" @click="create"><template #icon><AIcon type="PlusOutlined" /></template>{{ $t('ApiGroupManagement.create') }}</j-permission-button>
  </DefineEmptyCreate>
  <j-page-container v-bind="$attrs">
    <ContentPanel fill class="application-list api-group-list">
      <a-flex align="center" justify="space-between" :gap="16" class="application-list-toolbar">
        <ConditionFilter v-if="canQuery" class="application-list-filter" :columns="columns" target="api-group-management" @change="handleSearch" />
        <EmptyCreateButton class="application-list-create" />
      </a-flex>
      <a-alert v-if="!canQuery" type="warning" show-icon :message="$t('ApiGroupManagement.noQueryPermission')" />
      <template v-else>
        <a-alert v-if="error" type="error" show-icon :message="error" class="page-alert" />
        <j-pro-table ref="tableRef" mode="TABLE" :columns="columns" :request="requestPage" :params="params" :body-style="{ padding: 0 }" :alert-show="false" :pagination="{ size: 'small' }" :scroll="false">
          <template #emptyText>
            <CloudEmpty :search="params.terms" :search-name="$t('components.AddDialog.956922-6')">
              <EmptyCreateButton />
            </CloudEmpty>
          </template>
          <template #name="row"><a-button class="table-link" type="link" @click="open(row)">{{ row.name }}</a-button></template>
          <template #id="row"><a-typography-text copyable :content="row.id">{{ row.id }}</a-typography-text></template>
          <template #status="row"><a-badge :status="groupValue(row.status) === 'enabled' ? 'success' : 'default'" :text="groupText(row.status, $t, 'ApiGroupManagement.state.')" /></template>
          <template #action="row">
            <TableActions>
              <TableActionsItem common>
                <j-permission-button :hasPermission="groupMenu + ':update'" type="link" size="small"
                  :tooltip="{ title: $t('ApiGroupManagement.edit') }"
                  :aria-label="$t('ApiGroupManagement.edit')" @click="openEdit(row)">
                  <template #icon><AIcon type="EditOutlined" /></template>
                </j-permission-button>
              </TableActionsItem>
              <TableActionsItem>
                <j-permission-button :hasPermission="groupMenu + ':action'" type="link" size="small" :disabled="!!busyId" :loading="busyId === row.id"
                  :danger="groupValue(row.status) === 'enabled'"
                  :popConfirm="{ title: $t(groupValue(row.status) === 'enabled' ? 'ApiGroupManagement.disableConfirm' : 'ApiGroupManagement.enableConfirm'), onConfirm: () => toggle(row) }">
                  <template #icon><AIcon :type="groupValue(row.status) === 'enabled' ? 'StopOutlined' : 'CheckCircleOutlined'" /></template>
                  {{ $t(groupValue(row.status) === 'enabled' ? 'ApiGroupManagement.disable' : 'ApiGroupManagement.enable') }}
                </j-permission-button>
              </TableActionsItem>
              <TableActionsItem>
                <j-permission-button :hasPermission="groupMenu + ':delete'" type="link" size="small" danger :disabled="!!busyId || groupValue(row.status) !== 'disabled'"
                  :tooltip="{ title: $t(groupValue(row.status) !== 'disabled' ? 'ApiGroupManagement.deleteDisabledOnly' : 'ApiGroupManagement.delete') }"
                  :popConfirm="{ title: $t('ApiGroupManagement.deleteConfirm'), onConfirm: () => remove(row) }">
                  <template #icon><AIcon type="DeleteOutlined" /></template>
                  {{ $t('ApiGroupManagement.delete') }}
                </j-permission-button>
              </TableActionsItem>
            </TableActions>
          </template>
        </j-pro-table>
      </template>
    </ContentPanel>
    <a-modal v-model:open="editOpen" :title="$t('ApiGroupManagement.editTitle')" :confirm-loading="saving"
      :ok-text="$t('ApiGroupManagement.save')" :cancel-text="$t('ApiGroupManagement.cancel')"
      :closable="!saving" :mask-closable="!saving" :cancel-button-props="{ disabled: saving }"
      :ok-button-props="{ disabled: !editForm.name.trim() }" @ok="saveEdit">
      <a-alert v-if="editError" type="error" show-icon :message="editError" class="page-alert" />
      <a-form layout="vertical" :model="editForm">
        <a-form-item :label="$t('ApiGroupManagement.name')" required>
          <a-input v-model:value="editForm.name" :maxlength="64" :disabled="saving" :placeholder="$t('ApiGroupManagement.namePlaceholder')" />
        </a-form-item>
        <a-form-item :label="$t('ApiGroupManagement.description')">
          <a-textarea v-model:value="editForm.description" :disabled="saving" :auto-size="{ minRows: 2, maxRows: 4 }" />
        </a-form-item>
      </a-form>
    </a-modal>
  </j-page-container>
</template>
<script setup lang="ts" name="ApiGroupManagement">
import { createReusableTemplate } from '@vueuse/core'

import { useI18n } from 'vue-i18n'
import { useApiGroupList } from './useApiGroupList'
import { groupText, groupValue } from './groupUtils'
const { t: $t } = useI18n()
const { groupMenu, canQuery, tableRef, params, columns, error, busyId, editOpen, editForm, editError, saving,
  requestPage, handleSearch, create, open, openEdit, saveEdit, toggle, remove } = useApiGroupList()

const [DefineEmptyCreate, EmptyCreateButton] = createReusableTemplate()
</script>
<style scoped src="../application-list.less" lang="less"></style>
<style scoped>
.api-group-list { overflow: visible; }
.page-alert { margin: 16px 0; }
.table-link { padding-inline: 0; }
</style>
