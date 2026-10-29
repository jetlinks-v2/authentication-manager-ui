<template>

  <DefineEmptyCreate>
    <j-permission-button
     :hasPermission="`${permission}:add`"
     type="primary"
     @click="table.openCreateDialog()"
    >
     <AIcon type="PlusOutlined" />
     {{ $t('ApplicationTemplate.list.add') }}
    </j-permission-button>
  </DefineEmptyCreate>
  <j-page-container v-bind="$attrs">
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
		            <template #emptyText>
		              <CloudEmpty :search="queryParams?.terms" :search-name="$t('EmptyCreate.names.application_templates')">
		                <EmptyCreateButton />
		              </CloudEmpty>
		            </template>
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
				            <EmptyCreateButton />
		              </a-flex>
		            </template>
		
	            <template #name="slotProps">
	              <a class="application-template-page__link" @click="table.viewDetail(slotProps)">
	                {{ slotProps.i18nName || slotProps.name || $t('comm.table.empty') }}
	              </a>
	            </template>

	            <template #description="slotProps">
	              {{ slotProps.i18nDescription || slotProps.description || $t('comm.table.empty') }}
	            </template>
		
		            <template #state="slotProps">
		              <j-badge-status
		                :status="normalizeState(slotProps.state)"
		                :statusNames="{ enabled: 'processing', disabled: 'error' }"
		                :text="$t(normalizeState(slotProps.state) === 'enabled' ? 'ApplicationTemplate.common.enabled' : 'ApplicationTemplate.common.disabled')"
		              />
		            </template>
		
		            <template #action="slotProps">
		              <TableActions>
		                <TableActionsItem common>
		                  <j-permission-button
		                    :hasPermission="`${permission}:update`"
		                    type="link"
		                    size="small"
		                    :tooltip="{ title: $t('ApplicationTemplate.common.edit') }"
		                    @click="table.viewDetail(slotProps)"
		                  >
		                    <span role="img" :aria-label="$t('ApplicationTemplate.common.edit')">
		                      <AIcon type="EditOutlined" />
		                    </span>
		                  </j-permission-button>
		                </TableActionsItem>
		                <TableActionsItem>
		                  <j-permission-button
		                    :hasPermission="`${permission}:action`"
		                    type="link"
		                    :loading="slotProps._statusLoading"
		                    @click="table.changeStatus(slotProps, normalizeState(slotProps.state) !== 'enabled')"
		                  >
		                    <AIcon :type="normalizeState(slotProps.state) === 'enabled' ? 'StopOutlined' : 'PlayCircleOutlined'" />
		                    {{ $t(normalizeState(slotProps.state) === 'enabled' ? 'ApplicationTemplate.common.disable' : 'ApplicationTemplate.common.enable') }}
		                  </j-permission-button>
		                </TableActionsItem>
		                <TableActionsItem>
		                  <j-permission-button
		                    :hasPermission="`${permission}:delete`"
		                    type="link"
		                    danger
		                    @click="table.clickDel(slotProps.id)"
		                  >
		                    <AIcon type="DeleteOutlined" />
		                    {{ $t('ApplicationTemplate.common.delete') }}
		                  </j-permission-button>
		                </TableActionsItem>
		              </TableActions>
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
import { createReusableTemplate } from '@vueuse/core'

import ConditionFilter from '@jetlinks-web-core/components/ConditionFilter'
import TableActions, { TableActionsItem } from '@jetlinks-web-core/components/TableActions'
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

const [DefineEmptyCreate, EmptyCreateButton] = createReusableTemplate()
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
