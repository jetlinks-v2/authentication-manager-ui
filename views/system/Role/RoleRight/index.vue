<template>
  <DefineEmptyCreate>
    <j-permission-button class="authentication-system-list-page__primary-action" type="primary"
      has-permission="system/Role:add" @click="addRole">
      <AIcon type="PlusOutlined" />{{ $t('RoleRight.index.470525-0') }}
    </j-permission-button>
  </DefineEmptyCreate>
  <div v-bind="$attrs" class="role-container">
    <a-alert v-if="templateError" type="error" show-icon :message="$t('Role.application.templateLoadFailed')">
      <template #action><a-button size="small" @click="loadTemplate">{{ $t('ProjectApplication.list.retry') }}</a-button></template>
    </a-alert>
    <a-alert v-if="tableError" type="error" show-icon :message="$t('Role.application.rolesLoadFailed')">
      <template #action><a-button size="small" @click="tableRef?.reload()">{{ $t('ProjectApplication.list.retry') }}</a-button></template>
    </a-alert>
    <div class="role-table">
      <j-pro-table ref="tableRef" mode="TABLE" class="pro-table__no-padding" :columns="columns"
        :request="requestRoles" :params="queryParams"
        :default-params="{ sorts: [{ name: 'createTime', order: 'desc' }, { name: 'id', order: 'desc' }] }"
        @request-error="tableError = true">
        <template #emptyText>
          <CloudEmpty :search="emptyCreateSearch" :search-name="$t('User.index.673867-13')">
            <EmptyCreateButton v-if="!tableError" />
          </CloudEmpty>
        </template>
        <template #headerLeftRender>
          <a-flex gap="small">
            <ConditionFilter class="authentication-system-list-page__filter" no-margin
              :columns="columns" target="system-role" @change="search" />
            <EmptyCreateButton />
          </a-flex>
        </template>
        <template #action="role">
          <TableActions>
            <TableActionsItem v-for="action in getActions(role)" :key="action.id" :common="action.common" v-slot="{ placement }">
              <j-permission-button :disabled="action.disabled" :pop-confirm="action.popConfirm" :tooltip="{ title: action.text }"
                type="link" size="small" :danger="action.key === 'delete'" :has-permission="'system/Role:' + action.key" @click="action.onClick">
                <template #icon><AIcon :type="action.icon" /></template>
                <template v-if="placement === 'more'">{{ action.text }}</template>
              </j-permission-button>
            </TableActionsItem>
          </TableActions>
        </template>
      </j-pro-table>
    </div>
    <AddDialog v-if="dialog" :context="dialog" @close="dialog = undefined" @save="onSave" />
    <Copy v-if="copy.visible" :data="copy.data" @close="copy.visible = false" @save="onCopySave" />
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import type { PropType } from 'vue'
import { createReusableTemplate } from '@vueuse/core'
import type { RoleScope } from '../roleScope'
import { useRoleTable } from './useRoleTable'

const AddDialog = defineAsyncComponent(() => import('./components/AddDialog.vue'))
const Copy = defineAsyncComponent(() => import('./components/Copy.vue'))
defineOptions({ name: 'RoleRight' })
const props = defineProps({ scope: { type: Object as PropType<RoleScope>, required: true } })
const { queryParams, emptyCreateSearch, tableRef, tableError, dialog, copy,
  templateError, loadTemplate, requestRoles,
  search, addRole, onSave, onCopySave, columns, getActions } = useRoleTable(props)
const [DefineEmptyCreate, EmptyCreateButton] = createReusableTemplate()
</script>

<style lang="less" scoped>
.role-container {
  height: 100%;
  display: flex;
  flex-direction: column;

  .role-table {
    flex: 1 1 0;
    min-height: 0;
  }
  :deep(.jtable-body-header) {
    .jtable-body-header-left {
      flex: 1 1 0;
      min-width: 0;
    }
    .authentication-system-list-page__filter {
      flex: 1 1 0;
      width: auto;
      min-width: 0;
    }
  }
  :deep(.ant-table-cell) {
    .ant-btn-link {
      padding: 0;
    }
  }
}
</style>
