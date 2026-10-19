<template>
  <a-modal :open="open" :title="$t('ApiGroupManagement.selectSpecs')" :width="1200" :destroy-on-close="true"
    :body-style="{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }" :style="{ top: '24px' }"
    :ok-button-props="{ disabled: !validSelection }" @cancel="emit('close')" @ok="emit('confirm', selection())">
    <p>{{ $t('ApiGroupManagement.spec.selectionHint') }}</p>
    <a-alert v-if="error" type="error" show-icon :message="error" class="picker-alert" />
    <a-alert v-if="unavailable.length" type="warning" show-icon :message="$t('ApiGroupManagement.spec.unavailableHint')" class="picker-alert" />
    <a-alert v-if="catalogEmpty && !error" type="warning" show-icon :message="$t('ApiGroupManagement.spec.catalogEmpty')" :description="$t('ApiGroupManagement.spec.catalogEmptyHint')" class="picker-alert" />
    <ConditionFilter :columns="columns" target="api-group-spec-picker" @change="handleSearch" />
    <j-pro-table v-if="open" class="pro-table__no-padding" mode="TABLE" :columns="columns" :request="requestPage" :params="params"
      :rowSelection="rowSelection" :scroll="{ x: 1050, y: 320 }">
      <template #method="row"><a-tag>{{ row.method }}</a-tag></template>
      <template #path="row"><a-tooltip :title="row.path">{{ row.path }}</a-tooltip></template>
      <template #summary="row"><a-tooltip :title="row.summary || row.path">{{ row.summary || row.path }}</a-tooltip></template>
      <template #details="row"><SpecDetails :spec="row" /></template>
      <template #grantable="row"><a-tag :color="validSpecPermission(row) ? 'success' : 'warning'">
        {{ $t(validSpecPermission(row) ? 'ApiGroupManagement.spec.valid' : 'ApiGroupManagement.spec.noPermissionMapping') }}
      </a-tag></template>
    </j-pro-table>
    <a-collapse class="selected-specs" :bordered="false">
      <a-collapse-panel key="selected" :header="$t('ApiGroupManagement.spec.selectedCount', { count: selectedIds.length })">
        <LinkedSpecs :ids="selectedIds" :specs="known" removable :height="240" @remove="remove" />
      </a-collapse-panel>
    </a-collapse>
  </a-modal>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { RawOpenApiSpec } from '@authentication-manager-ui/api/application-center/apiGroupManagement'
import { useSpecPicker } from '../useSpecPicker'
import type { SpecSelection } from '../useSpecPicker'
import { validSpecPermission } from '../groupUtils'
import LinkedSpecs from './LinkedSpecs.vue'
import SpecDetails from './SpecDetails.vue'
const props = defineProps<{ open: boolean; selectedIds: string[]; knownSpecs: RawOpenApiSpec[] }>()
const emit = defineEmits<{ (event: 'close'): void; (event: 'confirm', value: SpecSelection): void }>()
const { t: $t } = useI18n()
const { columns, params, error, catalogEmpty, selectedIds, known, unavailable, validSelection, rowSelection,
  requestPage, handleSearch, remove, selection } = useSpecPicker(() => props)
</script>
<style scoped>
.picker-alert { margin-bottom: 12px; }.selected-specs { margin-top: 16px; }
</style>
