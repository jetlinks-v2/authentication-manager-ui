<template>
  <div class="grant-panel" :class="{ 'grant-panel--direct': !isTemplateGrant }">
    <div class="grant-head">
      <p>{{ $t(isTemplateGrant ? 'ThirdPartyApplication.direct.grantHint' : 'ThirdPartyApplication.direct.tableHint') }}</p>
      <PageActions v-if="isTemplateGrant">
        <a-button v-if="canManageGroups" :disabled="saving" @click="openGroupManager">{{ $t('ThirdPartyApplication.direct.manageGroups') }}</a-button>
        <a-popconfirm :title="$t('ThirdPartyApplication.project.discardConfirm')" @confirm="load">
          <a-button :disabled="saving">{{ $t('ThirdPartyApplication.project.refresh') }}</a-button>
        </a-popconfirm>
        <a-popconfirm :title="$t('ThirdPartyApplication.direct.revokeAllConfirm')" @confirm="save(true)">
          <a-button danger :disabled="!loaded || loading || saving || !original.length">{{ $t('ThirdPartyApplication.direct.revokeAll') }}</a-button>
        </a-popconfirm>
        <a-popconfirm :title="$t('ThirdPartyApplication.direct.replaceGrantsConfirm')" @confirm="save(false)">
          <a-button type="primary" :loading="saving" :disabled="!loaded || loading || !changed.length">{{ $t('ApiApplication.actions.save') }}</a-button>
        </a-popconfirm>
      </PageActions>
    </div>
    <a-alert v-if="error" type="error" show-icon :message="error" class="grant-alert" />
    <a-alert v-if="hiddenGrants" type="warning" show-icon :message="$t('ThirdPartyApplication.direct.hiddenGrants')" class="grant-alert" />
    <a-spin :spinning="loading">
      <a-table v-if="!isTemplateGrant" class="grant-table" row-key="id" table-layout="fixed" :columns="tableColumns"
        :data-source="groupRows" :pagination="false" :scroll="{ x: 680 }">
        <template #headerCell="{ column }">
          <a-checkbox v-if="column.key === 'group'" :checked="tableSelection.checked" :indeterminate="tableSelection.indeterminate"
            :disabled="!loaded || loading || saving || tableSelection.disabled" @change="toggleAll($event.target.checked)">
            {{ column.title }}
          </a-checkbox>
          <span v-else>{{ column.title }}</span>
        </template>
        <template #bodyCell="{ column, record }">
          <div v-if="column.key === 'group'" class="group-cell">
            <a-checkbox :checked="record.checked" :indeterminate="record.indeterminate"
              :disabled="loading || saving || record.selectionDisabled" @change="toggleGroup(record, $event.target.checked)">
              {{ record.name || record.id }}
            </a-checkbox>
          </div>
          <div v-else-if="column.key === 'operations'" class="operation-cell">
            <a-checkbox-group v-if="record.operationOptions.length" :value="selected[record.id] || []" :disabled="loading || saving"
              class="table-operation-list" @change="values => update(record.id, values as string[])">
              <a-checkbox v-for="operation in record.operationOptions" :key="operation.id" :value="operation.id" :disabled="operation.disabled">
                <span class="grant-operation-content">
                  <span>{{ operation.name || operation.id }}</span>
                  <span v-if="operation.description" class="grant-operation-description">{{ operation.description }}</span>
                </span>
              </a-checkbox>
            </a-checkbox-group>
            <span v-else class="empty-operations">{{ $t('ThirdPartyApplication.direct.groupWithoutOperations') }}</span>
            <a-typography-text v-if="record.hasUnavailableOperations" type="warning" class="operation-hint">
              {{ $t('ThirdPartyApplication.direct.unavailableOperations') }}
            </a-typography-text>
          </div>
        </template>
        <template #emptyText><CloudEmpty :description="$t('ThirdPartyApplication.direct.noGroups')" /></template>
      </a-table>
      <template v-else>
        <CloudEmpty v-if="loaded && !groups.length" :description="$t('ThirdPartyApplication.direct.noGroups')">
          <a-button v-if="canManageGroups" @click="openGroupManager">{{ $t('ThirdPartyApplication.direct.manageGroups') }}</a-button>
        </CloudEmpty>
        <a-collapse v-else>
          <a-collapse-panel v-for="group in groups" :key="group.id">
            <template #header><span>{{ group.name || group.id }}</span><a-tag class="scope-tag">{{ group.id }}</a-tag></template>
            <a-space class="group-actions">
              <a-button type="link" :disabled="saving || !operations(group).some(item => !item.disabled)" @click="selectAll(group)">{{ $t('ThirdPartyApplication.direct.selectAll') }}</a-button>
              <a-button type="link" :disabled="saving" @click="update(group.id, [])">{{ $t('ThirdPartyApplication.direct.clearGroup') }}</a-button>
            </a-space>
            <CloudEmpty v-if="!operations(group).length" :description="$t('ThirdPartyApplication.direct.groupWithoutOperations')" />
            <a-alert v-else-if="operations(group).some(item => item.disabled)" type="warning" show-icon class="grant-alert"
              :message="$t('ThirdPartyApplication.direct.unavailableOperations')" />
            <a-checkbox-group :value="selected[group.id] || []" :disabled="saving" class="operation-list" @change="values => update(group.id, values as string[])">
              <a-checkbox v-for="operation in operations(group)" :key="operation.id" :value="operation.id" :disabled="operation.disabled">
                {{ operation.name || operation.id }}<small v-if="operation.description">{{ operation.description }}</small>
              </a-checkbox>
            </a-checkbox-group>
            <a-alert v-if="assetHint(group)" :type="assetHint(group)?.type" show-icon class="grant-alert" :message="$t(assetHint(group)?.message || '')" />
          </a-collapse-panel>
        </a-collapse>
      </template>
    </a-spin>
    <PageActions v-if="!isTemplateGrant" class="grant-footer">
      <a-popconfirm :title="$t('ThirdPartyApplication.direct.replaceGrantsConfirm')"
        :disabled="!loaded || loading || saving || !pendingChanges.length" @confirm="save(false)">
        <a-button type="primary" :loading="saving" :disabled="!loaded || loading || !pendingChanges.length">
          {{ $t('ApiApplication.actions.save') }}
        </a-button>
      </a-popconfirm>
    </PageActions>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDirectGrants } from './useDirectGrants'
