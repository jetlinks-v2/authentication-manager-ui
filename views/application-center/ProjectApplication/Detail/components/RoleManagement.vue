<template>
  <div class="role-workspace">
    <header class="role-heading">
      <h2>{{ $t('ProjectApplication.role.title') }}</h2>
      <p>{{ $t('ProjectApplication.role.subtitle') }}</p>
    </header>

    <div class="role-layout">
      <aside class="role-sidebar">
        <div class="sidebar-heading">
          <strong>{{ $t('ProjectApplication.role.list') }}</strong>
          <a-button type="link" size="small" @click="openRole()">
            <AIcon type="PlusOutlined" />{{ $t('ProjectApplication.role.add') }}
          </a-button>
        </div>
        <button
          v-for="role in data.roles"
          :key="role.id"
          type="button"
          class="role-item"
          :class="{ active: role.id === activeRoleId }"
          @click="activeRoleId = role.id"
        >
          <span class="role-name">
            <strong>{{ role.name }}</strong>
            <MetaChip v-if="role.builtIn">{{ $t('ProjectApplication.role.builtIn') }}</MetaChip>
          </span>
          <span class="role-description">{{ role.description }}</span>
          <a-button type="text" size="small" class="role-edit" @click.prevent.stop="openRole(role)">
            <AIcon type="EditOutlined" />
          </a-button>
        </button>
      </aside>

      <main v-if="activeRole" class="permission-panel">
        <div class="permission-heading">
          <div>
            <h3>{{ activeRole.name }}</h3>
            <MetaChip>{{ $t(activeRole.builtIn ? 'ProjectApplication.role.builtInRole' : 'ProjectApplication.role.customRole') }}</MetaChip>
            <p>{{ activeRole.description }}</p>
          </div>
        </div>

        <div class="permission-title">
          <strong>{{ $t('ProjectApplication.role.menuPermissions') }}</strong>
          <span>{{ $t('ProjectApplication.role.authorized', permissionSummary) }}</span>
        </div>
        <div class="permission-columns">
          <strong>{{ $t('ProjectApplication.role.menu') }}</strong>
          <span>{{ $t('ProjectApplication.role.view') }}</span>
          <span>{{ $t('ProjectApplication.role.edit') }}</span>
          <span>{{ $t('ProjectApplication.role.delete') }}</span>
        </div>
        <a-tree :tree-data="treeData" default-expand-all block-node :selectable="false">
          <template #title="node">
            <div class="permission-row">
              <span>{{ node.title }}</span>
              <a-checkbox :checked="isChecked(String(node.key), 'view')" @change="togglePermission(String(node.key), 'view', $event.target.checked)" />
              <a-checkbox :checked="isChecked(String(node.key), 'edit')" @change="togglePermission(String(node.key), 'edit', $event.target.checked)" />
              <a-checkbox :checked="isChecked(String(node.key), 'delete')" @change="togglePermission(String(node.key), 'delete', $event.target.checked)" />
            </div>
          </template>
        </a-tree>
      </main>
    </div>

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
import type { PropType } from 'vue'
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
  ApplicationRole,
  ApplicationRoleDraft,
  MenuPermissionNode,
  PermissionAction,
} from '../../types'

interface RoleManagementData {
  roles: ApplicationRole[]
  permissionTree: MenuPermissionNode[]
}

interface PermissionTreeItem {
  key: string
  title: string
  children?: PermissionTreeItem[]
}

const props = defineProps({
  data: {
    type: Object as PropType<RoleManagementData>,
    required: true,
  },
})

const emits = defineEmits(['save-role', 'update-permissions'])
const { t: $t } = useI18n()
const activeRoleId = ref('')
const roleModalOpen = ref(false)
const editingRoleId = ref<string>()
const formRef = ref()
const form = reactive<ApplicationRoleDraft>({ name: '', description: '' })

watch(() => props.data.roles, (roles) => {
  if (!roles.some((item) => item.id === activeRoleId.value)) activeRoleId.value = roles[0]?.id || ''
}, { immediate: true, deep: true })

