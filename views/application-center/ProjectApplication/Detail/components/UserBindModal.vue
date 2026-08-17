<template>
  <a-modal
    :open="open"
    :width="1000"
    :title="$t('ProjectApplication.user.bindTitle')"
    :ok-text="$t('ProjectApplication.user.bindCount', { count: selectedIds.length })"
    :cancel-text="$t('ProjectApplication.common.cancel')"
    :ok-button-props="{ disabled: !selectedIds.length }"
    @ok="confirm"
    @cancel="emits('update:open', false)"
  >
    <ConditionFilter
      v-model="filterTerms"
      class="user-bind-modal__filter"
      :fields="filterFields"
      :common-fields="commonFields"
      :placeholder="$t('ProjectApplication.user.candidateSearchPlaceholder')"
      @change="handleSearch"
    />

    <a-alert v-if="loadError" type="error" show-icon :message="loadError" />

    <j-pro-table
      :key="tableKey"
      class="user-bind-modal__table"
      row-key="id"
      mode="TABLE"
      type="PAGE"
      :columns="columns"
      :request="requestPage"
      :rowSelection="rowSelection"
      :alert-show="false"
      :bodyStyle="{ padding: 0 }"
      :scroll="{ x: 640, y: 420 }"
    >
      <template #name="user">
        <a-space>
          <a-avatar>{{ (user.name || user.username || '--').slice(0, 1) }}</a-avatar>
          <span class="user-bind-modal__name">
            <strong>{{ user.name || '--' }}</strong>
            <small>{{ user.username || '--' }}</small>
          </span>
        </a-space>
      </template>
      <template #status="user">
        <MetaChip :tone="user.enabled ? 'ok' : 'default'">
          {{ $t(user.enabled ? 'ProjectApplication.user.normal' : 'ProjectApplication.user.disabled') }}
        </MetaChip>
      </template>
      <template #emptyText>
        <CloudEmpty :description="$t('ProjectApplication.user.bindEmpty')" />
      </template>
    </j-pro-table>
  </a-modal>
</template>

<script setup lang="ts" name="ProjectApplicationUserBindModal">
import type { PropType } from 'vue'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TableColumnType } from 'ant-design-vue'
import type {
  ConditionFilterChangePayload,
  ConditionFilterCommonField,
  ConditionFilterField,
  ConditionFilterTerm,
} from '@jetlinks-web-core/components/ConditionFilter'
import type { ApplicationUserCandidate, UserPickerPage, UserPickerQuery } from '../../types'

type UserColumn = TableColumnType<ApplicationUserCandidate> & { scopedSlots?: boolean }

const props = defineProps({
  open: { type: Boolean, default: false },
  applicationId: { type: String, required: true },
  loadUsers: {
    type: Function as PropType<(applicationId: string, query: UserPickerQuery) => Promise<UserPickerPage>>,
    required: true,
  },
})

const emits = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm', ids: string[]): void
}>()
const { t: $t } = useI18n()
const commonFields: ConditionFilterCommonField[] = ['name', 'username']
const filterTerms = ref<ConditionFilterTerm[]>([])
const submittedTerms = ref<ConditionFilterTerm[]>([])
const selectedIds = ref<string[]>([])
const tableKey = ref(0)
const loadError = ref('')
let latestPage: UserPickerPage = { data: [], total: 0, pageIndex: 0, pageSize: 10 }
let requestSequence = 0

