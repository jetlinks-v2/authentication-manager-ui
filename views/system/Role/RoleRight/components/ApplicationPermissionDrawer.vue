<template>
  <JlDrawerShell open :width="960" icon="SafetyCertificateOutlined" :title="$t('RoleRight.index.470525-6')"
    :sub="`${applicationName} · ${role.name}`" @update:open="emit('close')">
    <ApplicationRolePermissions :state="permissions" />
    <template #foot>
      <a-button @click="emit('close')">{{ $t('ProjectApplication.common.cancel') }}</a-button>
      <j-permission-button type="primary" has-permission="system/Role:update"
        :loading="permissions.savingPermissions.value" :disabled="!permissions.initialized.value"
        @click="permissions.savePermissions">{{ $t('ProjectApplication.common.save') }}</j-permission-button>
    </template>
  </JlDrawerShell>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import ApplicationRolePermissions from '@authentication-manager-ui/components/ApplicationRolePermissions/index.vue'
import { useApplicationRolePermissions } from '@authentication-manager-ui/components/ApplicationRolePermissions/useApplicationRolePermissions'
import type { ApplicationRoleScope } from '@authentication-manager-ui/components/ApplicationRolePermissions/useApplicationRolePermissions'
import type { BusinessApplicationRoleEntity } from '@authentication-manager-ui/api/application-center/businessApplication'

const props = defineProps({
  scope: { type: Object as PropType<ApplicationRoleScope>, required: true },
  role: { type: Object as PropType<BusinessApplicationRoleEntity>, required: true },
  applicationName: { type: String, required: true },
})
const emit = defineEmits<{ close: [] }>()
const permissions = useApplicationRolePermissions(() => ({ scope: props.scope, role: props.role }))
</script>
