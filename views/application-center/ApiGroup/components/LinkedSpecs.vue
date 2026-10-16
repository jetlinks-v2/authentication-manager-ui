<template>
  <div class="linked-specs">
    <div class="list-toolbar">
      <a-input-search v-model:value="keyword" allow-clear :placeholder="$t('ApiGroupManagement.spec.searchSelected')" class="spec-search" />
      <span>{{ $t('ApiGroupManagement.spec.visibleCount', { visible: filtered.length, total: ids.length }) }}</span>
    </div>
    <a-table :columns="columns" :data-source="filtered" row-key="id" size="small" :pagination="false"
      :scroll="{ x: 850, y: height }" :locale="{ emptyText: $t('ApiGroupManagement.spec.noMatches') }">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'summary'">
          <a-tooltip :title="record.summary || record.id">
            <span v-if="record.available">{{ record.summary || record.path }}</span>
            <span v-else class="missing-spec">{{ $t('ApiGroupManagement.spec.metadataUnavailable') }}<br />{{ record.id }}</span>
          </a-tooltip>
        </template>
        <template v-else-if="column.key === 'path'">
          <a-tag v-if="record.method">{{ record.method }}</a-tag><a-tooltip :title="record.path"><span>{{ record.path || '-' }}</span></a-tooltip>
        </template>
        <template v-else-if="column.key === 'details'"><SpecDetails :spec="record" /></template>
        <template v-else-if="column.key === 'remove'"><a-button type="link" size="small" danger @click="emit('remove', record.id)">{{ $t('ApiGroupManagement.spec.remove') }}</a-button></template>
      </template>
    </a-table>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RawOpenApiSpec } from '@authentication-manager-ui/api/application-center/apiGroupManagement'
import SpecDetails from './SpecDetails.vue'
const props = withDefaults(defineProps<{ ids: string[]; specs: Record<string, RawOpenApiSpec>; removable?: boolean; height?: number }>(), { removable: false, height: 300 })
const emit = defineEmits<{ (event: 'remove', id: string): void }>()
const { t: $t } = useI18n()
interface LinkedSpecRow extends RawOpenApiSpec { available: boolean }
const keyword = ref('')
const filtered = computed(() => {
  const search = keyword.value.trim().toLowerCase()
  return props.ids.map<LinkedSpecRow>(id => props.specs[id] ? { ...props.specs[id], available: true } : { id, method: '', path: '', available: false })
    .filter(spec => !search || [spec.summary, spec.method, spec.path, spec.appId, spec.assetType, spec.id].some(value => value?.toLowerCase().includes(search)))
})
const columns = computed(() => [
  { title: $t('ApiGroupManagement.spec.summary'), dataIndex: 'summary', key: 'summary', width: 210, ellipsis: true },
  { title: $t('ApiGroupManagement.spec.endpoint'), dataIndex: 'path', key: 'path', width: 330, ellipsis: true },
  { title: $t('ApiGroupManagement.spec.appId'), dataIndex: 'appId', key: 'appId', width: 140, ellipsis: true },
  { title: $t('ApiGroupManagement.spec.assetType'), dataIndex: 'assetType', key: 'assetType', width: 100 },
  { title: $t('ApiGroupManagement.spec.details'), key: 'details', width: 70 },
  ...(props.removable ? [{ title: $t('ApiGroupManagement.actions'), key: 'remove', width: 70, fixed: 'right' as const }] : []),
])
</script>
<style scoped>
.list-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; color: var(--ink-4); font-size: var(--fs-12); }
.spec-search { width: min(360px, 100%); }.missing-spec { color: var(--ink-4); }
</style>
