<template>
  <SectionCard
    icon="VideoCameraOutlined"
    :title="$t('ProjectApplication.camera.title')"
    :sub="$t('ProjectApplication.camera.subtitle')"
  >
    <template #actions>
      <a-button type="primary" @click="pickerOpen = true">
        <template #icon><AIcon type="PlusOutlined" /></template>
        {{ $t('ProjectApplication.camera.bind') }}
      </a-button>
    </template>

    <ResponsiveGrid v-if="data.bound.length" :min="260" gap="var(--space-3)">
      <EntityCard v-for="camera in data.bound" :key="camera.id" :title="camera.name" :subtitle="camera.area">
        <template #icon>
          <div class="camera-icon"><AIcon type="VideoCameraOutlined" /></div>
        </template>
        <template #badges>
          <MetaChip :tone="camera.status === 'online' ? 'ok' : 'warn'">{{ statusText(camera.status) }}</MetaChip>
        </template>
        <template #action>
          <a-button type="link" size="small" @click="currentCamera = camera">
            {{ $t('ProjectApplication.camera.settings') }}
          </a-button>
        </template>
        <template #body>
          <div class="camera-preview"><AIcon type="PlayCircleOutlined" /></div>
        </template>
        <template #footer>
          <span class="camera-serial">{{ camera.serial }}</span>
          <AIcon type="RightOutlined" />
        </template>
      </EntityCard>
    </ResponsiveGrid>
    <CloudEmpty v-else :description="$t('ProjectApplication.camera.empty')">
      <a-button type="primary" @click="pickerOpen = true">{{ $t('ProjectApplication.camera.bind') }}</a-button>
    </CloudEmpty>

    <ResourcePickerDrawer
      v-model:open="pickerOpen"
      :data="pickerData"
      @confirm="emits('bind', $event)"
    />

    <a-modal
      :open="!!currentCamera"
      :title="currentCamera ? `${$t('ProjectApplication.camera.settings')} - ${currentCamera.name}` : ''"
      :footer="null"
      @cancel="currentCamera = undefined"
    >
      <div v-if="currentCamera" class="camera-settings">
        <div class="settings-preview"><AIcon type="VideoCameraOutlined" /></div>
        <KvGrid
          cols="stacked"
          cell-layout="inline"
          :items="cameraDetails"
        />
        <a-popconfirm
          :title="$t('ProjectApplication.device.unbindConfirm', { name: currentCamera.name })"
          @confirm="unbindCurrent"
        >
          <a-button danger block>{{ $t('ProjectApplication.camera.unbind') }}</a-button>
        </a-popconfirm>
      </div>
    </a-modal>
  </SectionCard>
</template>

<script setup lang="ts" name="ProjectApplicationCameraBinding">
import type { PropType } from 'vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ApplicationResource, ResourceStatus } from '../../types'
import ResourcePickerDrawer from './ResourcePickerDrawer.vue'

interface CameraBindingData {
  bound: ApplicationResource[]
  available: ApplicationResource[]
}

const props = defineProps({
  data: {
    type: Object as PropType<CameraBindingData>,
    required: true,
  },
})

const emits = defineEmits(['bind', 'unbind'])
const { t: $t } = useI18n()
const pickerOpen = ref(false)
const currentCamera = ref<ApplicationResource>()

const pickerData = computed(() => ({
  title: $t('ProjectApplication.camera.bind'),
  subtitle: $t('ProjectApplication.camera.subtitle'),
  hint: $t('ProjectApplication.camera.bindHint'),
  resources: props.data.available,
  boundIds: props.data.bound.map((item) => item.id),
  groupModes: [{ label: $t('ProjectApplication.resource.byGateway'), value: 'gateway' as const }],
  showArea: true,
}))

const cameraDetails = computed(() => currentCamera.value ? [
  { label: $t('ProjectApplication.device.name'), value: currentCamera.value.name },
  { label: $t('ProjectApplication.device.serial'), value: currentCamera.value.serial, mono: true },
  { label: $t('ProjectApplication.camera.area'), value: currentCamera.value.area || '--' },
  { label: $t('ProjectApplication.camera.supportsPtz'), value: $t(currentCamera.value.supportsPtz ? 'ProjectApplication.common.yes' : 'ProjectApplication.common.no') },
] : [])

const statusText = (status: ResourceStatus) => $t(`ProjectApplication.common.${status}`)
const unbindCurrent = () => {
  if (!currentCamera.value) return
  emits('unbind', currentCamera.value)
  currentCamera.value = undefined
}
</script>

<style scoped>
.camera-icon {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  place-items: center;
  border-radius: var(--r-2);
  background: var(--accent-soft);
  color: var(--accent);
}

.camera-preview {
  display: grid;
  min-height: 6rem;
  place-items: center;
  margin-top: var(--space-3);
  border-radius: var(--r-2);
  background: var(--bg-sunken);
  color: var(--ink-4);
  font-size: var(--fs-24);
}

.camera-serial { color: var(--ink-4); font-size: var(--fs-12); }
.camera-settings { display: flex; flex-direction: column; gap: var(--space-4); }
.settings-preview { display: grid; min-height: 9rem; place-items: center; border-radius: var(--r-3); background: var(--bg-sunken); color: var(--ink-4); font-size: var(--fs-32); }
</style>
