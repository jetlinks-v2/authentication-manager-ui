<template>
  <span class="role-field-label">
    {{ $t('components.EditUserDialog.939453-12') }}
    <DocumentHelp code="system/User" help-key="roles.application" />
  </span>
</template>

<script setup lang="ts">
import DocumentHelp from '@jetlinks-web-core/components/DocumentHelp'
</script>

<style scoped>
.role-field-label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  height: 1lh;
}
</style>
