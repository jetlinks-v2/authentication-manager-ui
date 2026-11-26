<template>
  <a-spin :spinning="state.permissionLoading.value || state.savingPermissions.value">
    <a-alert v-if="state.menuSaveWarning.value" type="warning" show-icon :message="$t(`ProjectApplication.role.${state.menuSaveWarning.value}`)" />
    <a-alert v-if="state.refreshError.value" type="warning" show-icon :message="$t('ProjectApplication.role.scopeRefreshFailed')" />
    <a-alert v-if="state.initialized.value && state.blockedMenuNames.value.length" type="warning" show-icon
      :message="$t('ProjectApplication.role.noCommonAssetScope', { menus: state.blockedMenuNames.value.join('、') })" />
    <a-alert v-if="state.permissionError.value" type="error" show-icon :message="$t('ProjectApplication.role.permissionLoadFailed')">
      <template #action><a-button size="small" @click="state.loadPermissions">{{ $t('ProjectApplication.list.retry') }}</a-button></template>
    </a-alert>
    <MenuAssetPermissionEditor v-else :context="state.editor" :columns="state.columns.value"
      :readonly="!state.initialized.value || state.savingPermissions.value"
      :show-asset-permissions="showAssetPermissions" :show-asset-batch="false" :height="height">
      <template #asset-header-extra>{{ $t('Role.application.inheritedDataPermissions') }}</template>
      <template #asset-control="{ asset }">
        <template v-if="state.inheritedAssetOptions.value[asset.assetType]?.length">
          <a-radio v-for="access in state.inheritedAssetOptions.value[asset.assetType]"
            :key="access.value" checked disabled>
            {{ access.label }}
          </a-radio>
        </template>
        <span v-else>{{ $t('comm.table.empty') }}</span>
      </template>
    </MenuAssetPermissionEditor>
  </a-spin>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import { MenuAssetPermissionEditor } from '@jetlinks-web-core/components'
import type { useApplicationRolePermissions } from './useApplicationRolePermissions'

defineProps({
  state: { type: Object as PropType<ReturnType<typeof useApplicationRolePermissions>>, required: true },
  showAssetPermissions: { type: Boolean, default: false },
  height: { type: String, default: '32rem' },
})
</script>
