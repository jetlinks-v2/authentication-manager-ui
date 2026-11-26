<template>
  <a-spin :spinning="loading || validating || saving">
    <div class="role-permission-content">
      <a-alert v-if="loadError || scopeChanged" :type="scopeChanged ? 'warning' : 'error'" show-icon
        :message="$t(scopeChanged ? 'Role.globalPermissions.scopeChanged' : 'Role.globalPermissions.loadFailed')">
        <template #action><a-button :loading="loading" @click="load">{{ $t('ProjectApplication.list.retry') }}</a-button></template>
      </a-alert>
      <MenuAssetPermissionEditor
        :context="editor"
        :columns="columns"
        :owner-labels="{ iot: $t('Role.globalPermissions.baseMenus'), app: $t('MenuSetting.owner.app') }"
        :readonly="!canSave || saving"
        :show-asset-permissions="isNoCommunity"
        height="60vh"
      />
    </div>
  </a-spin>
</template>

<script setup lang="ts">
import { MenuAssetPermissionEditor } from '@jetlinks-web-core/components'
import { useGlobalRolePermissions } from './useGlobalRolePermissions'

defineOptions({ name: 'RolePermissionTree' })
withDefaults(defineProps<{ saving?: boolean }>(), { saving: false })
const { editor, columns, loading, validating, loadError, scopeChanged, canSave, load, onSave, isNoCommunity } = useGlobalRolePermissions()
defineExpose({ onSave, load, canSave })
</script>

<style scoped>
.role-permission-content { display: flex; flex-direction: column; gap: var(--space-4); }
</style>
