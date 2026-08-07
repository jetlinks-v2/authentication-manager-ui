<template>
  <j-page-container>
    <div class="detail-page">
      <template v-if="application && detail && template">
        <div class="detail-navigation">
          <a-tooltip :title="$t('ProjectApplication.list.title')">
            <a-button type="text" shape="circle" @click="backToList">
              <template #icon><AIcon type="ArrowLeftOutlined" /></template>
            </a-button>
          </a-tooltip>
        </div>

        <ApplicationSummary
          :data="{ application, template }"
          @update="updateSummary"
          @toggle-status="toggleStatus"
          @open="openApplication"
        />

        <a-tabs v-model:active-key="activeTab" class="detail-tabs">
          <a-tab-pane key="settings" :tab="$t('ProjectApplication.detail.tab.settings')">
            <ApplicationSettings :application="application" @update="updateSettings" />
          </a-tab-pane>
          <a-tab-pane key="devices" :tab="$t('ProjectApplication.detail.tab.devices')">
            <DeviceBinding
              :data="deviceBindingData"
              @bind="bindResources('devices', $event)"
              @unbind="unbindResource('devices', $event)"
            />
          </a-tab-pane>
          <a-tab-pane key="cameras" :tab="$t('ProjectApplication.detail.tab.cameras')">
            <CameraBinding
              :data="cameraBindingData"
              @bind="bindResources('cameras', $event)"
              @unbind="unbindResource('cameras', $event)"
            />
          </a-tab-pane>
          <a-tab-pane key="usage" :tab="$t('ProjectApplication.detail.tab.usage')">
            <UsageOverview :services="detail.usage" />
          </a-tab-pane>
          <a-tab-pane key="users" :tab="$t('ProjectApplication.detail.tab.users')">
            <UserManagement
              :data="{ users: detail.users, roles: detail.roles }"
              @add="addUser"
              @update="updateUser"
              @remove="removeUser"
            />
          </a-tab-pane>
          <a-tab-pane key="roles" :tab="$t('ProjectApplication.detail.tab.roles')">
            <RoleManagement
              :data="{ roles: detail.roles, permissionTree: store.permissionTree }"
              @save-role="saveRole"
              @update-permissions="updateRolePermissions"
            />
          </a-tab-pane>
        </a-tabs>
      </template>

      <CloudEmpty v-else type="page" :description="$t('ProjectApplication.detail.notFound')">
        <a-button type="primary" @click="backToList">
          {{ $t('ProjectApplication.list.title') }}
        </a-button>
      </CloudEmpty>
    </div>
  </j-page-container>
</template>

<script setup lang="ts" name="ProjectApplicationDetail">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import ApplicationSummary from './components/ApplicationSummary.vue'
import ApplicationSettings from './components/ApplicationSettings.vue'
import CameraBinding from './components/CameraBinding.vue'
import DeviceBinding from './components/DeviceBinding.vue'
import RoleManagement from './components/RoleManagement.vue'
import UsageOverview from './components/UsageOverview.vue'
import UserManagement from './components/UserManagement.vue'
import { useProjectApplication } from '../useProjectApplication'
import type {
  ApplicationResource,
  ApplicationRoleDraft,
  ApplicationUser,
  ApplicationUserDraft,
  PermissionAction,
  ProjectApplication,
} from '../types'

const route = useRoute()
const menuStore = useMenuStore()
const store = useProjectApplication()
const { t: $t } = useI18n()
const activeTab = ref('settings')

const applicationId = computed(() => String(route.params.id || ''))
const application = computed(() => store.applications.find((item) => item.id === applicationId.value))
const detail = computed(() => store.getDetail(applicationId.value).value)
const template = computed(() => store.templates.find((item) => item.id === application.value?.templateId))
const deviceBindingData = computed(() => ({ bound: detail.value?.devices || [], available: store.availableDevices }))
const cameraBindingData = computed(() => ({ bound: detail.value?.cameras || [], available: store.availableCameras }))

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
  if (!application.value?.domain) {
    onlyMessage($t('ProjectApplication.detail.noDomain'), 'warning')
    return
  }
  window.open(application.value.domain, '_blank', 'noopener,noreferrer')
}

const updateSettings = async (patch: Partial<ProjectApplication>) => {
  const updated = await store.updateApplication(applicationId.value, patch)
  if (updated) onlyMessage($t('ProjectApplication.settings.updated', { name: updated.name }))
}

const bindResources = async (type: 'devices' | 'cameras', ids: string[]) => {
  await store.bindResources(applicationId.value, type, ids)
  onlyMessage($t('ProjectApplication.resource.bindSuccess', { count: ids.length }))
}

const unbindResource = async (type: 'devices' | 'cameras', resource: ApplicationResource) => {
  await store.unbindResource(applicationId.value, type, resource.id)
  onlyMessage($t('ProjectApplication.resource.unbindSuccess', { name: resource.name }))
}

const addUser = async (draft: ApplicationUserDraft) => {
  await store.addUser(applicationId.value, draft)
  onlyMessage($t('ProjectApplication.user.addSuccess', { name: draft.name }))
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

const updateRolePermissions = (
  roleId: string,
  permissions: Record<string, PermissionAction[]>,
) => store.updateRolePermissions(applicationId.value, roleId, permissions)
</script>

<style scoped>
.detail-page {
  min-height: 100%;
  padding: var(--space-4) var(--space-5) var(--space-5);
  background: var(--bg-sunken);
}

.detail-navigation { margin-bottom: var(--space-2); }

.detail-tabs {
  margin-top: var(--space-4);
  padding: 0 var(--space-4) var(--space-4);
  border: 1px solid var(--line);
  border-radius: var(--r-3);
  background: var(--bg);
}

@media (max-width: 48rem) {
  .detail-page { padding: var(--space-3); }
  .detail-tabs { padding: 0 var(--space-3) var(--space-3); }
}
</style>
