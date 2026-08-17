<template>
  <j-pro-table
    class="resource-picker-table"
    row-key="id"
    mode="TABLE"
    type="PAGE"
    :columns="columns"
    :request="requestPage"
    :rowSelection="selectable ? rowSelection : undefined"
    :alert-show="false"
    :bodyStyle="{ padding: 0 }"
    :scroll="{ x: type === 'camera' ? 760 : 560, y: 420 }"
  >
    <template #name="resource">
      <span class="resource-picker-table__name-cell">
        <span class="resource-picker-table__avatar" :class="{ 'is-camera': type === 'camera' }">
          <img v-if="type === 'camera' && resource.previewUrl" :src="resource.previewUrl" :alt="resource.name" />
          <AIcon v-else :type="type === 'camera' ? 'VideoCameraOutlined' : 'RadarChartOutlined'" />
        </span>
        <span>
          <strong>{{ resource.name }}</strong>
          <small>{{ resource.serial }}</small>
        </span>
      </span>
    </template>
    <template #status="resource">
      <MetaChip :tone="resource.status === 'online' ? 'ok' : 'warn'">{{ resource.statusText }}</MetaChip>
    </template>
    <template #emptyText>
      <CloudEmpty :description="$t('ProjectApplication.resource.empty')" />
    </template>
  </j-pro-table>
</template>

<script setup lang="ts" name="ProjectApplicationResourcePickerTable">
import type { PropType } from 'vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TableColumnType } from 'ant-design-vue'
import type {
  ApplicationResource,
  ResourcePickerData,
  ResourcePickerPage,
  ResourcePickerQuery,
} from '../../types'

type PickerColumn = TableColumnType<ApplicationResource> & { scopedSlots?: boolean }

const props = defineProps({
  type: {
    type: String as PropType<ResourcePickerData['type']>,
    required: true,
  },
  loadResources: {
    type: Function as PropType<ResourcePickerData['loadResources']>,
    required: true,
  },
  gatewayId: {
    type: String,
    default: '',
  },
  queryTerms: {
    type: Array as PropType<Array<Record<string, unknown>>>,
    default: () => [],
  },
  selectedIds: {
    type: Array as PropType<string[]>,
    default: () => [],
  },
  selectable: {
    type: Boolean,
    default: true,
  },
})

const emits = defineEmits<{
  (e: 'toggle', ids: string[], selected: boolean): void
  (e: 'clear'): void
  (e: 'loaded', resources: ApplicationResource[], total: number): void
  (e: 'error'): void
}>()
const { t: $t } = useI18n()
let requestSequence = 0
let latestPage: ResourcePickerPage = { data: [], total: 0, pageIndex: 0, pageSize: 12 }

const requestPage = async (query: ResourcePickerQuery) => {
  const sequence = ++requestSequence
  try {
    const page = await props.loadResources({
      pageIndex: query.pageIndex,
      pageSize: query.pageSize,
      terms: props.queryTerms,
    }, props.gatewayId || undefined)
    if (sequence === requestSequence) {
      latestPage = page
      emits('loaded', page.data, page.total)
      return { success: true, result: page }
    }
    return { success: true, result: latestPage }
  } catch {
    if (sequence === requestSequence) emits('error')
    return sequence === requestSequence
      ? { success: false, result: latestPage }
      : { success: true, result: latestPage }
  }
}

const columns = computed<PickerColumn[]>(() => [
  { title: $t('ProjectApplication.resource.name'), dataIndex: 'name', key: 'name', scopedSlots: true, width: 230 },
  { title: $t('ProjectApplication.resource.serial'), dataIndex: 'serial', key: 'serial', width: 170, ellipsis: true },
  ...(props.type === 'camera'
    ? [
        { title: $t('ProjectApplication.resource.gateway'), dataIndex: 'gateway', key: 'gateway', width: 150, ellipsis: true },
        { title: $t('ProjectApplication.camera.area'), dataIndex: 'area', key: 'area', width: 150, ellipsis: true },
      ]
    : []),
  { title: $t('ProjectApplication.resource.status'), dataIndex: 'status', key: 'status', scopedSlots: true, width: 110 },
])

const rowSelection = computed(() => ({
  type: 'checkbox',
  selectedRowKeys: props.selectedIds,
  onSelect: (record: ApplicationResource, selected: boolean) => emits('toggle', [record.id], selected),
  onSelectAll: (selected: boolean, _rows: ApplicationResource[], changeRows: ApplicationResource[]) => {
    emits('toggle', changeRows.map(item => item.id), selected)
  },
  onSelectNone: () => emits('clear'),
}))
</script>

<style scoped>
.resource-picker-table { min-width: 0; }
.resource-picker-table :deep(.jtable-body-header) { display: none; }
.resource-picker-table :deep(.jtable-body) { gap: 0; }
.resource-picker-table__name-cell { display: inline-flex; align-items: center; gap: var(--space-2); min-width: 0; }
.resource-picker-table__name-cell > span:last-child { display: grid; gap: var(--space-1); min-width: 0; }
.resource-picker-table__name-cell strong { overflow: hidden; color: var(--ink-1); text-overflow: ellipsis; white-space: nowrap; }
.resource-picker-table__name-cell small { overflow: hidden; color: var(--ink-4); font-size: var(--fs-12); text-overflow: ellipsis; white-space: nowrap; }
.resource-picker-table__avatar { display: grid; width: 2rem; height: 2rem; flex: 0 0 2rem; place-items: center; border-radius: var(--r-2); background: var(--bg-sunken); color: var(--ink-4); overflow: hidden; }
.resource-picker-table__avatar.is-camera { width: 3rem; }
.resource-picker-table__avatar img { width: 100%; height: 100%; object-fit: cover; }
</style>
