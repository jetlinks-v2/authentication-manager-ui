<template>
  <div class="spec-identity" :class="{ 'is-unavailable': !spec, 'spec-identity--column': !!part }">
    <div v-if="part !== 'endpoint'" class="spec-name" :title="spec?.summary || spec?.path || id">{{ spec?.summary || spec?.path || $t('ApiGroupManagement.spec.metadataUnavailable') }}</div>
    <div v-if="part !== 'name'" class="spec-endpoint">
      <a-tag v-if="spec?.method" :color="methodColors[spec.method]">{{ spec.method }}</a-tag>
      <code :title="spec?.path || id">{{ spec?.path || id }}</code>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { RawOpenApiSpec } from '@authentication-manager-ui/api/application-center/apiGroupManagement'
defineProps<{ spec?: RawOpenApiSpec; id?: string; part?: 'name' | 'endpoint' }>()
const { t: $t } = useI18n()
const methodColors: Record<string, string> = {
  GET: 'cyan', POST: 'blue', PUT: 'orange', PATCH: 'purple', DELETE: 'red', HEAD: 'geekblue', OPTIONS: 'gold',
}
</script>
<style scoped>
.spec-identity { min-width: 0; }
.spec-name { overflow: hidden; color: var(--ink-1); font-size: var(--fs-14); font-weight: 500; line-height: var(--lh-normal); text-overflow: ellipsis; white-space: nowrap; }
.spec-endpoint { display: flex; min-width: 0; align-items: center; gap: var(--space-2); color: var(--ink-4); font-size: var(--fs-12); line-height: var(--space-5); }
.spec-name + .spec-endpoint { margin-top: var(--space-1); }
.spec-endpoint:only-child { color: var(--ink-2); font-size: var(--fs-14); line-height: var(--lh-normal); }
.spec-endpoint :deep(.ant-tag) { flex: none; margin: 0; padding-inline: var(--space-2); font-size: var(--fs-12); line-height: calc(var(--space-5) - 2px); }
.spec-endpoint code { min-width: 0; overflow: hidden; font-family: inherit; font-size: inherit; text-overflow: ellipsis; white-space: nowrap; }
.spec-identity--column .spec-name, .spec-identity--column .spec-endpoint code { overflow: visible; text-overflow: clip; white-space: normal; overflow-wrap: anywhere; }
.spec-identity--column .spec-endpoint { align-items: flex-start; }
.spec-identity--column .spec-endpoint code { flex: 1; }
.is-unavailable .spec-name { color: var(--ink-4); }
</style>