import { TEMPLATE_GRANT_TARGET } from '@authentication-manager-ui/api/application-center/apiApplication'
// targetType 缺省时由 useDirectGrants 按 API 应用（api-client）处理。
const props = defineProps<{ targetId: string; targetType?: string }>()
const { t: $t } = useI18n()
const isTemplateGrant = computed(() => props.targetType === TEMPLATE_GRANT_TARGET)
const { groups, original, selected, changed, pendingChanges, loading, saving, loaded, error, hiddenGrants,
  tableColumns, groupRows, tableSelection, toggleGroup, toggleAll,
  update, selectAll, operations, assetHint, canManageGroups, openGroupManager, save, load } = useDirectGrants(() => props.targetId, props.targetType)
</script>
<style scoped>
.grant-head { display: flex; gap: var(--space-4); justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-4); flex-wrap: wrap; }
.grant-head p { color: var(--ink-4); flex: 1; min-width: 220px; }
.grant-alert { margin: var(--space-3) 0; }
.scope-tag { margin-left: var(--space-3); }
.operation-list { display: flex; flex-direction: column; gap: var(--space-3); }
.operation-list small { display: block; color: var(--ink-4); }
.group-actions { margin-bottom: var(--space-3); }
.grant-panel--direct { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); min-width: 0; }
.grant-panel--direct .grant-head { align-items: center; margin-bottom: 0; }
.grant-panel--direct .grant-head p { margin: 0; }
.grant-panel--direct > .grant-alert { margin: 0; }
.grant-footer { justify-content: flex-end; padding-block-start: var(--space-4); border-block-start: 1px solid var(--line); }
.grant-table { min-width: 0; max-width: 100%; }
.grant-table :deep(.ant-table-cell) { vertical-align: top; text-align: start; }
.grant-table :deep(.ant-table-thead > tr > th) {
  background: var(--jet-theme-bg-layout);
  color: var(--jet-theme-text-secondary);
  font-size: var(--fs-14);
}
.group-cell { display: flex; flex-direction: column; width: 100%; min-width: 0; gap: var(--space-1); }
.operation-cell { display: flex; flex-direction: column; align-items: stretch; width: 100%; min-width: 0; gap: var(--space-2); text-align: start; }
.table-operation-list {
  display: grid;
  width: 100%;
  min-width: 0;
  /* 保留等宽列轨道，避免不同分组的权限数量和文案长度改变列位置。 */
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr));
  justify-content: start;
  justify-items: stretch;
  align-items: start;
  gap: var(--space-3) var(--space-4);
}
.group-cell :deep(.ant-checkbox-wrapper),
.table-operation-list :deep(.ant-checkbox-wrapper) {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  margin: 0;
  text-align: start;
  white-space: normal;
}
.group-cell :deep(.ant-checkbox-wrapper > span:last-child),
.table-operation-list :deep(.ant-checkbox-wrapper > span:last-child) { flex: 1; min-width: 0; overflow-wrap: anywhere; }
/* AntDV 默认将复选框在整个标签中居中，多行名称与说明需对齐首行。 */
.group-cell :deep(.ant-checkbox),
.table-operation-list :deep(.ant-checkbox) { flex: none; align-self: flex-start; margin-block-start: 0.2em; }
.grant-operation-content { display: flex; flex-direction: column; min-width: 0; white-space: normal; overflow-wrap: anywhere; }
.grant-operation-description { color: var(--ink-4); font-size: var(--fs-12); line-height: 1.5; white-space: pre-wrap; }
.operation-hint { font-size: var(--fs-12); }
.empty-operations { color: var(--ink-3); }
</style>
