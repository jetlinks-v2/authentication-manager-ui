<template>
  <j-page-container>
    <div class="detail-page">
      <a-spin :spinning="loading">
      <template v-if="application && detail && template">
        <ApplicationSummary
          :data="{ application, template }"
          @back="backToList"
          @update="updateSummary"
          @toggle-status="toggleStatus"
          @open="openApplication"
        />

        <a-tabs v-model:active-key="activeTab" class="detail-tabs">
          <a-tab-pane key="settings" :tab="$t('ProjectApplication.detail.tab.settings')">
            <ApplicationSettings
              :application="application"
              :template="template"
              @update="updateSettings"
            />
          </a-tab-pane>
          <a-tab-pane key="devices" :tab="$t('ProjectApplication.detail.tab.devices')">
            <DeviceBinding
              :data="deviceBindingData"
              @bind="bindDevices"
              @unbind="unbindDevice"
            />
          </a-tab-pane>
          <a-tab-pane key="cameras" :tab="$t('ProjectApplication.detail.tab.cameras')">
            <VideoConfiguration
              :data="cameraBindingData"
              @bind="bindCameras"
              @unbind="unbindCamera"
            />
          </a-tab-pane>
          <a-tab-pane key="users" :tab="$t('ProjectApplication.detail.tab.users')">
            <UserManagement
              :data="{ users: detail.users, roles: detail.roles }"
              :application-id="applicationId"
              :load-users="store.loadUserCandidates"
              @add="addUser"
              @bind="bindUsers"
              @update="updateUser"
              @remove="removeUser"
            />
          </a-tab-pane>
          <a-tab-pane key="roles" :tab="$t('ProjectApplication.detail.tab.roles')">
            <RoleManagement
              :roles="detail.roles"
              :template-id="application.templateId"
              @save-role="saveRole"
              @delete-role="removeRole"
            />
          </a-tab-pane>
        </a-tabs>
      </template>

      <CloudEmpty v-else-if="!loading" type="page" :description="$t('ProjectApplication.detail.notFound')">
        <a-button type="primary" @click="backToList">
          {{ $t('ProjectApplication.list.title') }}
        </a-button>
      </CloudEmpty>
      </a-spin>
    </div>
  </j-page-container>
</template>

<script setup lang="ts" name="ProjectApplicationDetail">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { prepareApplicationAccess } from '@jetlinks-web-core/utils/application-access'
import ApplicationSummary from './components/ApplicationSummary.vue'
import ApplicationSettings from './components/ApplicationSettings.vue'
import DeviceBinding from './components/DeviceBinding.vue'
import RoleManagement from './components/RoleManagement.vue'
import UserManagement from './components/UserManagement.vue'
import VideoConfiguration from './components/VideoConfiguration.vue'
import { useProjectApplication } from '../useProjectApplication'
import type {
  ApplicationCameraResource,
  ApplicationResource,
  ApplicationRoleDraft,
  ApplicationUser,
  ApplicationUserDraft,
  ProjectApplication,
} from '../types'

const route = useRoute()
const menuStore = useMenuStore()
const store = useProjectApplication()
const { t: $t } = useI18n()
const activeTab = ref('settings')
const loading = ref(false)

const applicationId = computed(() => String(route.params.id || ''))
const application = computed(() => store.applications.find((item) => item.id === applicationId.value))
const detail = computed(() => store.details[applicationId.value])
const template = computed(() => store.templates.find((item) => item.id === application.value?.templateId))
const deviceBindingData = computed(() => ({ bound: detail.value?.devices || [], loadAvailable: store.loadAvailableDevices }))
const cameraBindingData = computed(() => ({
  bound: detail.value?.cameras || [],
  loadAvailable: store.loadAvailableCameras,
  loadGateways: store.loadCameraGateways,
}))
const settingsMessageKeys = {
  icon: 'ProjectApplication.settings.updated',
  name: 'ProjectApplication.detail.nameSuccess',
  description: 'ProjectApplication.detail.descriptionSuccess',
  domain: 'ProjectApplication.settings.updated',
  language: 'ProjectApplication.settings.updated',
} as const

watch(applicationId, async id => {
  if (!id) return
  loading.value = true
  try {
    await Promise.all([store.loadTemplates(), store.loadApplication(id)])
    await store.loadDetail(id)
  } catch {
    // The shared request layer reports the backend error.
  } finally {
    loading.value = false
  }
}, { immediate: true })

const backToList = () => menuStore.jumpPage('application-center/ProjectApplication', {})

