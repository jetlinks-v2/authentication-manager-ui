<template>
  <ContentPanel class="api-picker" fill>
    <div class="picker-heading">
      <div class="picker-identity">
        <h2>{{ currentApi ? currentApi.summary || currentApi.path : $t('ThirdPartyApplication.debug.chooseApi') }}</h2>
        <SpecIdentity v-if="currentApi" :spec="currentApi" part="endpoint" class="api-endpoint" />
      </div>
      <a-button v-if="currentApi" ref="toggleRef" :disabled="disabled" :aria-expanded="expanded" @click="toggle">
        <template #icon><AIcon :type="expanded ? 'UpOutlined' : 'SwapOutlined'" /></template>
        {{ $t(expanded ? 'ThirdPartyApplication.debug.collapsePicker' : 'ThirdPartyApplication.debug.switchApi') }}
      </a-button>
    </div>
    <a-alert v-if="error" type="error" show-icon :message="error">
      <template #action><a-button size="small" :disabled="disabled" @click="$emit('retry')">{{ $t('ThirdPartyApplication.debug.retry') }}</a-button></template>
    </a-alert>
    <section v-show="expanded && !error" class="picker-options" :aria-label="$t('ThirdPartyApplication.debug.chooseApi')">
      <ConditionFilter :fields="filterFields" :model-value="terms" :disabled="disabled" @update:model-value="search" />
      <a-table :columns="columns" :data-source="rows" row-key="id" size="small" :loading="loading" :pagination="pagination"
        :row-class-name="rowClassName" :scroll="{ y: 'min(24rem, 42vh)' }" table-layout="fixed" class="picker-table" @change="changePage">
        <template #bodyCell="{ column, record }">
          <a-button v-if="column.key === 'name'" type="link" class="api-name" :disabled="disabled"
            :aria-current="record.id === modelValue ? 'true' : undefined" @click="select(record.id)">
            <template v-if="record.id === modelValue" #icon><AIcon type="CheckOutlined" /></template>
            <span>{{ record.api.summary || record.api.path }}</span>
          </a-button>
          <SpecIdentity v-else-if="column.key === 'endpoint'" :spec="record.api" part="endpoint" class="api-endpoint" />
          <div v-else class="controller-name">
            <span>{{ record.controller.name }}</span>
            <small v-if="record.controller.appId">{{ record.controller.appId }}</small>
          </div>
        </template>
        <template #emptyText>
          <div v-if="!loading" class="picker-empty">
            <span>{{ $t(apis.length ? 'ApiGroupManagement.spec.noMatches' : 'ThirdPartyApplication.debug.noApis') }}</span>
            <slot v-if="!apis.length" name="empty" />
          </div>
        </template>
      </a-table>
    </section>
  </ContentPanel>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SpecIdentity from '../../ApiGroup/components/SpecIdentity.vue'
import type { DebugApi } from './accessDebugUtils'
import { useDebugApiPicker } from './useDebugApiPicker'

const props = defineProps<{ apis: DebugApi[]; modelValue?: string; disabled?: boolean; loading?: boolean; error?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string]; retry: [] }>()
const { t: $t } = useI18n()
const { terms, filterFields, currentApi, expanded, toggleRef, rows, columns,
  pagination, rowClassName, changePage, search, toggle, select } = useDebugApiPicker(props, id => emit('update:modelValue', id))
</script>

<style scoped>
.api-picker.content-panel { min-width: 0; gap: var(--space-4); }
.picker-heading { display: flex; align-items: start; flex-wrap: wrap; justify-content: space-between; gap: var(--space-3); min-width: 0; }
.picker-identity { flex: 1 1 24rem; min-width: 0; }
.picker-heading h2 { margin: 0; color: var(--ink-1); font-size: var(--fs-16); font-weight: 600; overflow-wrap: anywhere; }
.picker-heading h2 + .api-endpoint { margin-top: var(--space-2); }
.picker-heading > .ant-btn { flex: none; }
.picker-options { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-3); min-width: 0; padding-top: var(--space-4); border-top: 1px solid var(--line); }
.picker-table { min-width: 0; }
.picker-table :deep(.ant-table-cell) { vertical-align: top; overflow-wrap: anywhere; }
.api-name { display: inline-flex; align-items: start; gap: var(--space-1); max-width: 100%; height: auto; padding: 0; white-space: normal; text-align: start; }
.api-name > span { min-width: 0; overflow-wrap: anywhere; }
.api-name :deep(.anticon) { flex: none; margin-top: var(--space-1); }
.api-endpoint :deep(.spec-endpoint) { align-items: start; flex-wrap: wrap; }
.api-endpoint :deep(code) { flex: 1 1 12rem; max-width: 100%; overflow: visible; text-overflow: clip; white-space: normal; overflow-wrap: anywhere; }
.controller-name { display: grid; gap: var(--space-1); color: var(--ink-2); overflow-wrap: anywhere; }
.controller-name small { color: var(--ink-4); font-size: var(--fs-12); }
.picker-empty { display: grid; justify-items: center; gap: var(--space-2); padding-block: var(--space-3); color: var(--ink-4); }
</style>
