<template>
  <SectionCard
    icon="CloudServerOutlined"
    :title="$t('ProjectApplication.device.title')"
    :sub="$t('ProjectApplication.device.subtitle')"
  >
    <template #actions>
      <j-permission-button
        hasPermission="application-center/ProjectApplication:bind-device"
        type="primary"
        :loading="data.saving"
        :disabled="data.loading || data.loadFailed"
        @click="openPicker"
      >
        <template #icon><AIcon type="PlusOutlined" /></template>
        {{ $t('ProjectApplication.device.bind') }}
      </j-permission-button>
    </template>

    <a-spin :spinning="data.loading">
      <a-alert v-if="data.loadFailed" type="error" show-icon :message="$t('ProjectApplication.resource.loadFailed')" />
      <a-table
        v-else-if="data.bound.length"
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
              <j-permission-button
                hasPermission="application-center/ProjectApplication:bind-device"
                type="link"
                danger
                size="small"
                :disabled="data.loading || data.saving"
              >{{ $t('ProjectApplication.device.unbind') }}</j-permission-button>
            </a-popconfirm>
          </template>
        </template>
      </a-table>
      <CloudEmpty v-else-if="!data.loading" :description="$t('ProjectApplication.device.empty')">
        <j-permission-button
          hasPermission="application-center/ProjectApplication:bind-device"
          type="primary"
          :loading="data.saving"
          @click="openPicker"
        >{{ $t('ProjectApplication.device.bind') }}</j-permission-button>
      </CloudEmpty>
    </a-spin>

    <ResourcePickerDrawer
      v-model:open="pickerOpen"
      :data="pickerData"
      @confirm="emits('bind', $event)"
    />
  </SectionCard>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
  ApplicationResource,
  ResourcePickerPage,
  ResourcePickerQuery,
} from '../../types'
import ResourcePickerDrawer from './ResourcePickerDrawer.vue'

defineOptions({ name: 'ProjectApplicationDeviceBinding' })

interface ResourceBindingData {
  bound: ApplicationResource[]
  loadAvailable: (query: ResourcePickerQuery) => Promise<ResourcePickerPage>
  loading: boolean
  saving: boolean
  loadFailed: boolean
}

const props = defineProps({
  data: {
    type: Object as PropType<ResourceBindingData>,
    required: true,
  },
})

const emits = defineEmits<{
  (e: 'bind', ids: string[]): void
  (e: 'unbind', device: ApplicationResource): void
}>()
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
