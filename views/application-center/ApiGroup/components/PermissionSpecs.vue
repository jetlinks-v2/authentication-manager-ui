<template>
  <div class="permission-specs">
    <div class="permission-toolbar" :class="{ 'permission-toolbar--readonly': readonly }">
      <ConditionFilter :fields="filterFields" :placeholder="$t('ApiGroupManagement.spec.searchResource')" class="resource-search" @update:model-value="search" />
      <slot name="actions" />
    </div>
    <p v-if="!readonly" class="permission-hint">{{ $t('ApiGroupManagement.spec.permissionHint') }}</p>
    <a-table :columns="columns" :data-source="rows" row-key="key" table-layout="fixed"
      :pagination="pagination" :scroll="{ y: height }">
      <template #headerCell="{ column }">
        <a-checkbox v-if="!readonly && column.key === 'resource'"
          :checked="pageSelection.checked" :indeterminate="pageSelection.indeterminate" :disabled="disabled || !pageIds.length"
          @change="emit('select', pageIds, $event.target.checked)">
          {{ column.title }}<span class="page-selection-label">{{ $t('ApiGroupManagement.spec.selectPage') }}</span>
        </a-checkbox>
        <template v-else>{{ column.title }}</template>
      </template>
      <template #bodyCell="{ column, record }">
        <div v-if="column.key === 'resource'" class="resource-identity" :class="{ 'resource-identity--readonly': readonly }">
          <span v-if="readonly" class="resource-name" :title="record.name">{{ record.name }}</span>
          <a-checkbox v-else :checked="record.checked" :indeterminate="record.indeterminate" :disabled="disabled"
            @change="emit('select', record.ids, $event.target.checked)">{{ record.name }}</a-checkbox>
          <span class="resource-meta" :title="record.resourceMeta">{{ record.resourceMeta }}</span>
        </div>
        <div v-else-if="column.key === 'actions'" class="permission-actions">
          <a-tooltip v-for="action in record.actions" :key="action.key"
            :title="$t(readonly ? 'ApiGroupManagement.spec.linkedActionInterfaces' : 'ApiGroupManagement.spec.actionInterfaces', { actions: action.label, count: action.ids.length })">
            <a-tag v-if="readonly" class="permission-action-tag">
              {{ action.label }} <span class="action-count">{{ action.ids.length }}</span>
            </a-tag>
            <a-checkbox v-else :checked="action.checked" :indeterminate="action.indeterminate" :disabled="disabled"
              @change="emit('select', action.ids, $event.target.checked)">
              {{ action.label }} <span class="action-count">{{ action.ids.length }}</span>
            </a-checkbox>
          </a-tooltip>
        </div>
      </template>
    </a-table>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { SpecPermissionResource } from '../specPermissionResources'
import { usePermissionSpecs } from '../usePermissionSpecs'
const props = withDefaults(defineProps<{
  resources: SpecPermissionResource[]
  selectedIds?: string[]
  disabled?: boolean
  readonly?: boolean
  height: number | string
}>(), { selectedIds: () => [], disabled: false, readonly: false })
const emit = defineEmits<{ (event: 'select', ids: string[], checked: boolean): void }>()
const { t: $t } = useI18n()
const { filterFields, search, columns, rows, pagination, pageIds, pageSelection } = usePermissionSpecs(props)
</script>
<style scoped>
.permission-specs { min-width: 0; }
.permission-toolbar { display: flex; align-items: center; gap: var(--space-3); }
.permission-toolbar--readonly { margin-bottom: var(--space-4); }
.resource-search { flex: 1; min-width: 0; }
.permission-toolbar > :deep(.ant-btn) { flex: none; }
.permission-hint { margin: var(--space-3) 0 var(--space-4); color: var(--ink-4); font-size: var(--fs-12); line-height: 1.6; }
.page-selection-label { margin-inline-start: var(--space-2); color: var(--ink-4); font-size: var(--fs-12); font-weight: 400; }
.resource-identity { min-width: 0; overflow-wrap: anywhere; }
.resource-name { display: block; overflow: hidden; color: var(--ink-1); font-size: var(--fs-14); font-weight: 500; line-height: var(--lh-normal); text-overflow: ellipsis; white-space: nowrap; }
.resource-meta { display: block; overflow: hidden; margin: var(--space-1) 0 0 var(--space-6); color: var(--ink-4); font-size: var(--fs-12); line-height: var(--space-5); text-overflow: ellipsis; white-space: nowrap; }
.resource-identity--readonly .resource-meta { margin-left: 0; }
.permission-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.permission-actions :deep(.ant-checkbox-wrapper) { margin-inline-start: 0; }
.permission-action-tag { margin: 0; padding-inline: var(--space-2); font-size: var(--fs-12); line-height: calc(var(--space-5) - 2px); }
.action-count { margin-left: var(--space-1); color: var(--ink-4); font-size: var(--fs-12); }
</style>
