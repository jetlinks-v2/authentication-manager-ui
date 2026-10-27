<template>
  <DefineAdd>
    <j-permission-button v-if="!context.readonly" :hasPermission="context.permission" type="primary"
      :disabled="context.busy || !context.canSelectSpecs" :tooltip="{ title: !context.canSelectSpecs ? $t('ApiGroupManagement.noSpecQueryPermission') : undefined }" @click="emit('add')">
      <AIcon type="PlusOutlined" />{{ $t('ApiGroupManagement.operation.add') }}
    </j-permission-button>
  </DefineAdd>
  <div class="grants-workspace">
    <div class="workspace-head">
      <div><h2>{{ $t('ApiGroupManagement.operation.sectionTitle') }}</h2><p>{{ $t('ApiGroupManagement.operation.hint') }}</p></div>
      <AddButton />
    </div>
    <CloudEmpty v-if="!operations.length" :description="$t('ApiGroupManagement.operation.empty')">
      <AddButton />
    </CloudEmpty>
    <div v-else class="workspace-body">
      <aside class="grant-sidebar" :aria-label="$t('ApiGroupManagement.operation.sectionTitle')">
        <ConditionFilter :fields="filterFields" :placeholder="$t('ApiGroupManagement.operation.search')" @update:model-value="search" />
        <div class="grant-options">
          <a-button v-for="item in filtered" :key="item.id" type="text" block class="grant-option"
            :class="{ 'is-active': item.id === context.activeId }" :aria-pressed="item.id === context.activeId"
            :disabled="context.busy" @click="emit('activate', item.id)">
            <span class="grant-option-top"><span class="grant-option-name">{{ item.name || item.id }}</span><a-tag>{{ item.apiSpecIds.length }}</a-tag></span>
            <span class="grant-option-code">{{ item.id }}</span>
          </a-button>
          <CloudEmpty v-if="!filtered.length" :description="$t('ApiGroupManagement.operation.noMatches')" />
        </div>
      </aside>
      <section v-if="activeItem" :key="activeItem.id" class="grant-content">
        <div class="grant-head">
          <div class="grant-identity">
            <h3>
              <span v-if="context.readonly">{{ activeItem.name || activeItem.id }}</span>
              <Editable v-else class="grant-name" :value="activeItem.name || ''"
                :component-props="{ disabled: context.busy, placeholder: $t('ApiGroupManagement.operation.namePlaceholder'), 'aria-label': $t('ApiGroupManagement.operation.name') }"
                @change="emit('update', activeItem.id, 'name', $event)">
                <template #default="{ value }">{{ value || activeItem.id }}</template>
              </Editable>
            </h3>
            <a-tooltip :title="$t('ApiGroupManagement.operation.idLocked')">
              <span class="grant-code">{{ $t('ApiGroupManagement.operation.id') }}：<a-typography-text copyable :content="activeItem.id">{{ activeItem.id }}</a-typography-text></span>
            </a-tooltip>
          </div>
          <j-permission-button v-if="!context.readonly" :hasPermission="context.permission" type="link" danger :disabled="context.busy"
            :popConfirm="{ title: $t('ApiGroupManagement.operation.removeConfirm'), onConfirm: () => emit('remove', activeItem.id) }">
            <AIcon type="DeleteOutlined" />{{ $t('ApiGroupManagement.operation.remove') }}
          </j-permission-button>
        </div>
        <p v-if="context.readonly && activeItem.description" class="grant-description">{{ activeItem.description }}</p>
        <Editable v-else-if="!context.readonly" class="grant-description" :value="activeItem.description || ''"
          :component-props="{ disabled: context.busy, placeholder: $t('ApiGroupManagement.operation.descriptionPlaceholder'), 'aria-label': $t('ApiGroupManagement.operation.description') }"
          @change="emit('update', activeItem.id, 'description', $event)">
          <template #default="{ value }"><span :class="{ 'empty-description': !value }">{{ value || $t('ApiGroupManagement.addDescription') }}</span></template>
        </Editable>
        <LinkedSpecs :ids="activeItem.apiSpecIds" :specs="specs" :height="420">
          <template #actions>
            <j-permission-button v-if="!context.readonly" :hasPermission="groupMenu + ':selectApi'" type="primary"
              :disabled="context.busy || !context.canSelectSpecs" :tooltip="{ title: !context.canSelectSpecs ? $t('ApiGroupManagement.noSpecQueryPermission') : undefined }" @click="emit('select', activeItem.id)">
              <AIcon type="EditOutlined" />{{ $t('ApiGroupManagement.spec.manage') }}
            </j-permission-button>
          </template>
        </LinkedSpecs>
      </section>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { createReusableTemplate } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import type { ManagedApiOperation, RawOpenApiSpec } from '@authentication-manager-ui/api/application-center/apiGroupManagement'
