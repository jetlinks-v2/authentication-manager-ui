<template>
  <header class="template-summary">
    <button
      type="button"
      class="template-summary__icon-button"
      :disabled="!canUpdate || saving || !detail.id"
      :title="canUpdate ? $t('ApplicationTemplate.field.editIcon') : displayName"
      @click="$emit('edit-icon')"
    >
      <AIconValueView :value="detail.icon" :size="56" :border-radius="12" :fallback-text="displayName" />
    </button>
    <div class="template-summary__main">
      <div class="template-summary__identity">
        <h1>{{ displayName }}</h1>
        <a-tag :color="state === 'enabled' ? 'success' : 'default'" class="template-summary__state">
          <span class="template-summary__status-dot" />
          {{ state === 'enabled' ? $t('ApplicationTemplate.common.enabled') : $t('ApplicationTemplate.common.disabled') }}
        </a-tag>
        <span class="template-summary__id">{{ $t('ApplicationTemplate.field.id') }}: {{ detail.id || emptyText }}</span>
      </div>
      <div class="template-summary__meta">
        <span class="template-summary__meta-item">
          <AIcon type="AppstoreOutlined" />
          <span>{{ $t('ProjectApplication.create.applicationKind') }}: {{ applicationKind }}</span>
        </span>
        <span class="template-summary__meta-item">
          <AIcon type="TagOutlined" />
          <span>{{ $t('ApplicationTemplate.field.code') }}:</span>
          <code>{{ detail.code || emptyText }}</code>
        </span>
      </div>
      <div class="template-summary__description">
        <AIcon type="FileTextOutlined" />
        <span class="template-summary__description-label">{{ $t('ApplicationTemplate.field.description') }}:</span>
        <span class="template-summary__description-value">{{ displayDescription || emptyText }}</span>
      </div>
    </div>
    <PageActions v-if="canUpdate" class="template-summary__actions">
      <a-button type="primary" ghost :disabled="saving || !detail.id" @click="$emit('edit')">
        <template #icon><AIcon type="EditOutlined" /></template>
        {{ $t('ApplicationTemplate.common.edit') }}
      </a-button>
      <a-popconfirm
        :title="$t('ApplicationTemplate.message.confirmChangeStatus', [stateActionText])"
        :disabled="saving || !detail.id"
        @confirm="$emit('toggle-state')"
      >
        <a-button :danger="state === 'enabled'" :disabled="!detail.id" :loading="saving">
          <template #icon><AIcon :type="state === 'enabled' ? 'StopOutlined' : 'PlayCircleOutlined'" /></template>
          {{ stateActionText }}
        </a-button>
      </a-popconfirm>
    </PageActions>
  </header>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { IconValueView as AIconValueView } from '@jetlinks-web-core/components/IconValue'
import type { BusinessApplicationTemplate } from '@authentication-manager-ui/api/application-center/applicationTemplate'

const props = defineProps({
  detail: { type: Object as PropType<BusinessApplicationTemplate>, required: true },
  state: { type: String, default: 'enabled' },
  canUpdate: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
})
defineEmits<{ (event: 'edit'): void; (event: 'edit-icon'): void; (event: 'toggle-state'): void }>()
const { t: $t } = useI18n()
const emptyText = computed(() => $t('Basis.Config.notConfigured'))
const displayName = computed(() => props.detail.i18nName || props.detail.name || props.detail.code || props.detail.id || emptyText.value)
const displayDescription = computed(() => props.detail.i18nDescription || props.detail.description || '')
const applicationKind = computed(() => $t(props.detail.provider === 'third-party'
  ? 'ProjectApplication.create.thirdPartyApplication' : 'ProjectApplication.create.businessApplication'))
const stateActionText = computed(() => $t(props.state === 'enabled'
  ? 'ApplicationTemplate.common.disable' : 'ApplicationTemplate.common.enable'))
</script>

<style scoped>
.template-summary { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: var(--space-4); min-width: 0; }
.template-summary__icon-button { display: inline-flex; align-self: center; padding: 0; border: 0; border-radius: var(--r-3); background: transparent; cursor: pointer; }
.template-summary__icon-button:disabled { cursor: default; }
.template-summary__icon-button:focus-visible { outline: 2px solid var(--jet-theme-primary); outline-offset: 2px; }
.template-summary__main { display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; }
.template-summary__identity { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2); min-width: 0; }
.template-summary__identity h1 { min-width: 0; margin: 0; color: var(--ink-1); font-size: var(--fs-18); font-weight: 650; line-height: 1.5; overflow-wrap: anywhere; }
.template-summary__state { display: inline-flex; align-items: center; gap: var(--space-1); margin: 0; }
.template-summary__status-dot { width: 0.375rem; height: 0.375rem; border-radius: 50%; background: currentColor; }
.template-summary__id { color: var(--ink-4); font-size: var(--fs-12); overflow-wrap: anywhere; }
.template-summary__meta { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); color: var(--ink-2); font-size: var(--fs-12); }
.template-summary__meta-item { display: inline-flex; align-items: center; gap: var(--space-1); min-width: 0; max-width: 100%; overflow-wrap: anywhere; }
.template-summary__meta-item > .anticon, .template-summary__description > .anticon { flex: none; color: var(--ink-3); }
.template-summary__meta code { min-width: 0; padding: 0 var(--space-2); border-radius: var(--r-1); background: var(--jet-theme-bg-layout); color: var(--ink-3); overflow-wrap: anywhere; }
.template-summary__description { display: flex; align-items: flex-start; gap: var(--space-1); min-width: 0; color: var(--ink-2); font-size: var(--fs-12); line-height: 1.6; }
.template-summary__description > .anticon { margin-block-start: 0.25em; }
.template-summary__description-label { flex: none; }
.template-summary__description-value { min-width: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.template-summary__actions { justify-content: flex-end; }
@media (max-width: 48rem) {
  .template-summary { grid-template-columns: auto minmax(0, 1fr); gap: var(--space-3); }
  .template-summary__actions { grid-column: 2; }
}
</style>
