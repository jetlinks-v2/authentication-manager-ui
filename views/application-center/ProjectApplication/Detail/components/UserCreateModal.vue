<template>
  <a-modal
    :open="open"
    :title="$t('ProjectApplication.user.addTitle')"
    :width="900"
    :ok-text="$t('ProjectApplication.user.add')"
    :cancel-text="$t('ProjectApplication.common.cancel')"
    :body-style="{ padding: 'var(--space-3) var(--space-4)' }"
    destroy-on-close
    @ok="confirm"
    @cancel="close"
  >
    <ConditionFilter
      class="user-picker-filter"
      :fields="filterFields"
      :placeholder="$t('ProjectApplication.user.selectFilterPlaceholder')"
      @change="handleFilterChange"
    />

    <div class="user-picker-table">
      <j-pro-table
        v-if="open"
        row-key="id"
        mode="TABLE"
        type="PAGE"
        :columns="columns"
        :request="loadCandidates"
        :params="queryParams"
        :row-selection="rowSelection"
        :alert-show="false"
        :body-style="{ padding: 0 }"
        :default-params="{ sorts: [{ name: 'createTime', order: 'desc' }] }"
      />
    </div>
  </a-modal>
</template>

<script setup lang="ts" name="ProjectApplicationUserCreateModal">
import type { PropType } from 'vue'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ConditionFilter, {
  type ConditionFilterChangePayload,
  type ConditionFilterField,
} from '@jetlinks-web-core/components/ConditionFilter'
import { onlyMessage } from '@jetlinks-web/utils'
import type { UserDetailEntity } from '@authentication-manager-ui/api/application-center/businessApplication'
import {
  loadProjectApplicationUserCandidates,
  type ProjectApplicationUserQuery,
} from '../../applicationUserService'

const props = defineProps({
  open: { type: Boolean, default: false },
  boundUserIds: { type: Array as PropType<string[]>, default: () => [] },
})
const emits = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm', userIds: string[]): void
}>()
const { t: $t } = useI18n()
const selectedRowKeys = ref<string[]>([])
const queryParams = ref<ProjectApplicationUserQuery>({ terms: [] })

const filterFields = computed<ConditionFilterField[]>(() => [
  {
    title: $t('ProjectApplication.user.selectName'),
    dataIndex: 'name',
    search: { type: 'string', defaultTermType: 'like' },
  },
  {
    title: $t('ProjectApplication.user.selectUsername'),
    dataIndex: 'username',
    search: { type: 'string', defaultTermType: 'like' },
  },
])

const columns = computed(() => [
  {
    title: $t('ProjectApplication.user.selectName'),
    dataIndex: 'name',
    key: 'name',
    ellipsis: true,
  },
  {
    title: $t('ProjectApplication.user.selectUsername'),
    dataIndex: 'username',
    key: 'username',
    ellipsis: true,
  },
])

const rowSelection = computed(() => ({
  type: 'checkbox' as const,
  selectedRowKeys: selectedRowKeys.value,
  onSelect: (record: UserDetailEntity, selected: boolean) => {
    toggleSelection([record.id], selected)
  },
  onSelectAll: (selected: boolean, _rows: UserDetailEntity[], changeRows: UserDetailEntity[]) => {
    toggleSelection(changeRows.map(item => item.id), selected)
  },
  onSelectNone: () => {
    selectedRowKeys.value = []
  },
}))

const loadCandidates = (query: ProjectApplicationUserQuery) => {
  return loadProjectApplicationUserCandidates(props.boundUserIds, query)
}

const handleFilterChange = ({ filter }: ConditionFilterChangePayload) => {
  queryParams.value = {
    terms: filter.terms.map(term => ({ ...term })),
  }
}

const toggleSelection = (ids: string[], selected: boolean) => {
  const next = new Set(selectedRowKeys.value)
  ids.filter(Boolean).forEach(id => selected ? next.add(id) : next.delete(id))
  selectedRowKeys.value = [...next]
}

watch(() => props.open, open => {
  if (open) {
    selectedRowKeys.value = []
    queryParams.value = { terms: [] }
  }
})

const close = () => emits('update:open', false)

const confirm = () => {
  if (!selectedRowKeys.value.length) {
    onlyMessage($t('ProjectApplication.user.selectRequired'), 'warning')
    return
  }
  emits('confirm', [...selectedRowKeys.value])
  close()
}
</script>

<style scoped>
.user-picker-filter { margin-bottom: var(--space-3); }
.user-picker-table { height: 31rem; min-height: 0; }
.user-picker-table :deep(.jtable-body-header) { display: none; }
.user-picker-table :deep(.jtable-body) { min-height: 0; gap: 0; }
.user-picker-table :deep(.jtable-pagination) {
  flex: 0 0 auto;
  margin-top: var(--space-2);
  padding-bottom: var(--space-2);
}
</style>
