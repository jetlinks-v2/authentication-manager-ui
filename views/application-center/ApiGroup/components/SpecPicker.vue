<template>
  <JlDrawerShell :open="open" :width="1280" :title="context.title" icon="ApiOutlined"
    :sub="$t('ApiGroupManagement.spec.selectionHint')" class="spec-picker" @update:open="close">
    <template v-if="open">
      <slot name="configuration" />
      <a-alert v-if="context.error" type="error" show-icon :message="context.error" class="picker-error" />
      <a-alert v-if="unavailable.length" type="warning" show-icon :message="$t('ApiGroupManagement.spec.unavailableHint')" class="picker-error" />
      <SlantedTabs class="spec-tabs" :active-key="mode" :options="tabOptions" @change="mode = String($event)">
        <template #default="{ option }">
          <div v-if="option.key === 'permissions'" class="picker-tab-content">
            <a-alert v-if="catalogError" type="error" show-icon :message="catalogError" class="picker-error">
              <template #action><a-button size="small" :loading="catalogLoading" @click="loadCatalog">{{ $t('ApiGroupManagement.retry') }}</a-button></template>
            </a-alert>
            <a-spin :spinning="catalogLoading">
              <a-alert v-if="catalogReady && !resources.length" type="info" show-icon :message="$t('ApiGroupManagement.spec.noPermissionResources')"
                :description="$t('ApiGroupManagement.spec.noPermissionResourcesHint')" />
              <PermissionSpecs v-else :resources="resources" :selected-ids="selectedIds"
                :disabled="context.saving || !catalogReady" :height="tableHeight" @select="toggleIds" />
            </a-spin>
          </div>
          <div v-else-if="option.key === 'details'" class="picker-tab-content">
            <div class="catalog-toolbar"><ConditionFilter :columns="filterColumns" @change="handleSearch" /></div>
            <a-alert v-if="error" type="error" show-icon :message="error" class="picker-error" />
            <j-pro-table class="pro-table__no-padding catalog-table" mode="TABLE" :columns="columns" :request="requestPage" :params="params"
              :alert-show="false" :rowSelection="rowSelection" :scroll="{ x: 960, y: tableHeight }">
              <template #identity="row">
                <div class="catalog-identity">
                  <SpecIdentity :spec="row" part="name" />
                  <a-tooltip v-if="!validSpecPermission(row)" :title="$t('ApiGroupManagement.spec.noPermissionMapping')">
                    <AIcon type="InfoCircleOutlined" class="unavailable-icon" />
                  </a-tooltip>
                </div>
              </template>
              <template #endpoint="row"><SpecIdentity :spec="row" part="endpoint" /></template>
              <template #appId="row"><span class="source-service" :title="row.appId">{{ row.appId || '—' }}</span></template>
              <template #details="row"><SpecDetails :spec="row" /></template>
            </j-pro-table>
          </div>
          <div v-else class="picker-tab-content">
            <div class="catalog-toolbar">
              <ConditionFilter :fields="selectedFilterFields" :placeholder="$t('ApiGroupManagement.spec.searchSelected')" @update:model-value="searchSelected" />
            </div>
            <a-table :columns="selectedColumns" :data-source="selectedRecords" row-key="id" :pagination="selectedPagination"
              table-layout="fixed" :scroll="{ x: 960, y: tableHeight }">
              <template #emptyText>
                <CloudEmpty :description="$t(selectedIds.length ? 'ApiGroupManagement.spec.noMatches' : 'ApiGroupManagement.spec.selectHint')" />
              </template>
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'identity'"><SpecIdentity :spec="record.spec" :id="record.id" part="name" /></template>
                <template v-else-if="column.key === 'endpoint'"><SpecIdentity :spec="record.spec" :id="record.id" part="endpoint" /></template>
                <template v-else-if="column.key === 'appId'"><span class="source-service" :title="record.spec?.appId">{{ record.spec?.appId || '—' }}</span></template>
                <template v-else-if="column.key === 'details'"><SpecDetails v-if="record.spec" :spec="record.spec" /></template>
                <template v-else-if="column.key === 'remove'">
                  <a-tooltip :title="$t('ApiGroupManagement.spec.remove')">
                    <a-button type="text" size="small" :disabled="context.saving"
                      :aria-label="$t('ApiGroupManagement.spec.removeNamed', { name: record.spec?.summary || record.spec?.path || record.id })" @click="remove(record.id)">
                      <template #icon><AIcon type="CloseOutlined" /></template>
                    </a-button>
                  </a-tooltip>
                </template>
              </template>
            </a-table>
          </div>
        </template>
      </SlantedTabs>
    </template>
    <template #foot>
      <a-button class="clear-selection" type="link" :disabled="context.saving || !selectedIds.length"
        @click="toggleIds(selectedIds, false)">{{ $t('ApiGroupManagement.spec.clearSelection') }}</a-button>
      <a-button :disabled="context.saving" @click="emit('close')">{{ $t('ApiGroupManagement.cancel') }}</a-button>
      <a-popconfirm :disabled="!context.confirmImpact || !canConfirm" :title="$t('ApiGroupManagement.spec.saveImpactConfirm')" @confirm="emit('confirm', selection())">
        <a-button type="primary" :loading="context.saving" :disabled="!canConfirm" @click="confirmCreate">{{ context.confirmText }}</a-button>
      </a-popconfirm>
    </template>
  </JlDrawerShell>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SlantedTabs, { type SlantedTabOption } from '@jetlinks-web-core/components/SlantedTabs'