const filterFields = computed<ConditionFilterField[]>(() => [
  { dataIndex: 'name', title: $t('ProjectApplication.user.name'), search: { type: 'string', defaultTermType: 'like' } },
  { dataIndex: 'username', title: $t('ProjectApplication.user.account'), search: { type: 'string', defaultTermType: 'like' } },
  { dataIndex: 'telephone', title: $t('ProjectApplication.user.phone'), search: { type: 'string', defaultTermType: 'like' } },
])
const columns = computed<UserColumn[]>(() => [
  { title: $t('ProjectApplication.user.user'), dataIndex: 'name', key: 'name', scopedSlots: true, width: 220 },
  { title: $t('ProjectApplication.user.phone'), dataIndex: 'phone', key: 'phone', width: 150, ellipsis: true },
  { title: $t('ProjectApplication.user.status'), dataIndex: 'status', key: 'status', scopedSlots: true, width: 110 },
])
const rowSelection = computed(() => ({
  type: 'checkbox',
  selectedRowKeys: selectedIds.value,
  getCheckboxProps: (record: ApplicationUserCandidate) => ({ disabled: !record.enabled }),
  onSelect: (record: ApplicationUserCandidate, selected: boolean) => toggleSelected([record.id], selected),
  onSelectAll: (selected: boolean, _rows: ApplicationUserCandidate[], changeRows: ApplicationUserCandidate[]) => {
    toggleSelected(changeRows.filter(item => item.enabled).map(item => item.id), selected)
  },
  onSelectNone: () => { selectedIds.value = [] },
}))

watch(() => [props.open, props.applicationId], ([open]) => {
  if (open) resetState()
}, { immediate: true })

function resetState() {
  // Reopening the dialog creates a fresh table session; stale page responses must be ignored.
  requestSequence += 1
  filterTerms.value = []
  submittedTerms.value = []
  selectedIds.value = []
  loadError.value = ''
  latestPage = { data: [], total: 0, pageIndex: 0, pageSize: 10 }
  tableKey.value += 1
}

function cloneTerms(terms: ConditionFilterTerm[] = []): ConditionFilterTerm[] {
  return terms.map(item => ({
    ...item,
    value: Array.isArray(item.value) ? [...item.value] : item.value,
    terms: Array.isArray(item.terms)
      ? cloneTerms(item.terms as ConditionFilterTerm[]) as ConditionFilterTerm['terms']
      : item.terms,
  }))
}

function handleSearch(payload?: ConditionFilterChangePayload) {
  submittedTerms.value = cloneTerms(payload?.terms ?? filterTerms.value)
  selectedIds.value = []
  loadError.value = ''
  tableKey.value += 1
}

async function requestPage(query: UserPickerQuery) {
  const sequence = ++requestSequence
  try {
    const page = await props.loadUsers(props.applicationId, {
      pageIndex: query.pageIndex,
      pageSize: query.pageSize,
      terms: cloneTerms(submittedTerms.value),
    })
    if (sequence === requestSequence) {
      latestPage = page
      loadError.value = ''
      return { success: true, result: page }
    }
    return { success: true, result: latestPage }
  } catch {
    if (sequence === requestSequence) loadError.value = $t('ProjectApplication.user.bindLoadFailed')
    return sequence === requestSequence
      ? { success: false, result: latestPage }
      : { success: true, result: latestPage }
  }
}

function toggleSelected(ids: string[], selected: boolean) {
  const next = new Set(selectedIds.value)
  ids.filter(Boolean).forEach(id => selected ? next.add(id) : next.delete(id))
  selectedIds.value = [...next]
}

function confirm() {
  if (!selectedIds.value.length) return
  emits('confirm', [...selectedIds.value])
  emits('update:open', false)
}
</script>

<style scoped>
.user-bind-modal__filter { margin-bottom: var(--space-3); }
.user-bind-modal__table { min-width: 0; margin-top: var(--space-3); }
.user-bind-modal__table :deep(.jtable-body-header) { display: none; }
.user-bind-modal__table :deep(.jtable-body) { gap: 0; }
.user-bind-modal__name { display: grid; min-width: 0; gap: var(--space-1); }
.user-bind-modal__name strong { overflow: hidden; color: var(--ink-1); text-overflow: ellipsis; white-space: nowrap; }
.user-bind-modal__name small { overflow: hidden; color: var(--ink-4); font-size: var(--fs-12); text-overflow: ellipsis; white-space: nowrap; }
</style>
