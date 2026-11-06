<template>
  <div class="grant-panel" :class="{ 'grant-panel--direct': !isTemplateGrant, 'grant-panel--template': isTemplateGrant }">
    <div class="grant-head">
      <div v-if="isTemplateGrant" class="template-grant__title">
        <h2>{{ $t('ApplicationTemplate.detail.grants') }}</h2>
        <a-tooltip :title="$t('ThirdPartyApplication.direct.grantHint')">
          <AIcon type="InfoCircleOutlined" class="template-grant__info" :aria-label="$t('ThirdPartyApplication.direct.grantHint')" tabindex="0" />
        </a-tooltip>
      </div>
      <p v-else>{{ $t('ThirdPartyApplication.direct.tableHint') }}</p>
      <PageActions v-if="isTemplateGrant" class="template-grant__actions">
        <a-button v-if="canManageGroups" :disabled="saving" @click="openGroupManager">
          <template #icon><AIcon type="AppstoreOutlined" /></template>
          {{ $t('ThirdPartyApplication.direct.manageGroups') }}
        </a-button>
        <template v-if="editing">
          <a-popconfirm :title="$t('ThirdPartyApplication.project.discardConfirm')" :disabled="loading || saving" @confirm="load">
            <a-button :disabled="loading || saving">
              <template #icon><AIcon type="ReloadOutlined" /></template>
              {{ $t('ThirdPartyApplication.project.refresh') }}
            </a-button>
          </a-popconfirm>
          <a-popconfirm :title="$t('ThirdPartyApplication.direct.revokeAllConfirm')" :disabled="!loaded || loading || saving || !original.length" @confirm="save(true)">
            <a-button :disabled="!loaded || loading || saving || !original.length">
              <template #icon><AIcon type="StopOutlined" /></template>
              {{ $t('ApplicationTemplate.grants.revokeAll') }}
            </a-button>
          </a-popconfirm>
          <a-popconfirm :title="$t('ThirdPartyApplication.direct.replaceGrantsConfirm')" :disabled="!loaded || loading || saving || !changed.length" @confirm="save(false)">
            <a-button type="primary" :loading="saving" :disabled="!loaded || loading || !changed.length">
              <template #icon><AIcon type="SaveOutlined" /></template>
              {{ $t('ApiApplication.actions.save') }}
            </a-button>
          </a-popconfirm>
        </template>
        <a-button v-else type="primary" :disabled="!loaded || loading || saving" @click="edit">
          <template #icon><AIcon type="EditOutlined" /></template>
          {{ $t('ApplicationTemplate.grants.edit') }}
        </a-button>
      </PageActions>
    </div>
    <a-alert v-if="error" type="error" show-icon :message="error" class="grant-alert">
      <template v-if="isTemplateGrant && !loaded" #action>
        <a-button size="small" :disabled="loading || saving" @click="load">{{ $t('ApplicationTemplate.parameters.retry') }}</a-button>
      </template>
    </a-alert>
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
      <div v-else class="template-grant__scroll">
        <CloudEmpty v-if="loaded && !groups.length" :description="$t('ThirdPartyApplication.direct.noGroups')">
          <a-button v-if="canManageGroups" @click="openGroupManager">{{ $t('ThirdPartyApplication.direct.manageGroups') }}</a-button>
        </CloudEmpty>
        <section v-for="group in templateRows" :key="group.id" class="template-grant__group" :aria-label="group.name || group.id">
          <header class="template-grant__group-head">
            <a-checkbox v-if="editing" :checked="group.checked" :indeterminate="group.indeterminate"
              :disabled="!loaded || loading || saving || group.selectionDisabled"
              :aria-label="$t('ApplicationTemplate.grants.selectGroup', { name: group.name || group.id })"
              @change="toggleGroup(group, $event.target.checked)" />
            <AIcon type="FolderOutlined" class="template-grant__folder" />
            <h3>{{ group.name || group.id }}</h3>
            <a-tooltip v-if="group.assetHint" :title="$t(group.assetHint.message)">
              <AIcon type="InfoCircleOutlined" class="template-grant__info" :aria-label="$t(group.assetHint.message)" tabindex="0" />
            </a-tooltip>
            <div class="template-grant__group-meta">
              <code>{{ group.id }}</code>
              <span class="template-grant__count" :class="{ 'template-grant__count--active': editing || group.selectedCount }">
                {{ $t(editing ? 'ApplicationTemplate.grants.selectedCount' : group.selectedCount ? 'ApplicationTemplate.grants.authorizedCount' : 'ApplicationTemplate.grants.unauthorized', { selected: group.selectedCount, total: group.totalCount }) }}
              </span>
            </div>
          </header>
          <a-checkbox-group v-if="editing" :value="selected[group.id] || []" :disabled="loading || saving"
            class="template-grant__operations" :aria-label="group.name || group.id" @change="values => update(group.id, values as string[])">
            <a-checkbox v-for="operation in group.visibleOperations" :key="operation.id" :value="operation.id" :disabled="operation.disabled"
              class="template-grant__operation template-grant__operation--choice">
              <span class="template-grant__operation-content">
                <span class="template-grant__operation-name">{{ operation.name || operation.id }}</span>
                <span v-if="operation.description" class="template-grant__description">{{ operation.description }}</span>
              </span>
              <code>{{ operation.id }}</code>
            </a-checkbox>
          </a-checkbox-group>
          <template v-else>
            <div v-for="operation in group.visibleOperations" :key="operation.id" class="template-grant__operation">
              <AIcon type="CheckCircleOutlined" class="template-grant__authorized" />
              <span class="template-grant__operation-content">
                <span class="template-grant__operation-name">{{ operation.name || operation.id }}</span>
                <span v-if="operation.description" class="template-grant__description">{{ operation.description }}</span>
              </span>
              <code>{{ operation.id }}</code>
            </div>
          </template>
          <p v-if="editing && !group.operationOptions.length" class="template-grant__hint">{{ $t('ThirdPartyApplication.direct.groupWithoutOperations') }}</p>
          <a-typography-text v-if="group.hasVisibleUnavailableOperations" type="warning" class="template-grant__hint">
            {{ $t('ThirdPartyApplication.direct.unavailableOperations') }}
          </a-typography-text>
        </section>
      </div>
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
  editing, edit, templateRows,
  update, canManageGroups, openGroupManager, save, load } = useDirectGrants(() => props.targetId, props.targetType)
