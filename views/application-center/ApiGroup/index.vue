<template>
  <j-page-container>
    <div class="api-group-list">
      <div class="page-head">
        <div><h1>{{ $t('ApiGroupManagement.title') }}</h1><p>{{ $t('ApiGroupManagement.subtitle') }}</p></div>
        <j-permission-button :hasPermission="groupMenu + ':add'" type="primary" @click="create"><AIcon type="PlusOutlined" />{{ $t('ApiGroupManagement.create') }}</j-permission-button>
      </div>
      <a-alert v-if="!canQuery" type="warning" show-icon :message="$t('ApiGroupManagement.noQueryPermission')" />
      <template v-else>
        <ConditionFilter :columns="columns" target="api-group-management" @change="handleSearch" />
        <a-alert v-if="error" type="error" show-icon :message="error" class="page-alert" />
        <j-pro-table ref="tableRef" mode="TABLE" :columns="columns" :request="requestPage" :params="params" :scroll="{ x: 1200 }">
          <template #name="row"><a-button type="link" @click="open(row)">{{ row.name }}</a-button></template>
          <template #id="row"><a-typography-text copyable :content="row.id">{{ row.id }}</a-typography-text></template>
          <template #status="row"><a-badge :status="groupValue(row.status) === 'enabled' ? 'success' : 'default'" :text="groupText(row.status, $t, 'ApiGroupManagement.state.')" /></template>
          <template #operationCount="row">{{ row.operations?.length || 0 }}</template>
          <template #action="row">
            <a-space :size="0">
              <j-permission-button :hasPermission="groupMenu + ':view'" type="link" @click="open(row)">{{ $t(canUpdate ? 'ApiGroupManagement.edit' : 'ApiGroupManagement.view') }}</j-permission-button>
              <a-popconfirm :title="$t(groupValue(row.status) === 'enabled' ? 'ApiGroupManagement.disableConfirm' : 'ApiGroupManagement.enableConfirm')" @confirm="toggle(row)">
                <j-permission-button :hasPermission="groupMenu + ':action'" type="link" :disabled="!!busyId" :loading="busyId === row.id">
                  {{ $t(groupValue(row.status) === 'enabled' ? 'ApiGroupManagement.disable' : 'ApiGroupManagement.enable') }}
                </j-permission-button>
              </a-popconfirm>
              <a-popconfirm :title="$t('ApiGroupManagement.deleteConfirm')" @confirm="remove(row)">
                <j-permission-button :hasPermission="groupMenu + ':delete'" type="link" danger :disabled="!!busyId">{{ $t('ApiGroupManagement.delete') }}</j-permission-button>
              </a-popconfirm>
            </a-space>
          </template>
        </j-pro-table>
      </template>
    </div>
  </j-page-container>
</template>
<script setup lang="ts" name="ApiGroupManagement">
import { useI18n } from 'vue-i18n'
import { useApiGroupList } from './useApiGroupList'
import { groupText, groupValue } from './groupUtils'
const { t: $t } = useI18n()
const { groupMenu, canQuery, canUpdate, tableRef, params, columns, error, busyId,
  requestPage, handleSearch, create, open, toggle, remove } = useApiGroupList()
</script>
<style scoped>
.api-group-list { padding: var(--space-4); min-height: 100%; background: var(--bg); }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }h1 { margin: 0; font-size: var(--fs-20); }
p { margin: 4px 0 0; color: var(--ink-4); }.page-alert { margin: 16px 0; }
@media(max-width: 720px) { .page-head { flex-direction: column; align-items: flex-start; } }
</style>
