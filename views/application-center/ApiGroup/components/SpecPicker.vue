<template>
  <a-modal :open="open" :title="$t('ApiGroupManagement.selectSpecs')" :width="1200" :destroy-on-close="true"
    :ok-button-props="{ disabled: !validSelection }" @cancel="emit('close')" @ok="emit('confirm', selection())">
    <p>{{ $t('ApiGroupManagement.spec.selectionHint') }}</p>
    <a-alert v-if="error" type="error" show-icon :message="error" class="picker-alert" />
    <a-alert v-if="unavailable.length" type="warning" show-icon :message="$t('ApiGroupManagement.spec.unavailableHint')" class="picker-alert" />
    <a-alert v-if="catalogEmpty && !error" type="warning" show-icon :message="$t('ApiGroupManagement.spec.catalogEmpty')"
      :description="$t('ApiGroupManagement.spec.catalogEmptyHint')" class="picker-alert" />
    <ConditionFilter :columns="columns" target="api-group-spec-picker" @change="handleSearch" />
    <j-pro-table v-if="open" mode="TABLE" :columns="columns" :request="requestPage" :params="params"
      :rowSelection="rowSelection" :scroll="{ x: 1300 }">
      <template #actions="row">{{ row.actions?.join(', ') || '-' }}</template>
      <template #grantable="row"><a-tag :color="validSpecPermission(row) ? 'success' : 'warning'">
        {{ $t(validSpecPermission(row) ? 'ApiGroupManagement.spec.valid' : 'ApiGroupManagement.spec.noPermissionMapping') }}
      </a-tag></template>
    </j-pro-table>
    <div class="selected-specs">
      <strong>{{ $t('ApiGroupManagement.spec.selectedCount', { count: selectedIds.length }) }}</strong>
      <a-space wrap>
        <a-tag v-for="id in selectedIds" :key="id" closable :color="validSpecPermission(known[id]) ? undefined : 'warning'" @close="remove(id)">
          <a-tooltip :title="id">{{ known[id] ? known[id].method + ' ' + known[id].path : id }}</a-tooltip>
        </a-tag>
      </a-space>
    </div>
  </a-modal>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { RawOpenApiSpec } from '@authentication-manager-ui/api/application-center/apiGroupManagement'
import { useSpecPicker } from '../useSpecPicker'
import type { SpecSelection } from '../useSpecPicker'
import { validSpecPermission } from '../groupUtils'
const props = defineProps<{ open: boolean; selectedIds: string[]; knownSpecs: RawOpenApiSpec[] }>()
const emit = defineEmits<{ (event: 'close'): void; (event: 'confirm', value: SpecSelection): void }>()
const { t: $t } = useI18n()
const { columns, params, error, catalogEmpty, selectedIds, known, unavailable, validSelection, rowSelection,
  requestPage, handleSearch, remove, selection } = useSpecPicker(() => props)
</script>
<style scoped>
.picker-alert { margin-bottom: 12px; }.selected-specs { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
</style>
