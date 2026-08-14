<template>
  <SectionCard
    icon="CloudServerOutlined"
    :title="$t('ProjectApplication.device.title')"
    :sub="$t('ProjectApplication.device.subtitle')"
  >
    <template #actions>
      <a-button type="primary" @click="openPicker">
        <template #icon><AIcon type="PlusOutlined" /></template>
        {{ $t('ProjectApplication.device.bind') }}
      </a-button>
    </template>

    <a-table
      v-if="data.bound.length"
      row-key="id"
      size="middle"
      :columns="columns"
      :data-source="data.bound"
      :pagination="false"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <a-space><AIcon type="RadarChartOutlined" />{{ record.name }}</a-space>
        </template>
        <template v-else-if="column.key === 'status'">
          <MetaChip :tone="record.status === 'online' ? 'ok' : 'warn'">{{ record.statusText }}</MetaChip>
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-popconfirm
            :title="$t('ProjectApplication.device.unbindConfirm', { name: record.name })"
            @confirm="emits('unbind', record)"
          >
            <a-button type="link" danger size="small">{{ $t('ProjectApplication.device.unbind') }}</a-button>
          </a-popconfirm>
        </template>
      </template>
    </a-table>
    <CloudEmpty v-else :description="$t('ProjectApplication.device.empty')">
      <a-button type="primary" @click="openPicker">{{ $t('ProjectApplication.device.bind') }}</a-button>
    </CloudEmpty>

    <ResourcePickerDrawer
      v-model:open="pickerOpen"
      :data="pickerData"
      @confirm="emits('bind', $event)"
    />
  </SectionCard>
</template>

<script setup lang="ts" name="ProjectApplicationDeviceBinding">
import type { PropType } from 'vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
  ApplicationResource,
  ResourcePickerPage,
  ResourcePickerQuery,
} from '../../types'
import ResourcePickerDrawer from './ResourcePickerDrawer.vue'

interface ResourceBindingData {
  bound: ApplicationResource[]
  loadAvailable: (query: ResourcePickerQuery) => Promise<ResourcePickerPage>
}

const props = defineProps({
  data: {
    type: Object as PropType<ResourceBindingData>,
    required: true,
  },
})

const emits = defineEmits(['bind', 'unbind'])
const { t: $t } = useI18n()
const pickerOpen = ref(false)

const columns = computed(() => [
  { title: $t('ProjectApplication.device.name'), dataIndex: 'name', key: 'name' },
  { title: $t('ProjectApplication.device.serial'), dataIndex: 'serial', key: 'serial' },
  { title: $t('ProjectApplication.device.category'), dataIndex: 'category', key: 'category' },
  { title: $t('ProjectApplication.device.status'), dataIndex: 'status', key: 'status', width: '7rem' },
  { title: $t('ProjectApplication.common.actions'), key: 'actions', width: '6rem' },
])

const pickerData = computed(() => ({
  type: 'device' as const,
  title: $t('ProjectApplication.device.bind'),
  subtitle: $t('ProjectApplication.device.subtitle'),
  loadResources: props.data.loadAvailable,
  boundIds: props.data.bound.map((item) => item.id),
}))

const openPicker = () => { pickerOpen.value = true }
</script>

<style scoped></style>
