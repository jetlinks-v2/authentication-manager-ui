<template>
  <a-modal open :title="$t('components.AddUserDialog.659587-0')" :width="1000"
    :confirm-loading="saving" :ok-button-props="{ disabled: !selectedRowKeys.length || loadError }"
    @ok="save()" @cancel="emits('update:visible', false)">
    <a-alert v-if="loadError" type="error" show-icon :message="$t('Role.users.loadFailed')">
      <template #action><a-button size="small" @click="refresh">{{ $t('ProjectApplication.list.retry') }}</a-button></template>
    </a-alert>
    <div style="height: 30rem">
      <j-pro-table ref="tableRef" style="padding: 0" :columns="columns" :request="requestUsers"
        mode="TABLE" :params="queryParams" :rowSelection="rowSelection"
        :default-params="{ sorts: [{ name: 'createTime', order: 'desc' }] }">
        <template #headerLeftRender>
          <ConditionFilter no-margin :columns="columns" target="system-role-user-candidates" @change="search" />
        </template>
      </j-pro-table>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { useRoleUsers } from '../User/useRoleUsers'

defineOptions({ name: 'RoleAddUser' })
const props = defineProps<{ visible: boolean; roleId: string; applicationId?: string }>()
const emits = defineEmits<{ refresh: []; 'update:visible': [value: boolean] }>()
const { columns, queryParams, tableRef, rowSelection, selectedRowKeys, saving, loadError,
  requestUsers, search, refresh, save } = useRoleUsers(() => props, true, () => {
  emits('refresh')
  emits('update:visible', false)
})
</script>
