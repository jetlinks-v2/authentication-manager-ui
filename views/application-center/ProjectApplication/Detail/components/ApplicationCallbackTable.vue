<template>
  <div class="callback-table">
    <a-flex justify="space-between" align="center" wrap="wrap" gap="small" class="table-toolbar">
      <ConditionFilter :key="view.queryKey" :fields="view.fields" @change="$emit('search', $event)" />
      <a-button :loading="loading" @click="$emit('refresh')">{{ $t('ApplicationConnection.refresh') }}</a-button>
    </a-flex>
    <a-alert v-if="error" type="error" show-icon :message="error" />
    <a-table v-else :row-key="view.rowKey" :columns="view.columns" :data-source="view.rows"
      :pagination="view.pagination" :loading="loading" :scroll="{ x: 'max-content' }" size="middle"
      @change="pagination => $emit('page', pagination)">
      <template #bodyCell="cell">
        <slot name="bodyCell" v-bind="cell">{{ callbackCellText(cell.column, cell.text) }}</slot>
      </template>
      <template #emptyText><a-empty :description="$t('ApplicationConnection.noRecords')" /></template>
    </a-table>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { TablePaginationConfig } from 'ant-design-vue'
import ConditionFilter, { type ConditionFilterChangePayload, type ConditionFilterField } from '@jetlinks-web-core/components/ConditionFilter'
import { callbackCellText, type CallbackColumn } from '../applicationCallbackDisplay'
interface CallbackTableView {
  queryKey: string
  rowKey: string
  fields: ConditionFilterField[]
  columns: CallbackColumn[]
  rows: object[]
  pagination: TablePaginationConfig
}
defineProps<{ view: CallbackTableView; loading: boolean; error: string }>()
defineEmits<{
  (event: 'search', payload: ConditionFilterChangePayload): void
  (event: 'page', pagination: TablePaginationConfig): void
  (event: 'refresh'): void
}>()
const { t: $t } = useI18n()
</script>
<style scoped>
.table-toolbar { margin-bottom: var(--space-3); }
</style>