import type { GroupTextField, OperationEditorContext } from '../useApiGroupEditor'
import { groupMenu } from '../useGroupPermissions'
import LinkedSpecs from './LinkedSpecs.vue'
import { useLocalTextFilter } from '../useLocalTextFilter'
const props = defineProps<{ operations: ManagedApiOperation[]; specs: Record<string, RawOpenApiSpec>; context: OperationEditorContext }>()
const emit = defineEmits<{
  (event: 'add'): void
  (event: 'activate' | 'remove' | 'select', id: string): void
  (event: 'update', id: string, field: GroupTextField, value: string): void
}>()
const { t: $t } = useI18n()
const { filterFields, filtered, search } = useLocalTextFilter(() => props.operations, () => [
  { title: $t('ApiGroupManagement.operation.name'), dataIndex: 'name' },
  { title: $t('ApiGroupManagement.operation.id'), dataIndex: 'id' },
  { title: $t('ApiGroupManagement.operation.description'), dataIndex: 'description' },
], (item, column) => item[column as keyof ManagedApiOperation])
const activeItem = computed(() => props.operations.find(item => item.id === props.context.activeId))
const [DefineAdd, AddButton] = createReusableTemplate()
</script>
<style scoped>
.grants-workspace { min-width: 0; }
.workspace-head, .grant-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
.workspace-head { padding-bottom: var(--space-4); border-bottom: 1px solid var(--line); }
.workspace-head h2 { margin: 0; color: var(--ink-1); font-size: var(--fs-16); font-weight: 600; }
.workspace-head p { margin: var(--space-1) 0 0; color: var(--ink-4); font-size: var(--fs-12); }
.workspace-body { display: grid; grid-template-columns: minmax(12rem, 16rem) minmax(0, 1fr); min-height: 28rem; }
.grant-sidebar { min-width: 0; padding: var(--space-4) var(--space-4) var(--space-4) 0; border-right: 1px solid var(--line); }
.grant-options { display: flex; flex-direction: column; gap: var(--space-2); max-height: 38rem; margin-top: var(--space-3); overflow-y: auto; }
.grant-option { display: flex; height: auto; flex-direction: column; align-items: stretch; gap: var(--space-1); padding: var(--space-3); border: 0; border-radius: var(--r-2); text-align: left; }
.grant-option:not(:disabled):hover { color: var(--ink-1); background: var(--bg-hover); }
.grant-option.is-active:not(:disabled), .grant-option.is-active:not(:disabled):hover { color: var(--accent); background: var(--accent-soft); }
.grant-option.is-active .grant-option-name { font-weight: 600; }
.grant-option-top { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); }
.grant-option-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }
.grant-option :deep(.ant-tag) { flex: none; margin: 0; color: var(--ink-3); }
.grant-option-code { overflow: hidden; color: var(--ink-4); font-size: var(--fs-12); text-overflow: ellipsis; }
.grant-content { min-width: 0; padding: var(--space-4) 0 var(--space-4) var(--space-5); }
.grant-identity { min-width: 0; }
.grant-head { align-items: flex-start; }
.grant-head h3 { margin: 0 0 var(--space-1); color: var(--ink-1); font-size: var(--fs-18); font-weight: 600; }
.grant-name, .grant-description { padding: 0; border-radius: var(--r-2); overflow-wrap: anywhere; }
.grant-code { color: var(--ink-4); font-size: var(--fs-12); }
.grant-code :deep(.ant-typography) { color: inherit; }
.grant-description { margin: var(--space-2) 0 var(--space-5); color: var(--ink-2); line-height: 1.6; }
.empty-description { color: var(--ink-4); }
@media (max-width: 60rem) {
  .workspace-body { grid-template-columns: minmax(10rem, 12rem) minmax(0, 1fr); }
  .grant-content { padding-left: var(--space-3); }
}
@media (max-width: 42rem) {
  .workspace-body { grid-template-columns: minmax(0, 1fr); }
  .workspace-head { align-items: flex-start; }
  .grant-sidebar { padding-right: 0; border-right: 0; border-bottom: 1px solid var(--line); }
  .grant-options { flex-direction: row; max-height: none; overflow-x: auto; }
  .grant-option { flex: 0 0 10rem; }
  .grant-content { padding-left: 0; }
  .grant-head { flex-wrap: wrap; }
}
</style>
