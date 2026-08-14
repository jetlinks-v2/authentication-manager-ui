<template>
  <div class="role-workspace">
    <header class="role-heading">
      <div>
        <h2>{{ $t('ProjectApplication.role.title') }}</h2>
        <p>{{ $t('ProjectApplication.role.subtitle') }}</p>
      </div>
      <a-button type="primary" @click="openRole()">
        <template #icon><AIcon type="PlusOutlined" /></template>
        {{ $t('ProjectApplication.role.add') }}
      </a-button>
    </header>

    <div v-if="roles.length" class="role-layout">
      <aside class="role-sidebar">
        <strong class="sidebar-title">{{ $t('ProjectApplication.role.list') }}</strong>
        <button
          v-for="role in roles"
          :key="role.id"
          type="button"
          class="role-item"
          :class="{ active: role.id === activeRoleId }"
          @click="activeRoleId = role.id"
        >
          <span class="role-name"><strong>{{ role.name }}</strong></span>
          <span class="role-description">{{ role.description || '--' }}</span>
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
        </button>
      </aside>

      <main v-if="activeRole" class="permission-panel">
        <div class="permission-heading">
          <div>
            <h3>{{ activeRole.name }}</h3>
            <p>{{ activeRole.description || '--' }}</p>
          </div>
          <a-button type="primary" :loading="savingPermissions" :disabled="!initialized" @click="savePermissions">
            <template #icon><AIcon type="SaveOutlined" /></template>
            {{ $t('ProjectApplication.common.save') }}
          </a-button>
        </div>
        <a-spin :spinning="permissionLoading">
          <MenuAssetPermissionEditor
            :context="editor"
            :columns="columns"
            :show-asset-permissions="isNoCommunity"
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
import type { PropType } from 'vue'
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { MenuAssetPermissionEditor } from '@jetlinks-web-core/components'
import { useMenuAssetPermissionEditor } from '@jetlinks-web-core/hooks'
import type { AssetTypeName, MenuPermissionNode } from '@jetlinks-web-core/hooks'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { isNoCommunity } from '@jetlinks-web-core/utils/utils'
import {
  getPermissionDetail_api as getRolePermissionDetail,
  updatePermissionTree_api as saveRolePermission,
} from '@authentication-manager-ui/api/system/role'
import { getAssetsType as queryAssetTypes } from '@authentication-manager-ui/api/system/menu'
import { getApplicationTemplateMenus } from '@authentication-manager-ui/api/application-center/applicationTemplate'
import {
  filterMenuTreeByRuntimeCodes,
  normalizeAssetTypeNames,
  normalizeCandidateMenus,
  normalizeGrantedMenus,
  unwrapResult,
} from '../../../Template/Save/menu-config.shared'
import type { ApplicationRole, ApplicationRoleDraft } from '../../types'

interface GrantDetail {
  menus?: MenuPermissionNode[]
  assetAccesses?: Array<{ assetType: string; accesses: Array<{ supportId: string; [key: string]: unknown }> }>
}

const props = defineProps({
  roles: { type: Array as PropType<ApplicationRole[]>, default: () => [] },
  templateId: { type: String, default: '' },
})
const emits = defineEmits(['save-role', 'delete-role'])
const { t: $t } = useI18n()
const menuStore = useMenuStore()
const activeRoleId = ref('')
const roleModalOpen = ref(false)
const editingRoleId = ref<string>()
const formRef = ref()
const form = reactive<ApplicationRoleDraft>({ name: '', description: '' })
const permissionLoading = ref(false)
const savingPermissions = ref(false)
const initialized = ref(false)
const editor = useMenuAssetPermissionEditor({ defaultSupportIds: ['creator'] })

const activeRole = computed(() => props.roles.find(item => item.id === activeRoleId.value))
const columns = computed(() => [
  { title: $t('ProjectApplication.role.menu'), dataIndex: 'menu', key: 'menu', width: '38%' },
  { title: $t('ProjectApplication.role.operationPermissions'), dataIndex: 'action', key: 'action' },
])
const rules = computed(() => ({ name: [{ required: true, message: $t('ProjectApplication.role.nameRequired') }] }))
let loadSequence = 0

const clearPermissions = () => {
  initialized.value = false
  permissionLoading.value = false
  editor.reset({ menus: [], assetTypes: [] })
}

