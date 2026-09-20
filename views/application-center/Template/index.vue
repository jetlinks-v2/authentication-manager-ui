<template>
  <j-page-container>
    <FullPage class="application-template-page__content" transparentBackground>
      
        <div class="application-template-page">
          <div class="application-template-page__body">
		        <a-spin :spinning="tableLoading" class="application-template-page__table-spin">
		          <j-pro-table
		            ref="tableRef"
		            :columns="columns"
		            :request="requestTable"
		            mode="TABLE"
		            :params="queryParams"
		            :defaultParams="defaultParams"
		            class="pro-table__no-padding"
		            :scroll="{ y: 'calc(100% - 3.75rem)' }"
		          >
		            <template #headerLeftRender>
		              <div class="application-template-page__toolbar">
		                <h2 class="application-template-page__title">
		                  {{ $t('ProjectApplication.create.template') }}
		                </h2>
		              </div>
		            </template>
		            <template #headerRightRender>
		              <a-flex :gap="16">
				            <ConditionFilter
					            class="application-template-page__search"
					            :columns="columns"
					            @change="table.handleSearch"
				            />
				            <j-permission-button
					            :hasPermission="`${permission}:add`"
					            type="primary"
					            @click="table.openCreateDialog()"
				            >
					            <AIcon type="PlusOutlined" />
					            {{ $t('ApplicationTemplate.list.add') }}
				            </j-permission-button>
		              </a-flex>
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
		        
          </div>
        </div>
      
    </FullPage>

    <ApplicationTemplateCreateDialog
      v-model:open="createDialogOpen"
      @created="table.handleCreated"
    />
  </j-page-container>
</template>

<script setup lang="ts" name="ApplicationTemplateManage">
import ConditionFilter from '@jetlinks-web-core/components/ConditionFilter'
import ApplicationTemplateCreateDialog from './components/ApplicationTemplateCreateDialog.vue'
import { useApplicationTemplateList } from './useApplicationTemplateList'

const {
  permission,
  tableRef,
  tableLoading,
  createDialogOpen,
  queryParams,
  columns,
  defaultParams,
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

  &__link {
    color: var(--jet-theme-primary);
    cursor: pointer;
  }

  &__toolbar {
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    align-items: center;
    gap: 16px;
  }

  &__title {
    margin: 0;
    color: rgba(0, 0, 0, 0.85);
    font-size: var(--fs-18);
    font-weight: 600;
    line-height: 32px;
    white-space: nowrap;
  }

  &__search {
    flex: 1 1 360px;
    min-width: 25rem;
    max-width: 40rem;
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
