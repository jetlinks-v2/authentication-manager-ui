<template>
  <PageChrome>
    <a-button class="detail-page__back" type="text" @click="backToList">
      <template #icon><AIcon type="LeftOutlined" /></template>
      {{ $t('ProjectApplication.detail.back') }}
    </a-button>
  </PageChrome>

  <main class="detail-page">
    <PageChrome v-if="application && detail && template" flush>
      <ApplicationSummary
        class="detail-page__summary"
        :data="{ application, template }"
        :deleting="deleting"
        :syncing-credential="syncingCredential"
        :settings-editing="settingsEditing"
        :settings-saving="settingsSaving"
        :show-settings-actions="activeTab === 'settings'"
        :opening="openingApplicationIds.includes(application.id)"
        @cancel-settings="cancelSettings"
        @delete="deleteApplication"
        @edit-settings="editSettings"
        @save-settings="saveSettings"
        @toggle-status="toggleStatus"
        @open="openApplication"
        @sync-credential="syncCredential"
      />
      <SlantedTabs
        :active-key="activeTab"
        :options="tabOptions"
        @change="activeTab = String($event)"
      />
    </PageChrome>

    <FullPage has-padding show-scroll>
      <a-spin :spinning="loading">
        <a-tabs v-if="application && detail && template" v-model:active-key="activeTab" class="detail-tabs">
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
              :scope="{ applicationId: application.id, templateId: application.templateId, isExternal: application.provider === 'third-party' }"
              @save-role="saveRole"
              @delete-role="removeRole"
            />
          </a-tab-pane>
        </a-tabs>

        <CloudEmpty v-else-if="!loading" type="page" :description="$t('ProjectApplication.detail.notFound')">
          <a-button type="primary" @click="backToList">
            {{ $t('ProjectApplication.detail.back') }}
          </a-button>
        </CloudEmpty>
      </a-spin>
    </FullPage>
  </main>
</template>

<script setup lang="ts" name="ProjectApplicationDetail">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { PageChrome, SlantedTabs } from '@jetlinks-web-core/components'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { syncBusinessApplicationCredential } from '@authentication-manager-ui/api/application-center/businessApplication'
import ApplicationSummary from './components/ApplicationSummary.vue'
import ApplicationSettings from './components/ApplicationSettings.vue'
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
const activeTab = ref(route.query.tab === 'roles' ? 'roles' : 'settings')
const tabOptions = computed(() => [
  { key: 'settings', label: $t('ProjectApplication.detail.tab.settings') },
  { key: 'users', label: $t('ProjectApplication.detail.tab.users') },
  { key: 'roles', label: $t('ProjectApplication.detail.tab.roles') },
])
const loading = ref(false)
const settingsEditing = ref(false)
const settingsSaving = ref(false)
const settingsRef = ref<InstanceType<typeof ApplicationSettings>>()
const deleting = ref(false)
const syncingCredential = ref(false)

const applicationId = computed(() => String(route.params.id || ''))
const application = computed(() => store.applications.find((item) => item.id === applicationId.value))
const detail = computed(() => store.details[applicationId.value])
const template = computed(() => store.templates.find((item) => item.id === application.value?.templateId))
let detailLoadVersion = 0
const {
  openingApplicationIds,
  openApplication: openGuardedApplication,
} = useApplicationOpenGuard({
  syncDetail: async id => {
    if (applicationId.value === id) await store.loadDetail(id)
  },
})
watch(applicationId, async id => {
  const version = ++detailLoadVersion
  if (!id) return
  activeTab.value = route.query.tab === 'roles' ? 'roles' : 'settings'
  settingsEditing.value = false
  loading.value = true
  try {
    await Promise.all([store.loadTemplates(), store.loadApplication(id)])
    if (version !== detailLoadVersion) return
    await store.loadDetail(id)
  } catch {
    // The shared request layer reports the backend error.
  } finally {
    if (version === detailLoadVersion) loading.value = false
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

const syncCredential = async () => {
  if (!application.value || syncingCredential.value || deleting.value) return
  syncingCredential.value = true
  try {
    await syncBusinessApplicationCredential(application.value.id)
    onlyMessage($t('ProjectApplication.detail.credentialSyncSubmitted'))
  } catch {
    // The shared request layer reports the backend error.
  } finally {
    syncingCredential.value = false
  }
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
  min-width: 0;
  min-height: 0;
}

.detail-page__back.ant-btn {
  height: auto;
  padding: 0;
  color: var(--jet-theme-text-secondary);
}

.detail-page__back.ant-btn:hover,
.detail-page__back.ant-btn:focus {
  color: var(--jet-theme-primary);
  background: transparent;
}

.detail-page__summary { margin-block: var(--space-4); }
.detail-tabs { min-height: 100%; }

/* 与模板详情共用导航布局，仅隐藏原页签头以保留内容的懒挂载和编辑草稿。 */
.detail-tabs :deep(> .ant-tabs-nav) {
  display: none;
}
</style>
