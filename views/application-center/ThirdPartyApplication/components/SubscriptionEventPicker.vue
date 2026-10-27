<template>
  <div class="event-picker">
    <div class="category-toolbar">
      <ConditionFilter class="category-search" :fields="filterFields" :model-value="terms" :disabled="disabled || loading" @update:model-value="search" />
      <span class="selection-summary">{{ $t('ThirdPartyApplication.subscription.selectedCategories', { count: selectedCategoryCount }) }}</span>
    </div>
    <a-table :columns="columns" :data-source="rows" row-key="key" table-layout="fixed" class="category-table"
      :loading="loading" :pagination="pagination" :scroll="{ x: 360 }" @change="changePage">
      <template #headerCell="{ column }">
        <a-checkbox v-if="column.key === 'category'" :checked="tableSelection.checked" :indeterminate="tableSelection.indeterminate"
          :disabled="disabled || loading || tableSelection.disabled" @change="togglePage($event.target.checked)">
          {{ column.title }}
        </a-checkbox>
        <span v-else>{{ column.title }}</span>
      </template>
      <template #bodyCell="{ column, record }">
        <div v-if="column.key === 'category'" class="category-cell">
          <a-checkbox :checked="record.checked" :indeterminate="record.indeterminate" :disabled="disabled || loading"
            @change="toggleCategory(record, $event.target.checked)">{{ record.name }}</a-checkbox>
          <a-typography-text v-if="record.unavailable" type="warning" class="category-note">{{ $t('ThirdPartyApplication.subscription.unavailableEventsHint') }}</a-typography-text>
          <a-typography-text v-else-if="record.indeterminate" type="secondary" class="category-note">{{ $t('ThirdPartyApplication.subscription.partialCategory') }}</a-typography-text>
        </div>
        <a-button v-else-if="column.key === 'actions' && !record.unavailable" type="link" class="document-action"
          @click="emit('inspect', record.eventIds[0])">{{ $t('ThirdPartyApplication.subscription.eventGuide') }}</a-button>
      </template>
      <template #emptyText><CloudEmpty :description="$t(providers.length ? 'ApiGroupManagement.spec.noMatches' : 'ApiApplication.subscription.noEvents')" /></template>
    </a-table>
    <p class="selection-hint">{{ $t('ThirdPartyApplication.subscription.categorySelectionHint') }}</p>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { SubscriptionEventProvider } from '@authentication-manager-ui/api/application-center/applicationSubscription'
import { useSubscriptionEventPicker } from '../useSubscriptionEventPicker'
const props = defineProps<{ providers: SubscriptionEventProvider[]; modelValue: string[]; disabled?: boolean; loading?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [ids: string[]]; inspect: [eventId: string] }>()
const { t: $t } = useI18n()
const { terms, filterFields, rows, columns, pagination, tableSelection, selectedCategoryCount,
  changePage, search, toggleCategory, togglePage } = useSubscriptionEventPicker(props, ids => emit('update:modelValue', ids))
</script>
<style scoped>
.event-picker { display: grid; gap: var(--space-3); min-width: 0; }
.category-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-3); }
.category-search { flex: 1 1 18rem; min-width: 0; }
.selection-summary { color: var(--ink-3); font-size: var(--fs-12); }
.category-table :deep(.ant-table-cell) { vertical-align: top; overflow-wrap: anywhere; }
.category-cell :deep(.ant-checkbox-wrapper) { display: flex; align-items: flex-start; line-height: var(--lh-normal); }
.category-cell :deep(.ant-checkbox-wrapper > span:last-child) { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.category-cell :deep(.ant-checkbox) { flex: none; align-self: flex-start; margin-block-start: 0.2em; }
.category-note { display: block; margin: var(--space-1) 0 0 var(--space-6); font-size: var(--fs-12); }
.document-action { height: auto; padding: 0; white-space: normal; text-align: start; }
.selection-hint { margin: 0; color: var(--ink-4); font-size: var(--fs-12); line-height: var(--lh-normal); }
</style>
