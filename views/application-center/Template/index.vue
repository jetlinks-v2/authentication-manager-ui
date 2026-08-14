<template>
  <j-page-container>
    <div class="application-template-page">
      <div class="application-template-page__body">
        <div class="application-template-page__sidebar">
          <ApplicationTemplateTagSidebar
            v-model:selectedTagIds="selectedTagIds"
            :permission="permission"
            @change="table.refresh"
            @refresh="table.refresh"
          />
        </div>

        <FullPage class="application-template-page__content">
          <a-spin :spinning="tableLoading" class="application-template-page__table-spin">
            <j-pro-table
              ref="tableRef"
              :columns="columns"
              :request="requestTable"
              mode="TABLE"
              :params="tableParams"
              :defaultParams="defaultParams"
              :scroll="{ y: 'calc(100% - 3.75rem)' }"
            >
              <template #headerLeftRender>
                <j-permission-button
                  :hasPermission="`${permission}:add`"
                  type="primary"
                  @click="table.openCreateDialog()"
                >
                  <AIcon type="PlusOutlined" />
                  {{ $t('ApplicationTemplate.list.add') }}
                </j-permission-button>
              </template>

              <template #name="slotProps">
                <a class="application-template-page__link" @click="table.viewDetail(slotProps)">
                  {{ slotProps.name || '--' }}
                </a>
              </template>

              <template #state="slotProps">
                <a-switch
                  :checked="slotProps._switchChecked ?? normalizeState(slotProps.state) === 'enabled'"
                  :loading="slotProps._statusLoading"
                  @change="checked => table.changeStatus(slotProps, checked)"
                />
              </template>

              <template #action="slotProps">
                <a-space>
                  <j-permission-button
                    :hasPermission="`${permission}:update`"
                    type="link"
                    @click="table.viewDetail(slotProps)"
                  >
                    {{ $t('ApplicationTemplate.common.edit') }}
                  </j-permission-button>
                  <j-permission-button
                    :hasPermission="`${permission}:delete`"
                    type="link"
                    danger
                    @click="table.clickDel(slotProps.id)"
                  >
                    {{ $t('ApplicationTemplate.common.delete') }}
                  </j-permission-button>
                </a-space>
              </template>
            </j-pro-table>
          </a-spin>
        </FullPage>
      </div>
    </div>

    <ApplicationTemplateCreateDialog
      v-model:open="createDialogOpen"
      @created="table.handleCreated"
    />
  </j-page-container>
</template>

<script setup lang="ts" name="ApplicationTemplateManage">
import ApplicationTemplateCreateDialog from './components/ApplicationTemplateCreateDialog.vue'
import ApplicationTemplateTagSidebar from './components/ApplicationTemplateTagSidebar.vue'
import { useApplicationTemplateList } from './useApplicationTemplateList'

const {
  permission,
  selectedTagIds,
  tableRef,
  tableLoading,
  createDialogOpen,
  columns,
  defaultParams,
  tableParams,
  requestTable,
  normalizeState,
  table,
} = useApplicationTemplateList()
</script>

<style lang="less" scoped>
.application-template-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  height: 100%;

  &__body {
    display: grid;
    grid-template-columns: 20rem minmax(0, 1fr);
    gap: var(--space-4);
    min-height: 0;
    flex: 1;
  }

  &__sidebar,
  &__content {
    min-height: 0;
  }

  &__link {
    color: var(--jet-theme-primary);
    cursor: pointer;
  }

  &__table-spin {
    display: block;
    height: 100%;

    :deep(.ant-spin-container),
    :deep(.ant-spin-nested-loading) {
      height: 100%;
    }
  }

  :deep(.ant-table-tbody) {
    .ant-table-cell {
      .ant-space-item {
        .ant-btn-link {
          padding: 0;
        }
      }
    }
  }
}
</style>
