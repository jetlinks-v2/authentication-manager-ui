<template>
  <div class="linked-specs">
    <SlantedTabs class="spec-tabs" :active-key="activeView" :options="tabOptions" @change="activeView = String($event)">
      <template #default="{ option }">
        <div v-if="option.key === 'permissions'" class="linked-tab-content">
          <PermissionSpecs :resources="resources" readonly :height="height">
            <template #actions><slot name="actions" /></template>
          </PermissionSpecs>
          <p v-if="unclassifiedCount" class="unclassified-hint">
            {{ $t('ApiGroupManagement.spec.unclassifiedCount', { count: unclassifiedCount }) }}
          </p>
        </div>
        <div v-else class="linked-tab-content">
          <div class="list-toolbar">
            <ConditionFilter :fields="filterFields" :placeholder="$t('ApiGroupManagement.spec.searchSelected')" class="spec-search" @update:model-value="search" />
            <slot name="actions" />
          </div>
          <a-table :columns="columns" :data-source="filtered" row-key="id" :pagination="pagination" table-layout="fixed"
            :scroll="{ x: 960, y: height }" :locale="{ emptyText: $t('ApiGroupManagement.spec.noMatches') }">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'summary'"><SpecIdentity :spec="record.available ? record : undefined" :id="record.id" part="name" /></template>
              <template v-else-if="column.key === 'endpoint'"><SpecIdentity :spec="record.available ? record : undefined" :id="record.id" part="endpoint" /></template>
              <template v-else-if="column.key === 'appId'">
                <a-tooltip :title="record.appId"><span class="source-service">{{ record.appId || '—' }}</span></a-tooltip>
              </template>
              <template v-else-if="column.key === 'details'"><SpecDetails v-if="record.available" :spec="record" /></template>
            </template>
          </a-table>
        </div>
      </template>
    </SlantedTabs>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SlantedTabs, { type SlantedTabOption } from '@jetlinks-web-core/components/SlantedTabs'
import type { RawOpenApiSpec } from '@authentication-manager-ui/api/application-center/apiGroupManagement'
import { specTextFields, useLocalTextFilter } from '../useLocalTextFilter'
import { buildSpecPermissionResources } from '../specPermissionResources'
import PermissionSpecs from './PermissionSpecs.vue'
import SpecIdentity from './SpecIdentity.vue'
import SpecDetails from './SpecDetails.vue'
const props = withDefaults(defineProps<{ ids: string[]; specs: Record<string, RawOpenApiSpec>; height?: number }>(), { height: 420 })
const { t: $t } = useI18n()
const activeView = ref('permissions')
const tabOptions = computed<SlantedTabOption[]>(() => [
  { key: 'permissions', label: $t('ApiGroupManagement.spec.permissionOverview') },
  { key: 'details', label: $t('ApiGroupManagement.spec.interfaceDetails') },
])
const page = ref(1)
const pageSize = ref(12)
interface LinkedSpecRow extends RawOpenApiSpec { available: boolean }
const rows = computed(() => props.ids.map<LinkedSpecRow>(id => props.specs[id]
  ? { ...props.specs[id], available: true } : { id, method: '', path: '', available: false }))
// 概览只汇总当前授权项的已关联接口，不以全目录的权限数量暗示完整授权。
const resources = computed(() => buildSpecPermissionResources(rows.value))
const unclassifiedCount = computed(() => props.ids.length - resources.value.reduce((count, resource) => count + resource.ids.length, 0))
const { filterFields, filtered, search } = useLocalTextFilter(() => rows.value, () => specTextFields($t),
  (row, column) => row[column as keyof LinkedSpecRow])
const columns = computed(() => [
  { title: $t('ApiGroupManagement.spec.summary'), dataIndex: 'summary', key: 'summary', width: '28%' },
  { title: $t('ApiGroupManagement.spec.endpoint'), dataIndex: 'path', key: 'endpoint' },
  { title: $t('ApiGroupManagement.spec.appId'), dataIndex: 'appId', key: 'appId', width: 240 },
  { title: $t('ApiGroupManagement.spec.details'), key: 'details', width: 80 },
])
const pagination = computed(() => ({
  current: page.value, pageSize: pageSize.value, showSizeChanger: true, pageSizeOptions: ['12', '24', '48', '96'],
  showTotal: (total: number) => $t('ApiGroupManagement.spec.totalCount', { count: total }),
  onChange: (current: number, size: number) => {
    page.value = size === pageSize.value ? current : 1
    pageSize.value = size
  },
}))
watch(filtered, () => { page.value = 1 })
</script>
<style scoped>
.linked-specs { min-width: 0; }
.spec-tabs {
  --slanted-tabs-active-bg: var(--accent-soft);
  --slanted-tabs-inactive-bg: transparent;
  --slanted-tabs-panel-bg: var(--bg);
}
.linked-tab-content { padding-top: var(--space-4); }
.list-toolbar { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-4); }
.spec-search { flex: 1; min-width: 0; }
.list-toolbar > :deep(.ant-btn) { flex: none; }
.unclassified-hint { margin: var(--space-3) 0 0; color: var(--ink-4); font-size: var(--fs-12); }
.source-service { display: block; line-height: var(--lh-normal); white-space: normal; overflow-wrap: anywhere; }
</style>
