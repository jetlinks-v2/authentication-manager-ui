<template>
  <section class="template-menu-config">
    <header class="template-menu-config__header">
      <div>
        <h2>{{ $t('ApplicationTemplate.config.title') }}</h2>
        <p>{{ $t('ApplicationTemplate.config.tip') }}</p>
      </div>
    </header>

    <a-alert
      v-if="missingMenuIds.length"
      type="warning"
      show-icon
      :message="$t('ApplicationTemplate.config.missingMenus', { count: missingMenuIds.length })"
      :description="missingMenuIds.join(', ')"
    />

    <a-spin :spinning="loadingEditor" class="template-menu-config__spin">
      <MenuAssetPermissionEditor
        :context="editor"
        :readonly="!canUpdate"
        :owner-labels="ownerLabels"
        height="min(62vh, 42rem)"
      >
        <template #asset-title-extra="{ asset }">
          <a-select
            class="template-menu-config__scope-strategy"
            size="small"
            :value="scopeStrategies[asset.assetType] || defaultScopeStrategy"
            :options="scopeStrategyOptions"
            :disabled="!canUpdate || !scopeStrategyOptions.length"
            :placeholder="$t('ApplicationTemplate.config.scopeStrategyPlaceholder')"
            @update:value="$emit('set-scope-strategy', asset.assetType, $event)"
          />
        </template>
      </MenuAssetPermissionEditor>
    </a-spin>

    <div v-if="canUpdate" class="template-menu-config__actions">
      <a-button
        type="primary"
        :loading="saving"
        :disabled="!initialized || !!missingMenuIds.length"
        @click="$emit('save')"
      >
        {{ $t('ApplicationTemplate.config.save') }}
      </a-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { MenuAssetPermissionEditor } from '@jetlinks-web-core/components'
import type { MenuAssetPermissionEditorContext } from '@jetlinks-web-core/hooks'

defineProps({
  canUpdate: { type: Boolean, default: false },
  scopeStrategyOptions: { type: Array as PropType<Array<{ label: string; value: string; disabled?: boolean }>>, default: () => [] },
  scopeStrategies: { type: Object as PropType<Record<string, string>>, default: () => ({}) },
  defaultScopeStrategy: { type: String, default: 'IGNORE' },
  missingMenuIds: { type: Array as PropType<string[]>, default: () => [] },
  editor: { type: Object as PropType<MenuAssetPermissionEditorContext>, required: true },
  loadingEditor: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  initialized: { type: Boolean, default: false },
})

defineEmits<{
  (event: 'set-scope-strategy', assetType: string, strategy?: string): void
  (event: 'save'): void
}>()

const { t: $t } = useI18n()
const ownerLabels = computed(() => ({
  iot: $t('ApplicationTemplate.config.menuOwnerIot'),
  cloud: $t('ApplicationTemplate.config.menuOwnerCloud'),
  default: $t('ApplicationTemplate.config.menuOwnerDefault'),
}))
</script>

<style scoped>
.template-menu-config { display: flex; flex-direction: column; gap: var(--space-4); }
.template-menu-config__header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4); }
.template-menu-config__header h2 { margin: 0; color: var(--ink-1); font-size: var(--fs-16); }
.template-menu-config__header p { margin: var(--space-1) 0 0; color: var(--ink-3); line-height: 1.6; }
.template-menu-config__scope-strategy { width: 9rem; }
.template-menu-config__spin { min-height: 24rem; }
.template-menu-config__spin :deep(.ant-spin-container) { height: 100%; }
.template-menu-config__actions { display: flex; justify-content: flex-end; }
@media (max-width: 48rem) {
  .template-menu-config__header { flex-direction: column; }
}
</style>
