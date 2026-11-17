<template>
  <a-spin :spinning="state.permissionLoading.value || state.savingPermissions.value">
    <a-alert v-if="state.permissionError.value" type="error" show-icon :message="$t('ProjectApplication.role.permissionLoadFailed')">
      <template #action><a-button size="small" @click="state.loadPermissions">{{ $t('ProjectApplication.list.retry') }}</a-button></template>
    </a-alert>
    <MenuAssetPermissionEditor v-else :context="state.editor" :columns="state.columns.value"
      :readonly="!state.initialized.value || state.savingPermissions.value"
      :show-asset-permissions="false" height="32rem" />
  </a-spin>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import { MenuAssetPermissionEditor } from '@jetlinks-web-core/components'
import type { useApplicationRolePermissions } from './useApplicationRolePermissions'

defineProps({ state: { type: Object as PropType<ReturnType<typeof useApplicationRolePermissions>>, required: true } })
</script>
