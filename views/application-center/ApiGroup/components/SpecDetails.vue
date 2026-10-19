<template>
  <a-popover :title="$t('ApiGroupManagement.spec.details')" trigger="click" placement="left">
    <template #content>
      <a-descriptions :column="1" size="small" class="spec-details">
        <a-descriptions-item :label="$t('ApiGroupManagement.spec.id')"><a-typography-text copyable :content="spec.id">{{ spec.id }}</a-typography-text></a-descriptions-item>
        <a-descriptions-item :label="$t('ApiGroupManagement.spec.permissionId')">{{ spec.permissionId || '-' }}</a-descriptions-item>
        <a-descriptions-item :label="$t('ApiGroupManagement.spec.actions')">{{ spec.actions?.join(', ') || '-' }}</a-descriptions-item>
      </a-descriptions>
      <a-tag v-if="!validSpecPermission(spec)" color="warning">{{ $t('ApiGroupManagement.spec.noPermissionMapping') }}</a-tag>
    </template>
    <a-button type="link" size="small">{{ $t('ApiGroupManagement.spec.details') }}</a-button>
  </a-popover>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { RawOpenApiSpec } from '@authentication-manager-ui/api/application-center/apiGroupManagement'
import { validSpecPermission } from '../groupUtils'
defineProps<{ spec: RawOpenApiSpec }>()
const { t: $t } = useI18n()
</script>
<style scoped>
.spec-details { max-width: min(460px, 70vw); overflow-wrap: anywhere; }
</style>
