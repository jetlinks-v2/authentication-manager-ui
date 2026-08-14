<template>
  <SectionCard
    icon="VideoCameraOutlined"
    :title="$t('ProjectApplication.camera.title')"
    :sub="$t('ProjectApplication.camera.subtitle')"
  >
    <template #actions>
      <a-button type="primary" @click="openPicker">
        <template #icon><AIcon type="PlusOutlined" /></template>
        {{ $t('ProjectApplication.camera.bind') }}
      </a-button>
    </template>

    <div v-if="data.bound.length" class="camera-grid">
      <article v-for="camera in data.bound" :key="camera.id" class="camera-card">
        <div class="camera-preview">
          <img v-if="camera.previewUrl" :src="camera.previewUrl" :alt="camera.name" />
          <AIcon v-else type="VideoCameraOutlined" />
          <MetaChip class="camera-status" :tone="statusTone(camera.status)">{{ camera.statusText }}</MetaChip>
        </div>
        <div class="camera-body">
          <div class="camera-title">
            <strong>{{ camera.name }}</strong>
            <span>{{ camera.serial }}</span>
          </div>
          <div class="camera-meta">
            <span><AIcon type="EnvironmentOutlined" />{{ camera.area }}</span>
            <span><AIcon type="ControlOutlined" />{{ $t(camera.supportsPtz ? 'ProjectApplication.common.yes' : 'ProjectApplication.common.no') }}</span>
          </div>
          <a-button block @click="openSettings(camera)">{{ $t('ProjectApplication.camera.settings') }}</a-button>
        </div>
      </article>
    </div>
    <CloudEmpty v-else :description="$t('ProjectApplication.camera.empty')">
      <a-button type="primary" @click="openPicker">{{ $t('ProjectApplication.camera.bind') }}</a-button>
    </CloudEmpty>

    <ResourcePickerDrawer
      v-model:open="pickerOpen"
      :data="pickerData"
      @confirm="emits('bind', $event)"
    />

    <a-modal
      :open="settingsOpen"
      :title="$t('ProjectApplication.camera.settingsTitle')"
      :footer="null"
      @cancel="settingsOpen = false"
    >
      <div v-if="activeCamera" class="settings-panel">
        <div class="settings-preview">
          <img v-if="activeCamera.previewUrl" :src="activeCamera.previewUrl" :alt="activeCamera.name" />
          <AIcon v-else type="VideoCameraOutlined" />
          <MetaChip class="settings-status" :tone="statusTone(activeCamera.status)">{{ activeCamera.statusText }}</MetaChip>
        </div>
        <dl class="settings-list">
          <div><dt>{{ $t('ProjectApplication.camera.name') }}</dt><dd>{{ activeCamera.name }}</dd></div>
          <div><dt>{{ $t('ProjectApplication.camera.status') }}</dt><dd>{{ activeCamera.statusText }}</dd></div>
          <div><dt>{{ $t('ProjectApplication.camera.serial') }}</dt><dd>{{ activeCamera.serial }}</dd></div>
          <div><dt>{{ $t('ProjectApplication.camera.area') }}</dt><dd>{{ activeCamera.area }}</dd></div>
          <div>
            <dt>{{ $t('ProjectApplication.camera.supportsPtz') }}</dt>
            <dd>{{ $t(activeCamera.supportsPtz ? 'ProjectApplication.common.yes' : 'ProjectApplication.common.no') }}</dd>
          </div>
        </dl>
        <a-popconfirm
          :title="$t('ProjectApplication.camera.unbindConfirm', { name: activeCamera.name })"
          @confirm="confirmUnbind"
        >
          <a-button danger block>{{ $t('ProjectApplication.camera.unbind') }}</a-button>
        </a-popconfirm>
      </div>
    </a-modal>
  </SectionCard>
</template>

<script setup lang="ts" name="ProjectApplicationVideoConfiguration">
import type { PropType } from 'vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
  ApplicationCameraResource,
  ApplicationResource,
  ResourcePickerGateway,
  ResourcePickerPage,
  ResourcePickerQuery,
} from '../../types'
import ResourcePickerDrawer from './ResourcePickerDrawer.vue'

interface CameraBindingData {
  bound: ApplicationCameraResource[]
  loadAvailable: (query: ResourcePickerQuery, gatewayId?: string) => Promise<ResourcePickerPage>
  loadGateways: () => Promise<ResourcePickerGateway[]>
}

const props = defineProps({
  data: {
    type: Object as PropType<CameraBindingData>,
    required: true,
  },
})

const emits = defineEmits<{
  (e: 'bind', ids: string[]): void
  (e: 'unbind', camera: ApplicationCameraResource): void
}>()
const { t: $t } = useI18n()
const pickerOpen = ref(false)
const settingsOpen = ref(false)
const activeCamera = ref<ApplicationCameraResource>()

const statusTone = (status: string) => status === 'online' ? 'ok' : status === 'offline' ? 'warn' : 'default'
const pickerData = computed(() => ({
  type: 'camera' as const,
  title: $t('ProjectApplication.camera.bind'),
  subtitle: $t('ProjectApplication.camera.subtitle'),
  hint: $t('ProjectApplication.camera.bindHint'),
  loadResources: props.data.loadAvailable,
  loadGateways: props.data.loadGateways,
  getBindingId: (camera: ApplicationResource) => (camera as ApplicationCameraResource).deviceId,
  boundIds: props.data.bound.map(item => item.id),
}))

const openPicker = () => { pickerOpen.value = true }
const openSettings = (camera: ApplicationCameraResource) => {
  activeCamera.value = camera
  settingsOpen.value = true
}
const confirmUnbind = () => {
  if (!activeCamera.value) return
  emits('unbind', activeCamera.value)
  settingsOpen.value = false
}
</script>

<style scoped>
.camera-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr)); gap: var(--space-3); }
.camera-card { overflow: hidden; border: 1px solid var(--line); border-radius: var(--r-3); }
.camera-preview { position: relative; display: grid; min-height: 9rem; place-items: center; color: var(--ink-4); font-size: var(--fs-24); }
.camera-preview img { width: 100%; height: 100%; min-height: 9rem; object-fit: cover; }
.camera-status { position: absolute; right: var(--space-2); top: var(--space-2); }
.camera-body { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-3); }
.camera-title { display: flex; min-width: 0; flex-direction: column; gap: var(--space-1); }
.camera-title strong { overflow: hidden; color: var(--ink-1); text-overflow: ellipsis; white-space: nowrap; }
.camera-title span { color: var(--ink-4); font-size: var(--fs-12); }
.camera-meta { display: flex; min-width: 0; flex-wrap: wrap; gap: var(--space-2); color: var(--ink-3); font-size: var(--fs-12); }
.camera-meta span { display: inline-flex; align-items: center; gap: var(--space-1); min-width: 0; }
.settings-panel { display: flex; flex-direction: column; gap: var(--space-4); }
.settings-preview { position: relative; display: grid; min-height: 13rem; place-items: center; border-radius: var(--r-3); color: var(--ink-4); font-size: var(--fs-24); overflow: hidden; }
.settings-preview img { width: 100%; height: 13rem; object-fit: cover; }
.settings-status { position: absolute; right: var(--space-2); top: var(--space-2); }
.settings-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); margin: 0; }
.settings-list div { min-width: 0; }
.settings-list dt { color: var(--ink-4); font-size: var(--fs-12); }
.settings-list dd { margin: var(--space-1) 0 0; color: var(--ink-1); word-break: break-all; }
@media (max-width: 36rem) { .settings-list { grid-template-columns: 1fr; } }
</style>