</script>
<style scoped>
.grant-head { display: flex; gap: var(--space-4); justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-4); flex-wrap: wrap; }
.grant-head p { color: var(--ink-4); flex: 1; min-width: 220px; }
.grant-alert { margin: var(--space-3) 0; }
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
.grant-panel--template { min-width: 0; border: 1px solid var(--line); border-radius: var(--r-3); background: var(--bg); overflow: clip; }
.grant-panel--template .grant-head { position: sticky; top: 0; z-index: 1; align-items: center; min-height: 3.5rem; margin: 0; padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--line); background: var(--bg); }
.template-grant__title { display: flex; align-items: center; gap: var(--space-2); }
.template-grant__title h2 { margin: 0; color: var(--ink-1); font-size: var(--fs-14); font-weight: 600; }
.template-grant__info { color: var(--ink-3); font-size: var(--fs-12); }
.template-grant__actions { justify-content: flex-end; margin-inline-start: auto; }
.grant-panel--template > .grant-alert { margin: var(--space-3) var(--space-4); }
.template-grant__scroll { min-height: 22rem; max-height: clamp(22rem, calc(100vh - 25rem), 42rem); overflow-y: auto; overscroll-behavior: contain; }
.template-grant__group { min-width: 0; }
.template-grant__group-head { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2); min-height: 2.75rem; padding: var(--space-2) var(--space-4); border-bottom: 1px solid var(--line); background: var(--jet-theme-bg-layout); }
.template-grant__folder { flex: none; color: var(--warning); }
.template-grant__group-head h3 { min-width: 0; margin: 0; color: var(--ink-1); font-size: var(--fs-14); font-weight: 400; overflow-wrap: anywhere; }
.template-grant__group-meta { display: flex; align-items: center; gap: var(--space-3); min-width: 0; max-width: 100%; margin-inline-start: auto; }
.grant-panel--template code { min-width: 0; max-width: 100%; padding: 0 var(--space-1); border-radius: var(--r-1); background: var(--jet-theme-bg-layout); color: var(--ink-3); font-size: var(--fs-12); overflow-wrap: anywhere; }
.template-grant__count { flex: none; color: var(--ink-3); font-size: var(--fs-12); white-space: nowrap; }
.template-grant__count--active { color: var(--primary-color); }
.template-grant__operations { display: flex; flex-direction: column; width: 100%; }
.template-grant__operation { display: flex; align-items: flex-start; gap: var(--space-3); width: 100%; min-width: 0; margin: 0; padding: var(--space-2) var(--space-4) var(--space-2) var(--space-6); border-bottom: 1px solid var(--line); }
.template-grant__operation-content { display: flex; flex: 1; flex-direction: column; min-width: 0; overflow-wrap: anywhere; }
.template-grant__operation-name { white-space: pre-wrap; }
.template-grant__description { color: var(--ink-3); font-size: var(--fs-12); white-space: pre-wrap; }
.template-grant__operation code { flex: 0 1 auto; max-width: 40%; margin-inline-start: auto; text-align: end; }
.template-grant__authorized { flex: none; margin-block-start: 0.2em; color: var(--success); }
.template-grant__operation--choice { gap: 0; }
.template-grant__operation--choice :deep(.ant-checkbox) { flex: none; align-self: flex-start; margin-block-start: 0.2em; }
.template-grant__operation--choice :deep(> span:last-child) { display: flex; flex: 1; align-items: flex-start; gap: var(--space-3); min-width: 0; }
.template-grant__hint { display: block; margin: 0; padding: var(--space-2) var(--space-4) var(--space-2) var(--space-6); color: var(--ink-3); font-size: var(--fs-12); }
@media (max-width: 960px) {
  .template-grant__actions { max-width: 100%; }
  .template-grant__group-meta { flex-wrap: wrap; justify-content: flex-end; }
}
</style>
