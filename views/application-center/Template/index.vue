<template>
  <j-page-container>
    <div class="application-template-page">
      <div class="application-template-page__body">
        <FullPage class="application-template-page__content">
          <ApplicationTemplateSearch
            class="application-template-page__search"
            :model-value="searchModel"
            :state-options="stateOptions"
            @search="table.search"
            @reset="table.resetSearch"
          />

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
                  @change="checked => table.changeStatus(slotProps, checked === true)"
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
import ApplicationTemplateSearch from './components/ApplicationTemplateSearch.vue'
import ApplicationTemplateCreateDialog from './components/ApplicationTemplateCreateDialog.vue'
import { useApplicationTemplateList } from './useApplicationTemplateList'

const {
  permission,
  tableRef,
  tableLoading,
  createDialogOpen,
  searchModel,
  stateOptions,
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
    min-height: 0;
    flex: 1;
  }

  &__content {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  &__search {
    flex-shrink: 0;
  }

  &__link {
    color: var(--jet-theme-primary);
    cursor: pointer;
  }

  &__table-spin {
    display: block;
    flex: 1;
    height: 100%;
    min-height: 0;

    :deep(.ant-spin-container),
    :deep(.ant-spin-nested-loading) {
      height: 100%;
      min-height: 0;
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
