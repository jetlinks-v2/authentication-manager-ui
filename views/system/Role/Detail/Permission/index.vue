<template>
  <div class="role-permiss-container">
    <div class="card">
      <a-flex align="center" gap="small">
        <TitleComponent :data="$t('Permission.index.071527-0')" />
        <DocumentHelp code="system/Role" help-key="permissions.scope" />
      </a-flex>
      <a-alert v-if="application?.scope.isExternal" type="info" show-icon :message="$t('Role.application.externalPermissions')" />
      <ApplicationRolePermissions v-else-if="application" :state="permissions" :show-asset-permissions="isNoCommunity" height="60vh" />
      <PermissionTree v-else ref="permissionTreeRef" :saving="loading" />
      <div class="role-bottom">
        <a-button @click="goBack">
          {{ $t('Api.index.558884-1') }}
        </a-button>
        <a-button
            type="primary"
            :loading="loading"
            :disabled="!canSave"
            @click="clickSave"
        >{{ $t('Permission.index.071527-1') }}</a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DocumentHelp from '@jetlinks-web-core/components/DocumentHelp'
import PermissionTree from '../components/PermissionTree.vue'
import ApplicationRolePermissions from '@authentication-manager-ui/components/ApplicationRolePermissions/index.vue'
import type { PropType } from 'vue'
import type { ApplicationRoleDetail } from '../useRoleDetail'
import { useRolePermission } from './useRolePermission'

defineOptions({ name: 'RolePermission' })

const props = defineProps({ application: { type: Object as PropType<ApplicationRoleDetail>, default: undefined } })
const { permissionTreeRef, permissions, loading, canSave, clickSave, isNoCommunity, goBack } = useRolePermission(props)
</script>

<style lang="less" scoped>
.role-permiss-container {
  .card {
    margin-bottom: 1.5rem;

    h5 {
      position: relative;
      display: flex;
      align-items: center;
      margin-bottom: 1.25rem;
      padding: 0.25rem 0 0.25rem 0.75rem;
      font-weight: bold;
      font-size: var(--fs-16);

      &::before {
        position: absolute;
        top: 0.4375rem;
        left: 0;
        width: 0.25rem;
        height: calc(100% - 0.875rem);
        background-color: var(--jet-theme-primary, #1677FF);
        border-radius: 0.125rem;
        content: ' ';
      }
    }

    .basic-form {
      :deep(.ant-form-item-required) {
        padding-right: 0.75rem;

        &::before {
          right: 0;
        }
      }
      .ant-form-item {
        display: block;
        width: 60%;
      }
    }
  }

  .role-bottom {
    margin-top: var(--space-4);
    display: flex;
    justify-content: space-between;
  }
}
</style>