const assertSuccess = <T,>(response: any, fallback: T): T => {
  if (response?.success === false) throw new Error(response.message)
  return unwrapResult(response, fallback)
}

const loadAssetTypes = async (): Promise<AssetTypeName[]> => {
  if (!isNoCommunity) return []
  const response = await queryAssetTypes()
  if (response?.success === false) throw new Error(response.message)
  return normalizeAssetTypeNames(response)
}

const loadPermissions = async () => {
  const sequence = ++loadSequence
  if (!activeRoleId.value || !props.templateId || !menuStore.initialized) {
    clearPermissions()
    return
  }
  initialized.value = false
  permissionLoading.value = true
  try {
    const [templateResponse, detailResponse, assetTypes] = await Promise.all([
      getApplicationTemplateMenus(props.templateId),
      getRolePermissionDetail(activeRoleId.value),
      loadAssetTypes(),
    ])
    if (sequence !== loadSequence) return

    const templateDetail = assertSuccess<GrantDetail>(templateResponse, {})
    const roleDetail = assertSuccess<GrantDetail>(detailResponse, {})
    const filteredTemplateMenus = filterMenuTreeByRuntimeCodes(
      Array.isArray(templateDetail.menus) ? templateDetail.menus : [],
      Array.isArray(menuStore.menuResultCache) ? menuStore.menuResultCache : [],
    )
    const templateMenus = normalizeCandidateMenus(filteredTemplateMenus)
    const roleMenus = normalizeGrantedMenus(Array.isArray(roleDetail.menus) ? roleDetail.menus : [], templateMenus)

    // 应用角色只能在模板与 runtime 已订阅菜单的 code 交集内配置；角色详情只负责勾选回显。
    editor.reset({
      menus: templateMenus,
      grantedMenus: roleMenus,
      assetAccesses: roleDetail.assetAccesses,
      assetTypes,
    })
    initialized.value = true
  } catch {
    if (sequence === loadSequence) clearPermissions()
  } finally {
    if (sequence === loadSequence) permissionLoading.value = false
  }
}

watch(() => props.roles, roles => {
  if (!roles.some(item => item.id === activeRoleId.value)) activeRoleId.value = roles[0]?.id || ''
}, { immediate: true, deep: true })
watch([
  activeRoleId,
  () => props.templateId,
  () => menuStore.initialized,
  () => menuStore.menuResultCache,
], loadPermissions, { immediate: true, deep: true })

const savePermissions = async () => {
  if (!initialized.value || !activeRoleId.value) return
  savingPermissions.value = true
  try {
    await saveRolePermission(activeRoleId.value, editor.getSnapshot())
    onlyMessage($t('ProjectApplication.role.permissionSuccess', { name: activeRole.value?.name || '' }))
  } catch {
    // The shared request layer reports the backend error.
  } finally {
    savingPermissions.value = false
  }
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
.role-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-4); }
.role-heading h2 { margin: 0; color: var(--ink-1); font-size: var(--fs-16); }
.role-heading p { margin: var(--space-1) 0 0; color: var(--ink-3); }
.role-layout { display: grid; grid-template-columns: 17rem minmax(0, 1fr); min-height: 34rem; border: 1px solid var(--line); border-radius: var(--r-3); overflow: hidden; }
.role-sidebar { padding: var(--space-3); border-right: 1px solid var(--line); }
.sidebar-title { display: block; margin-bottom: var(--space-2); }
.role-item { position: relative; display: flex; width: 100%; flex-direction: column; gap: var(--space-1); padding: var(--space-3) 5rem var(--space-3) var(--space-3); border: 0; border-radius: var(--r-2); background: transparent; text-align: left; cursor: pointer; }
.role-item:hover,
.role-item.active { color: var(--ink-1); }
.role-name { color: var(--ink-1); }
.role-description { color: var(--ink-4); font-size: var(--fs-12); line-height: 1.5; }
.role-actions { position: absolute; right: var(--space-1); top: var(--space-2); display: flex; }
.permission-panel { min-width: 0; padding: var(--space-4); overflow: hidden; }
.permission-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-3); }
.permission-heading h3 { margin: 0; color: var(--ink-1); font-size: var(--fs-18); }
.permission-heading p { margin: var(--space-1) 0 0; color: var(--ink-3); }
@media (max-width: 52rem) { .role-layout { grid-template-columns: 1fr; } .role-sidebar { border-right: 0; border-bottom: 1px solid var(--line); } }
</style>
