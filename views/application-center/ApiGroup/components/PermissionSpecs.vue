<template>
  <div class="permission-specs">
    <div class="permission-toolbar" :class="{ 'permission-toolbar--readonly': readonly }">
      <ConditionFilter :fields="filterFields" :placeholder="$t('ApiGroupManagement.spec.searchResource')" class="resource-search" @update:model-value="search" />
      <slot name="actions" />
    </div>
    <p v-if="!readonly" class="permission-hint">{{ $t('ApiGroupManagement.spec.permissionHint') }}</p>
    <a-table :columns="columns" :data-source="rows" row-key="key" table-layout="fixed"
      :pagination="{ current: page, pageSize: 12, showSizeChanger: false, hideOnSinglePage: true, onChange: value => page = value }"
      :scroll="{ y: height }">
      <template #bodyCell="{ column, record }">
        <div v-if="column.key === 'resource'" class="resource-identity" :class="{ 'resource-identity--readonly': readonly }">
          <span v-if="readonly" class="resource-name" :title="record.name">{{ record.name }}</span>
          <a-checkbox v-else :checked="record.checked" :indeterminate="record.indeterminate" :disabled="disabled"
            @change="emit('select', record.ids, $event.target.checked)">{{ record.name }}</a-checkbox>
          <span class="resource-meta" :title="`${record.appId || '—'} · ${record.permissionId}`">{{ record.appId || '—' }} · {{ record.permissionId }}</span>
        </div>
        <div v-else-if="column.key === 'actions'" class="permission-actions">
          <a-tooltip v-for="action in record.actions" :key="action.key"
            :title="$t(readonly ? 'ApiGroupManagement.spec.linkedActionInterfaces' : 'ApiGroupManagement.spec.actionInterfaces', { actions: action.actions.map(actionLabel).join(' + '), count: action.ids.length })">
            <a-tag v-if="readonly" class="permission-action-tag">
              {{ action.actions.map(actionLabel).join(' + ') }} <span class="action-count">{{ action.ids.length }}</span>
            </a-tag>
            <a-checkbox v-else :checked="action.checked" :indeterminate="action.indeterminate" :disabled="disabled"
              @change="emit('select', action.ids, $event.target.checked)">
              {{ action.actions.map(actionLabel).join(' + ') }} <span class="action-count">{{ action.ids.length }}</span>
            </a-checkbox>
          </a-tooltip>
        </div>
      </template>
    </a-table>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SpecPermissionResource } from '../specPermissionResources'
import { useLocalTextFilter } from '../useLocalTextFilter'
const props = withDefaults(defineProps<{
  resources: SpecPermissionResource[]
  selectedIds?: string[]
  disabled?: boolean
  readonly?: boolean
  height: number | string
}>(), { selectedIds: () => [], disabled: false, readonly: false })
const emit = defineEmits<{ (event: 'select', ids: string[], checked: boolean): void }>()
const { t: $t } = useI18n()
const page = ref(1)
const { filterFields, filtered, search } = useLocalTextFilter(() => props.resources, () => [
  { title: $t('ApiGroupManagement.spec.resource'), dataIndex: 'name' },
  { title: $t('ApiGroupManagement.spec.appId'), dataIndex: 'appId' },
  { title: $t('ApiGroupManagement.spec.permissionId'), dataIndex: 'permissionId' },
], (row, column) => row[column as keyof SpecPermissionResource])
const columns = computed(() => [
  { title: $t('ApiGroupManagement.spec.resource'), key: 'resource', width: '44%' },
  { title: $t('ApiGroupManagement.spec.actions'), key: 'actions' },
])
// 与平台权限配置的标准动作名称一致；自定义动作保留实际编码，不通过 HTTP 方法推测。
const actionNameKeys: Record<string, string> = { query: 'Permission.util.968438-11', save: 'Permission.util.968438-12', delete: 'Permission.util.968438-13' }
const actionLabel = (action: string) => actionNameKeys[action] ? $t(actionNameKeys[action]) : action
const rows = computed(() => {
  const selected = new Set(props.selectedIds)
  const state = (ids: string[]) => {
    const count = ids.filter(id => selected.has(id)).length
    return { checked: count === ids.length, indeterminate: count > 0 && count < ids.length }
  }
  return filtered.value.map(resource => ({ ...resource, ...state(resource.ids),
    actions: resource.actions.map(action => ({ ...action, ...state(action.ids) })),
  }))
})
watch(filtered, () => { page.value = 1 })
</script>
<style scoped>
.permission-specs { min-width: 0; }
.permission-toolbar { display: flex; align-items: center; gap: var(--space-3); }
.permission-toolbar--readonly { margin-bottom: var(--space-4); }
.resource-search { flex: 1; min-width: 0; }
.permission-toolbar > :deep(.ant-btn) { flex: none; }
.permission-hint { margin: var(--space-3) 0 var(--space-4); color: var(--ink-4); font-size: var(--fs-12); line-height: 1.6; }
.resource-identity { min-width: 0; overflow-wrap: anywhere; }
.resource-name { display: block; overflow: hidden; color: var(--ink-1); font-size: var(--fs-14); font-weight: 500; line-height: var(--lh-normal); text-overflow: ellipsis; white-space: nowrap; }
.resource-meta { display: block; overflow: hidden; margin: var(--space-1) 0 0 var(--space-6); color: var(--ink-4); font-size: var(--fs-12); line-height: var(--space-5); text-overflow: ellipsis; white-space: nowrap; }
.resource-identity--readonly .resource-meta { margin-left: 0; }
.permission-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.permission-actions :deep(.ant-checkbox-wrapper) { margin-inline-start: 0; }
.permission-action-tag { margin: 0; padding-inline: var(--space-2); font-size: var(--fs-12); line-height: calc(var(--space-5) - 2px); }
.action-count { margin-left: var(--space-1); color: var(--ink-4); font-size: var(--fs-12); }
</style>
