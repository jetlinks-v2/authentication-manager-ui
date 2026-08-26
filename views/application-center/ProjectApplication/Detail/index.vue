<template>
  <j-page-container>
    <div class="detail-page">
      <a-spin :spinning="loading">
      <template v-if="application && detail && template">
        <ApplicationSummary
          :data="{ application, template }"
          :deleting="deleting"
          :settings-editing="settingsEditing"
          :settings-saving="settingsSaving"
          :show-settings-actions="activeTab === 'settings'"
          :opening="openingApplicationIds.includes(application.id)"
          @back="backToList"
          @cancel-settings="cancelSettings"
          @delete="deleteApplication"
          @edit-settings="editSettings"
          @save-settings="saveSettings"
          @toggle-status="toggleStatus"
          @open="openApplication"
        />

        <a-tabs v-model:active-key="activeTab" class="detail-tabs">
          <a-tab-pane key="settings" :tab="$t('ProjectApplication.detail.tab.settings')">
            <ApplicationSettings
              ref="settingsRef"
              v-model:editing="settingsEditing"
              :data="{ application, template }"
              :saving="settingsSaving"
              @save="updateSettings"
            />
          </a-tab-pane>
          <a-tab-pane key="users" :tab="$t('ProjectApplication.detail.tab.users')">
            <UserManagement
              :data="{ users: detail.users, roles: detail.roles }"
              @add="addUsers"
              @unbind="unbindUser"
              @update="updateUser"
            />
          </a-tab-pane>
          <a-tab-pane key="roles" :tab="$t('ProjectApplication.detail.tab.roles')">
            <RoleManagement
              :roles="detail.roles"
              :users="detail.users"
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

      <ApplicationRoleSelectModal
        v-model:open="roleSelectOpen"
        :roles="roleSelectRoles"
        :application-name="pendingApplication?.name || ''"
        :confirm-loading="roleBinding"
        @confirm="confirmSelectedRole"
        @cancel="resetRoleSelection"
      />
    </div>
  </j-page-container>
</template>

<script setup lang="ts" name="ProjectApplicationDetail">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import ApplicationSummary from './components/ApplicationSummary.vue'
import ApplicationSettings from './components/ApplicationSettings.vue'
import ApplicationRoleSelectModal from '../components/ApplicationRoleSelectModal.vue'
import RoleManagement from './components/RoleManagement.vue'
import UserManagement from './components/UserManagement.vue'
import { useApplicationOpenGuard } from '../useApplicationOpenGuard'
import { useProjectApplication } from '../useProjectApplication'
import type {
  ApplicationRoleDraft,
  ApplicationUser,
  ProjectApplication,
} from '../types'

const route = useRoute()
const menuStore = useMenuStore()
const store = useProjectApplication()
const { t: $t } = useI18n()
const activeTab = ref('settings')
const loading = ref(false)
const settingsEditing = ref(false)
const settingsSaving = ref(false)
const settingsRef = ref<InstanceType<typeof ApplicationSettings>>()
const deleting = ref(false)

const applicationId = computed(() => String(route.params.id || ''))
const application = computed(() => store.applications.find((item) => item.id === applicationId.value))
const detail = computed(() => store.details[applicationId.value])
const template = computed(() => store.templates.find((item) => item.id === application.value?.templateId))
const {
  roleSelectOpen,
  roleSelectRoles,
  pendingApplication,
  openingApplicationIds,
  roleBinding,
  openApplication: openGuardedApplication,
  confirmSelectedRole,
  resetRoleSelection,
  ensureCurrentUserBound,
} = useApplicationOpenGuard({
  syncDetail: async id => {
    if (applicationId.value === id) await store.loadDetail(id)
  },
})
watch(applicationId, async id => {
  if (!id) return
  activeTab.value = 'settings'
  settingsEditing.value = false
  loading.value = true
  try {
    await Promise.all([store.loadTemplates(), store.loadApplication(id)])
    await store.loadDetail(id)
    if (applicationId.value === id) {
      await ensureCurrentUserBound(id, store.details[id]?.roles || [])
    }
  } catch {
    // The shared request layer reports the backend error.
  } finally {
    loading.value = false
  }
}, { immediate: true })

const backToList = () => menuStore.jumpPage('application-center/ProjectApplication', {})

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
  void openGuardedApplication(application.value)
}

const deleteApplication = async () => {
  if (!application.value || deleting.value) return
  const applicationName = application.value.name
  deleting.value = true
  try {
    await store.removeApplication(applicationId.value)
    onlyMessage($t('ProjectApplication.detail.deleteSuccess', { name: applicationName }))
    backToList()
  } finally {
    deleting.value = false
  }
}

const editSettings = () => {
  settingsRef.value?.startEdit()
}

const cancelSettings = () => {
  settingsRef.value?.cancelEdit()
}

const saveSettings = () => {
  settingsRef.value?.saveSettings()
}

const updateSettings = async (patch: Partial<ProjectApplication>) => {
  settingsSaving.value = true
  try {
    const updated = await store.updateApplication(applicationId.value, patch)
    if (!updated) return
    settingsEditing.value = false
    onlyMessage($t('ProjectApplication.settings.updated', { name: updated.name }))
  } finally {
    settingsSaving.value = false
  }
}

const addUsers = async (userIds: string[]) => {
  await store.addUsers(applicationId.value, userIds)
  onlyMessage($t('ProjectApplication.user.bindSuccess', { count: userIds.length }))
}

const unbindUser = async (user: ApplicationUser) => {
  await store.unbindUser(applicationId.value, user.id)
  onlyMessage($t('ProjectApplication.user.unbindSuccess', { name: user.name }))
}

const updateUser = async (user: ApplicationUser, patch: Partial<ApplicationUser>) => {
  await store.updateUser(applicationId.value, user.id, patch)
  onlyMessage($t('ProjectApplication.user.updateSuccess', { name: user.name }))
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
