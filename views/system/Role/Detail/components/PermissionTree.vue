<template>
  <a-spin :spinning="loading || validating || saving">
    <div class="role-permission-content">
      <a-alert v-if="loadError || scopeChanged" :type="scopeChanged ? 'warning' : 'error'" show-icon
        :message="$t(scopeChanged ? 'Role.templates.scopeChanged' : 'Role.templates.loadFailed')">
        <template #action><a-button :loading="loading" @click="load">{{ $t('ProjectApplication.list.retry') }}</a-button></template>
      </a-alert>
      <MenuAssetPermissionEditor
        :context="editor"
        :columns="columns"
        :owner-labels="ownerLabels"
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
const { editor, columns, ownerLabels, loading, validating, loadError, scopeChanged, canSave, load, onSave, isNoCommunity } = useGlobalRolePermissions()
defineExpose({ onSave, load, canSave })
</script>

<style scoped>
.role-permission-content { display: flex; flex-direction: column; gap: var(--space-4); }
</style>
