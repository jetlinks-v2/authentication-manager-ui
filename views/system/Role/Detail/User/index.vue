<template>

  <DefineEmptyCreate>
    <j-permission-button
        has-permission="system/Role:update"
        class="authentication-system-list-page__primary-action"
        type="primary"
        @click="dialogVisible = true"
    >
      <AIcon type="PlusOutlined" />{{ $t('User.index.667995-0') }}
    </j-permission-button>
  </DefineEmptyCreate>
  <div class="role-user-container">
    <a-alert v-if="loadError" type="error" show-icon :message="$t('Role.users.loadFailed')">
      <template #action><a-button size="small" @click="refresh">{{ $t('ProjectApplication.list.retry') }}</a-button></template>
    </a-alert>

    <div style="min-height: 0; flex: 1">
      <j-pro-table
          ref="tableRef"
          :columns="columns"
          style="padding: 0"
          :request="requestUsers"
          mode="TABLE"
          :params="queryParams"
          :rowSelection="rowSelection"
          :defaultParams="{
                        sorts: [{ name: 'createTime', order: 'desc' }],
                    }"
      >
        <template #emptyText>
          <CloudEmpty :search="Boolean(queryParams.terms?.length)" :search-name="$t('Department.index.945805-2')">
            <EmptyCreateButton v-if="!loadError" />
          </CloudEmpty>
        </template>
        <template #status="slotProps">
          <j-badge-status
              :status="isEnabled(slotProps.status) ? 1 : 0"
              :text="isEnabled(slotProps.status) ? $t('User.index.667995-3') : $t('User.index.667995-4')"
              :statusNames="{
            1: 'success',
            0: 'error',
          }"
          ></j-badge-status>
        </template>
        <template #headerRightRender>
          <a-space>
            <ConditionFilter
                class="authentication-system-list-page__filter"
                :columns="columns"
                target="system-role-user"
                @change="search"
            />
            <EmptyCreateButton />
            <j-permission-button
                has-permission="system/Role:update"
                :loading="saving"
                :disabled="!selectedRowKeys.length || loadError"
                :popConfirm="{
              title: $t('User.index.667995-1'),
              onConfirm: () => save(),
            }"
            >
              <AIcon type="DisconnectOutlined" />{{ $t('User.index.667995-2') }}
            </j-permission-button>
          </a-space>
        </template>
        <template #createTime="slotProps">
          {{ formatTime(slotProps.createTime) }}
        </template>
        <template #action="slotProps">
          <j-permission-button
              has-permission="system/Role:update"
              :disabled="saving || loadError"
              type="link"
              :tooltip="{ title: $t('User.index.667995-5') }"
              :pop-confirm="{
              title: $t('User.index.667995-6'),
              onConfirm: () => save([slotProps.id]),
            }"
          >
            <AIcon type="DisconnectOutlined" />
          </j-permission-button>
        </template>
      </j-pro-table>
    </div>
  </div>
  <AddUserDialog
      v-if="dialogVisible"
      v-model:visible="dialogVisible"
      :role-id="roleId"
      :application-id="applicationId"
      @refresh="refresh"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { createReusableTemplate } from '@vueuse/core'
import AddUserDialog from '../components/AddUserDialog.vue'
import { useRoleUsers } from './useRoleUsers'

defineOptions({ name: 'RoleUser' })
const props = defineProps<{ roleId: string; applicationId?: string }>()
const { columns, queryParams, tableRef, rowSelection, selectedRowKeys, saving, loadError,
  requestUsers, search, refresh, save, formatTime, isEnabled } = useRoleUsers(() => props)
const dialogVisible = ref(false)
const [DefineEmptyCreate, EmptyCreateButton] = createReusableTemplate()
</script>

<style lang="less" scoped>
.role-user-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