import type { RawOpenApiSpec } from '@authentication-manager-ui/api/application-center/apiGroupManagement'
import { useSpecPicker, type SpecPickerContext, type SpecSelection } from '../useSpecPicker'
import { validSpecPermission } from '../groupUtils'
import SpecIdentity from './SpecIdentity.vue'
import SpecDetails from './SpecDetails.vue'
import PermissionSpecs from './PermissionSpecs.vue'
const props = defineProps<{ open: boolean; selectedIds: string[]; knownSpecs: RawOpenApiSpec[]; context: SpecPickerContext }>()
const emit = defineEmits<{ (event: 'close'): void; (event: 'confirm', value: SpecSelection): void }>()
const { t: $t } = useI18n()
const { columns, filterColumns, params, error, selectedIds, selectedFilterFields, selectedColumns, selectedRecords, selectedPagination, searchSelected,
  mode, resources, catalogLoading, catalogReady, catalogError, loadCatalog, toggleIds,
  unavailable, validSelection, changed, rowSelection, requestPage, handleSearch, remove, selection } = useSpecPicker(() => ({ ...props, disabled: props.context.saving }))
const tabOptions = computed<SlantedTabOption[]>(() => [
  { key: 'permissions', label: $t('ApiGroupManagement.spec.permissionMode') },
  { key: 'details', label: $t('ApiGroupManagement.spec.detailMode') },
  { key: 'selected', label: $t('ApiGroupManagement.spec.selected'), count: selectedIds.value.length },
])
const tableHeight = computed(() => props.context.creating ? 'max(16rem, calc(100vh - 490px))' : 'max(16rem, calc(100vh - 330px))')
const canConfirm = computed(() => validSelection.value && !catalogLoading.value && !props.context.disabled && !props.context.saving && (props.context.creating ? selectedIds.value.length > 0 : changed.value))
const close = (open: boolean) => { if (!open && !props.context.saving) emit('close') }
const confirmCreate = () => { if (!props.context.confirmImpact && canConfirm.value) emit('confirm', selection()) }
</script>
<style scoped>
.spec-tabs {
  --slanted-tabs-active-bg: var(--accent-soft);
  --slanted-tabs-inactive-bg: transparent;
  --slanted-tabs-panel-bg: var(--bg);
}
.picker-tab-content { padding-top: var(--space-4); }
.catalog-toolbar { margin-bottom: var(--space-4); }
.picker-error { margin-bottom: var(--space-4); }
.clear-selection { margin-right: auto; padding-inline: 0; }
.catalog-identity { display: flex; min-width: 0; align-items: center; gap: var(--space-2); }
.catalog-identity > :first-child { flex: 1; min-width: 0; }
.unavailable-icon { flex: none; color: var(--ink-4); }
.catalog-table :deep(.ant-table table) { table-layout: fixed; }
.source-service { display: block; line-height: var(--lh-normal); white-space: normal; overflow-wrap: anywhere; }
</style>
