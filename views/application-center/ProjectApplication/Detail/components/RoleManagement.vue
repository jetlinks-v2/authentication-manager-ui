<template>
  <div class="role-workspace">
    <div v-if="roles.length" class="role-layout" :class="{ 'role-layout--external': scope.isExternal }">
      <aside class="role-sidebar">
        <header class="sidebar-heading">
          <strong>{{ $t('ProjectApplication.role.list') }}</strong>
          <a-button size="small" @click="openRole()">
            <template #icon><AIcon type="PlusOutlined" /></template>
            {{ $t('ProjectApplication.role.add') }}
          </a-button>
        </header>
        <div class="role-list">
          <div
            v-for="role in roles"
            :key="role.id"
            role="button"
            tabindex="0"
            class="role-item"
            :class="{ active: role.id === activeRoleId }"
            @click="activeRoleId = role.id"
            @keydown.enter="activeRoleId = role.id"
            @keydown.space.prevent="activeRoleId = role.id"
          >
            <strong class="role-name">{{ role.name }}</strong>
            <span class="role-count">{{ $t('ProjectApplication.role.memberCount', { count: memberCount(role.id) }) }}</span>
            <span class="role-actions">
              <a-tooltip :title="$t('ProjectApplication.common.edit')">
                <a-button type="text" size="small" @click.prevent.stop="openRole(role)">
                  <AIcon type="EditOutlined" />
                </a-button>
              </a-tooltip>
              <a-popconfirm :title="$t('ProjectApplication.role.deleteConfirm', { name: role.name })" @confirm="emits('delete-role', role)">
                <a-button type="text" danger size="small" @click.prevent.stop>
                  <AIcon type="DeleteOutlined" />
                </a-button>
              </a-popconfirm>
            </span>
          </div>
        </div>
      </aside>

      <main v-if="activeRole && !scope.isExternal" class="permission-panel">
        <div class="permission-heading">
          <div class="permission-title">
            <h3>{{ activeRole.name }}</h3>
            <span>{{ $t('ProjectApplication.role.memberCount', { count: memberCount(activeRole.id) }) }}</span>
          </div>
          <a-button type="primary" :loading="savingPermissions" :disabled="!initialized" @click="savePermissions">
            <template #icon><AIcon type="SaveOutlined" /></template>
            {{ $t('ProjectApplication.common.save') }}
          </a-button>
        </div>
        <a-spin :spinning="permissionLoading">
          <a-alert v-if="permissionError" type="error" show-icon :message="$t('ProjectApplication.role.permissionLoadFailed')">
            <template #action><a-button size="small" @click="loadPermissions">{{ $t('ProjectApplication.list.retry') }}</a-button></template>
          </a-alert>
          <MenuAssetPermissionEditor v-else
            class="permission-editor"
            :context="editor"
            :columns="columns"
            :show-asset-permissions="false"
            height="32rem"
          />
        </a-spin>
      </main>
    </div>
    <CloudEmpty v-else :description="$t('ProjectApplication.role.empty')">
      <a-button type="primary" @click="openRole()">{{ $t('ProjectApplication.role.add') }}</a-button>
    </CloudEmpty>

    <a-modal
      :open="roleModalOpen"
      :title="$t(editingRoleId ? 'ProjectApplication.role.editTitle' : 'ProjectApplication.role.addTitle')"
      :ok-text="$t('ProjectApplication.common.save')"
      :cancel-text="$t('ProjectApplication.common.cancel')"
      @ok="confirmRole"
      @cancel="roleModalOpen = false"
    >
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-form-item :label="$t('ProjectApplication.role.name')" name="name">
          <a-input v-model:value="form.name" :maxlength="32" :placeholder="$t('ProjectApplication.role.namePlaceholder')" />
        </a-form-item>
        <a-form-item :label="$t('ProjectApplication.role.description')" name="description">
          <a-textarea v-model:value="form.description" :maxlength="100" :rows="3" :placeholder="$t('ProjectApplication.role.descriptionPlaceholder')" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts" name="ProjectApplicationRoleManagement">
import { useI18n } from 'vue-i18n'
import { MenuAssetPermissionEditor } from '@jetlinks-web-core/components'
import type { ApplicationRole, ApplicationRoleDraft, ApplicationUser } from '../../types'
import { useApplicationRoleManagement, type ApplicationRoleScope } from './useApplicationRoleManagement'
const props = defineProps<{ roles: ApplicationRole[]; users: ApplicationUser[]; scope: ApplicationRoleScope }>()
const emits = defineEmits<{
  'save-role': [draft: ApplicationRoleDraft, id?: string]
  'delete-role': [role: ApplicationRole]
}>()
const { t: $t } = useI18n()
const { activeRoleId, roleModalOpen, editingRoleId, formRef, form, permissionLoading, permissionError,
  savingPermissions, initialized, editor, activeRole, memberCount, columns, rules, savePermissions,
  openRole, confirmRole, loadPermissions } = useApplicationRoleManagement(props, (draft, id) => emits('save-role', draft, id))
</script>

<style scoped>
.role-workspace { padding-top: var(--space-2); }
.role-layout { display: grid; grid-template-columns: 14rem minmax(0, 1fr); gap: var(--space-3); min-height: 35.5rem; align-items: stretch; }
.role-layout--external { grid-template-columns: minmax(0, 1fr); min-height: 0; }
.role-sidebar,
.permission-panel { min-width: 0; border: 1px solid var(--line); border-radius: var(--r-3); background: var(--bg); overflow: hidden; }
.role-sidebar { display: flex; min-height: 0; flex-direction: column; }
.sidebar-heading { min-height: 3rem; padding: 0 var(--space-3); display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); border-bottom: 1px solid var(--line); }
.role-list { flex: 1; min-height: 0; padding: var(--space-2); overflow-y: auto; }
.role-item { position: relative; display: flex; min-height: 2.5rem; align-items: center; justify-content: space-between; gap: var(--space-2); padding: 0 var(--space-3); border-radius: var(--r-2); color: var(--ink-1); cursor: pointer; outline: none; }
.role-item:hover { background: var(--bg-hover); }
.role-item.active { background: var(--accent-soft); }
.role-item:focus-visible { box-shadow: 0 0 0 2px var(--accent-soft); }
.role-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.role-count { flex-shrink: 0; color: var(--ink-3); font-size: var(--fs-12); }
.role-actions { display: none; align-items: center; margin-right: calc(var(--space-2) * -1); }
.role-item:hover .role-count,
.role-item:focus-within .role-count { display: none; }
.role-item:hover .role-actions,
.role-item:focus-within .role-actions { display: flex; }
.permission-panel { display: flex; flex-direction: column; }
.permission-heading { min-height: 3.5rem; padding: 0 var(--space-4); display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); border-bottom: 1px solid var(--line); }
.permission-title { display: flex; min-width: 0; align-items: baseline; gap: var(--space-2); }
.permission-title h3 { margin: 0; color: var(--ink-1); font-size: var(--fs-15); }
.permission-title span { color: var(--ink-3); font-size: var(--fs-12); }
.permission-editor { flex: 1; min-height: 0; }
.permission-panel :deep(.equal-height-columns) { gap: 0; }
.permission-panel :deep(.permission-pane) { border: 0; border-radius: 0; }
.permission-panel :deep(.equal-height-columns__pane + .equal-height-columns__pane) { border-left: 1px solid var(--line); }
@media (max-width: 64rem) { .role-layout { grid-template-columns: 1fr; } .role-sidebar { max-height: 18rem; } }
</style>