const updateSummary = async (patch: Partial<ProjectApplication>, field: 'name' | 'description') => {
  const updated = await store.updateApplication(applicationId.value, patch)
  if (!updated) return
  onlyMessage($t(field === 'name'
    ? 'ProjectApplication.detail.nameSuccess'
    : 'ProjectApplication.detail.descriptionSuccess', { name: updated.name }))
}

const toggleStatus = async () => {
  if (!application.value) return
  const actionKey = application.value.status === 'enabled' ? 'disable' : 'enable'
  const status = application.value.status === 'enabled' ? 'disabled' : 'enabled'
  const updated = await store.updateApplication(applicationId.value, { status })
  if (updated) {
    onlyMessage($t('ProjectApplication.detail.statusSuccess', {
      action: $t(`ProjectApplication.common.${actionKey}`),
      name: updated.name,
    }))
  }
}

const openApplication = () => {
  if (!application.value) return

  const access = prepareApplicationAccess({
    applicationId: application.value.id,
    applicationName: application.value.name,
    domain: application.value.domain,
  })
  if (!access.success) {
    onlyMessage($t('ProjectApplication.detail.accessFailed'), 'warning')
    return
  }
  window.open(access.url, '_blank', 'noopener,noreferrer')
}

const updateSettings = async (
  patch: Partial<ProjectApplication>,
  field: 'icon' | 'name' | 'description' | 'domain' | 'language',
) => {
  const updated = await store.updateApplication(applicationId.value, patch)
  if (!updated) return

  onlyMessage($t(settingsMessageKeys[field], { name: updated.name }))
}

const bindDevices = async (ids: string[]) => {
  await store.bindDevices(applicationId.value, ids)
  onlyMessage($t('ProjectApplication.resource.bindSuccess', { count: ids.length }))
}

const unbindDevice = async (resource: ApplicationResource) => {
  await store.unbindDevice(applicationId.value, resource.id)
  onlyMessage($t('ProjectApplication.resource.unbindSuccess', { name: resource.name }))
}

const bindCameras = async (ids: string[]) => {
  await store.bindCameras(applicationId.value, ids)
  onlyMessage($t('ProjectApplication.camera.bindSuccess', { count: ids.length }))
}

const unbindCamera = async (camera: ApplicationCameraResource) => {
  await store.unbindCamera(applicationId.value, camera)
  onlyMessage($t('ProjectApplication.camera.unbindSuccess', { name: camera.gateway || camera.deviceId }))
}

const addUser = async (draft: ApplicationUserDraft) => {
  await store.addUser(applicationId.value, draft)
  onlyMessage($t('ProjectApplication.user.addSuccess', { name: draft.name }))
}

const bindUsers = async (ids: string[]) => {
  await store.bindUsers(applicationId.value, ids)
  onlyMessage($t('ProjectApplication.user.bindSuccess', { count: ids.length }))
}

const updateUser = async (user: ApplicationUser, patch: Partial<ApplicationUser>) => {
  await store.updateUser(applicationId.value, user.id, patch)
  onlyMessage($t('ProjectApplication.user.updateSuccess', { name: user.name }))
}

const removeUser = async (user: ApplicationUser) => {
  await store.removeUser(applicationId.value, user.id)
  onlyMessage($t('ProjectApplication.user.removeSuccess', { name: user.name }))
}

const saveRole = async (draft: ApplicationRoleDraft, roleId?: string) => {
  await store.saveRole(applicationId.value, draft, roleId)
  onlyMessage($t('ProjectApplication.role.saveSuccess', { name: draft.name }))
}

const removeRole = async (role: { id: string; name: string }) => {
  await store.removeRole(applicationId.value, role.id)
  onlyMessage($t('ProjectApplication.role.deleteSuccess', { name: role.name }))
}
</script>

<style scoped>
.detail-page {
  min-height: 100%;
}

.detail-tabs {
  margin-top: var(--space-4);
  padding: 0 var(--space-4) var(--space-4);
  border: 1px solid var(--line);
  border-radius: var(--r-3);
}

.detail-page :deep(.section),
.detail-page :deep(.section .ic),
.detail-page :deep(.section-sub code),
.detail-page :deep(.ant-table),
.detail-page :deep(.ant-table-container),
.detail-page :deep(.ant-table-thead > tr > th),
.detail-page :deep(.ant-table-tbody > tr > td),
.detail-page :deep(.ant-table-cell-fix-right) {
  background: transparent !important;
}

@media (max-width: 48rem) {
  .detail-page { padding: var(--space-3); }
  .detail-tabs { padding: 0 var(--space-3) var(--space-3); }
}
</style>
