<template>
  <ContentPanel class="event-picker" :padding="0" :background="false" fill>
    <template #title>
      <span class="picker-title">{{ $t('ApiApplication.subscription.events') }}
        <DocumentHelp code="application-center/ThirdPartyApplication" help-key="subscription.events" />
      </span>
    </template>
    <template #titleRightRender>
      <div class="selection-actions">
        <span class="selection-summary">{{ $t('ThirdPartyApplication.subscription.selectedCategories', { count: selectedCategoryCount }) }}</span>
        <a-divider type="vertical" />
        <a-checkbox :checked="tableSelection.checked" :indeterminate="tableSelection.indeterminate"
          :disabled="disabled || loading || tableSelection.disabled" @change="togglePage($event.target.checked)">
          {{ $t('ApiGroupManagement.spec.selectPage') }}
        </a-checkbox>
      </div>
    </template>
    <p class="selection-hint">{{ $t('ThirdPartyApplication.subscription.categorySelectionHint') }}</p>
    <ConditionFilter v-if="showSearch" :fields="filterFields" :model-value="terms" :disabled="disabled || loading" @update:model-value="search" />
    <a-table :columns="[{ key: 'category', title: $t('ThirdPartyApplication.subscription.eventCategories') }]" :data-source="pageRows"
      row-key="key" table-layout="fixed" size="small" class="category-list" :show-header="false" :loading="loading" :pagination="pagination" :scroll="tableScroll">
      <template #bodyCell="{ record }">
        <div class="category-row">
          <div class="category-choice">
            <a-checkbox :checked="record.checked" :indeterminate="record.indeterminate" :disabled="disabled || loading"
              @change="toggleCategory(record, $event.target.checked)">
              <span :class="{ 'category-selected': record.checked }">{{ record.name }}</span>
            </a-checkbox>
            <a-typography-text v-if="record.unavailable" type="warning" class="category-note">{{ $t('ThirdPartyApplication.subscription.unavailableEventsHint') }}</a-typography-text>
            <a-typography-text v-else-if="record.indeterminate" type="secondary" class="category-note">{{ $t('ThirdPartyApplication.subscription.partialCategory') }}</a-typography-text>
          </div>
          <a-tooltip v-if="!record.unavailable" :title="$t('ThirdPartyApplication.subscription.eventGuide')" :trigger="['hover', 'focus']">
            <a-button type="link" size="small" class="event-link"
              :aria-label="`${record.name} · ${$t('ThirdPartyApplication.subscription.eventCount', { count: record.eventIds.length })} · ${$t('ThirdPartyApplication.subscription.eventGuide')}`"
              @click="emit('inspect', record.eventIds[0])">
              {{ $t('ThirdPartyApplication.subscription.eventCount', { count: record.eventIds.length }) }}
              <AIcon type="RightOutlined" aria-hidden="true" />
            </a-button>
          </a-tooltip>
        </div>
      </template>
      <template #emptyText><CloudEmpty :description="$t(terms.length ? 'ThirdPartyApplication.subscription.noMatchingCategories' : 'ApiApplication.subscription.noEvents')" /></template>
    </a-table>
  </ContentPanel>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import DocumentHelp from '@jetlinks-web-core/components/DocumentHelp'
import type { SubscriptionEventProvider } from '@authentication-manager-ui/api/application-center/applicationSubscription'
import { useSubscriptionEventPicker } from '../useSubscriptionEventPicker'
const props = defineProps<{ providers: SubscriptionEventProvider[]; modelValue: string[]; disabled?: boolean; loading?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [ids: string[]]; inspect: [eventId: string] }>()
const { t: $t } = useI18n()
const { terms, filterFields, showSearch, pageRows, tableScroll, pagination, tableSelection, selectedCategoryCount,
  search, toggleCategory, togglePage } = useSubscriptionEventPicker(props, ids => emit('update:modelValue', ids))
</script>
<style scoped>
.event-picker { min-width: 0; }
.event-picker :deep(.content-panel__header) { gap: var(--space-3); margin-bottom: var(--space-1); }
.picker-title, .selection-actions { display: inline-flex; align-items: center; gap: var(--space-1); }
.selection-summary, .selection-hint { color: var(--ink-3); font-size: var(--fs-12); }
.selection-hint { margin: 0 0 var(--space-3); line-height: var(--lh-normal); }
.category-list { border-top: 1px solid var(--line); }
.category-row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); min-height: var(--space-8); }
.category-choice { min-width: 0; overflow-wrap: anywhere; }
.category-selected { font-weight: 600; }
.category-note { display: block; margin-inline-start: var(--space-6); font-size: var(--fs-12); }
.event-link { display: inline-flex; align-items: center; gap: var(--space-1); flex: none; }
.event-link :deep(.anticon) { margin: 0; font-size: var(--fs-12); }
</style>
