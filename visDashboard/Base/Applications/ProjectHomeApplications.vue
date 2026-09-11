<template>
  <HomeWidget feature="Applications" :info="info" :is-edit="isEdit">
    <template #default="view">
      <HomeView
        :rows="view.rows"
        :chart="view.chart"
        :can-open="canOpenApp"
        :opening-ids="openingApplicationIds"
        @open="handleOpenApp"
      />
    </template>
    <template #empty>
      <div class="home-app-empty">
        <div class="empty-icon"><AppstoreOutlined /></div>
        <div class="empty-title">{{ t('packages.ProjectHome.ApplicationsEmpty') }}</div>
        <div class="empty-desc">{{ t('packages.ProjectHome.ApplicationsEmptyDesc') }}</div>
        <a-button type="primary" class="empty-btn" @click="handleCreateApp">
          {{ t('packages.ProjectHome.ApplicationsCreate') }}
        </a-button>
      </div>
    </template>
  </HomeWidget>
  <ApplicationRoleSelectModal
    v-model:open="roleSelectOpen"
    :roles="roleSelectRoles"
    :application-name="pendingApplication?.name || ''"
    :confirm-loading="roleBinding"
    @confirm="confirmSelectedRole"
    @cancel="resetRoleSelection"
  />
</template>
<script setup lang="ts">
import { AppstoreOutlined } from '@ant-design/icons-vue'
import { useI18n } from 'vue-i18n'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import HomeWidget from '../shared/HomeWidget.vue'
import HomeView from './components/HomeView.vue'
import type { HomeInfo, HomeRow } from '../shared/types'
import { useApplicationOpenGuard } from '../../../views/application-center/ProjectApplication/useApplicationOpenGuard'
import ApplicationRoleSelectModal from '../../../views/application-center/ProjectApplication/components/ApplicationRoleSelectModal.vue'
import type { ProjectApplication } from '../../../views/application-center/ProjectApplication/types'

const props = withDefaults(defineProps<{ info?: HomeInfo; isEdit?: boolean }>(), { isEdit: false })
const { t } = useI18n()
const menuStore = useMenuStore()

const {
  roleSelectOpen,
  roleSelectRoles,
  pendingApplication,
  openingApplicationIds,
  roleBinding,
  openApplication,
  confirmSelectedRole,
  resetRoleSelection,
} = useApplicationOpenGuard()

const canOpenApp = (row: HomeRow) => {
  if (props.isEdit) return false
  if (openingApplicationIds.value.includes(row.id)) return false
  if (row.application?.status === 'disabled') return false
  return true
}

const handleOpenApp = async (row: HomeRow) => {
  if (props.isEdit) return
  const application: ProjectApplication = row.application || {
    id: row.id,
    name: row.label || row.id,
    templateId: '',
    status: 'enabled',
    statusText: '',
    description: row.description || '',
  }
  await openApplication(application)
}

function handleCreateApp() {
  if (props.isEdit) return
  if (menuStore.getMenu('application-center/ProjectApplication')) {
    menuStore.jumpPage('application-center/ProjectApplication', { query: { action: 'create' } })
  }
}
</script>
<style scoped lang="less">
.home-app-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 4px 8px;
  box-sizing: border-box;
}
.empty-icon {
  font-size: 28px;
  line-height: 1;
  color: #9ca3af;
  margin-bottom: 6px;
}
.empty-title {
  font-size: 13px;
  line-height: 18px;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 2px;
}
.empty-desc {
  font-size: 12px;
  line-height: 16px;
  color: #6b7280;
  max-width: 240px;
  margin-bottom: 10px;
}
.empty-btn {
  border-radius: 6px;
  height: 28px;
  padding: 0 14px;
  font-size: 12px;
}
</style>