const activeRole = computed(() => props.data.roles.find((item) => item.id === activeRoleId.value))
const treeData = computed(() => props.data.permissionTree.map(mapTreeNode))
const rules = computed(() => ({ name: [{ required: true, message: $t('ProjectApplication.role.nameRequired') }] }))

const permissionSummary = computed(() => {
  const permissions = activeRole.value?.permissions || {}
  return {
    menus: Object.values(permissions).filter((actions) => actions.length).length,
    permissions: Object.values(permissions).reduce((total, actions) => total + actions.length, 0),
  }
})

function mapTreeNode(node: MenuPermissionNode): PermissionTreeItem {
  return {
    key: node.key,
    title: $t(node.titleKey),
    children: node.children?.map(mapTreeNode),
  }
}

const isChecked = (key: string, action: PermissionAction) => activeRole.value?.permissions[key]?.includes(action) || false

const togglePermission = (key: string, action: PermissionAction, checked: boolean) => {
  if (!activeRole.value) return
  const permissions = Object.fromEntries(Object.entries(activeRole.value.permissions).map(([menuKey, actions]) => [menuKey, [...actions]]))
  const actions = permissions[key] || []
  permissions[key] = checked ? [...new Set([...actions, action])] : actions.filter((item) => item !== action)
  emits('update-permissions', activeRole.value.id, permissions)
}

const openRole = (role?: ApplicationRole) => {
  editingRoleId.value = role?.id
  Object.assign(form, { name: role?.name || '', description: role?.description || '' })
  roleModalOpen.value = true
}

const confirmRole = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  emits('save-role', { ...form }, editingRoleId.value)
  roleModalOpen.value = false
}
</script>

<style scoped>
.role-heading { margin-bottom: var(--space-4); }
.role-heading h2 { margin: 0; color: var(--ink-1); font-size: var(--fs-16); }
.role-heading p { margin: var(--space-1) 0 0; color: var(--ink-3); }
.role-layout { display: grid; grid-template-columns: 17rem minmax(0, 1fr); min-height: 34rem; border: 1px solid var(--line); border-radius: var(--r-3); background: var(--bg); overflow: hidden; }
.role-sidebar { padding: var(--space-3); border-right: 1px solid var(--line); background: var(--bg-sunken); }
.sidebar-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-2); }
.role-item { position: relative; display: flex; width: 100%; flex-direction: column; gap: var(--space-1); padding: var(--space-3); border: 0; border-radius: var(--r-2); background: transparent; text-align: left; cursor: pointer; }
.role-item:hover,
.role-item.active { background: var(--bg); }
.role-name { display: flex; align-items: center; gap: var(--space-2); color: var(--ink-1); }
.role-description { padding-right: var(--space-5); color: var(--ink-4); font-size: var(--fs-12); line-height: 1.5; }
.role-edit { position: absolute; right: var(--space-1); top: var(--space-2); }
.permission-panel { min-width: 0; padding: var(--space-4); overflow-x: auto; }
.permission-heading h3 { display: inline; margin: 0 var(--space-2) 0 0; color: var(--ink-1); font-size: var(--fs-18); }
.permission-heading p { margin: var(--space-2) 0 var(--space-4); color: var(--ink-3); }
.permission-title { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-2); }
.permission-title span { color: var(--ink-4); font-size: var(--fs-12); }
.permission-columns,
.permission-row { display: grid; min-width: 36rem; grid-template-columns: minmax(16rem, 1fr) repeat(3, 5rem); align-items: center; gap: var(--space-2); }
.permission-columns { padding: var(--space-2) var(--space-3); background: var(--bg-sunken); color: var(--ink-3); font-size: var(--fs-12); }
.permission-columns span { text-align: center; }
.permission-row { padding: var(--space-2) 0; }
.permission-row :deep(.ant-checkbox-wrapper) { justify-self: center; }
@media (max-width: 52rem) { .role-layout { grid-template-columns: 1fr; } .role-sidebar { border-right: 0; border-bottom: 1px solid var(--line); } }
</style>
