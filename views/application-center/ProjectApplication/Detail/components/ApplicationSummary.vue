<template>
  <ContentPanel class="application-summary" fill>
    <AIconValueView
      :value="data.template.icon"
      :size="56"
      :border-radius="12"
      :fallback-text="data.application.name"
    />

    <div class="summary-main">
      <div class="identity-row">
        <h1>{{ data.application.name }}</h1>
        <MetaChip :tone="data.application.status === 'enabled' ? 'ok' : 'default'">
          {{ data.application.statusText }}
        </MetaChip>
        <span v-if="data.application.id" class="summary-id">
          <a-typography-text :copyable="{ text: data.application.id }">
            {{ $t('ProjectApplication.detail.applicationId') }}: {{ data.application.id }}
          </a-typography-text>
        </span>
      </div>
      <div class="meta-row">
        <span><AIcon type="AppstoreOutlined" />{{ data.template.name }}</span>
        <span><AIcon type="ClockCircleOutlined" />{{ $t('ProjectApplication.list.createdAt', { time: data.application.createdAt }) }}</span>
      </div>
      <div class="summary-description-row">
        <AIcon type="FileTextOutlined" />
        <p class="summary-description">{{ data.application.description || data.template.description || $t('comm.table.empty') }}</p>
      </div>
    </div>

    <div class="summary-actions">
      <j-permission-button
        v-if="data.application.provider === 'third-party'"
        hasPermission="application-center/ProjectApplication:update"
        :disabled="deleting || syncingCredential"
        :loading="syncingCredential"
        @click="emits('sync-credential')"
      >
        <template #icon><AIcon type="SyncOutlined" /></template>
        {{ $t('ProjectApplication.detail.syncCredential') }}
      </j-permission-button>
      <div v-if="showSettingsActions" class="summary-settings-actions">
        <a-space v-if="settingsEditing">
          <a-button :disabled="settingsSaving || deleting" @click="emits('cancel-settings')">
            {{ $t('ProjectApplication.common.cancel') }}
          </a-button>
          <a-button
            type="primary"
            :disabled="deleting"
            :loading="settingsSaving"
            @click="emits('save-settings')"
          >
            <template #icon><AIcon type="CheckOutlined" /></template>
            {{ $t('ProjectApplication.common.save') }}
          </a-button>
        </a-space>
        <a-button v-else :disabled="deleting" @click="emits('edit-settings')">
          <template #icon><AIcon type="EditOutlined" /></template>
          {{ $t('ProjectApplication.common.edit') }}
        </a-button>
      </div>
      <a-popconfirm :title="deleteConfirmText" @confirm="emits('delete')">
        <a-button danger :loading="deleting">
          <template #icon><AIcon type="DeleteOutlined" /></template>
          {{ $t('ProjectApplication.common.delete') }}
        </a-button>
      </a-popconfirm>
      <a-popconfirm :title="statusConfirmText" @confirm="emits('toggle-status')">
        <a-button :danger="data.application.status === 'enabled'" :disabled="deleting">
          {{ statusActionText }}
        </a-button>
      </a-popconfirm>
      <a-button type="primary" :disabled="deleting || opening" :loading="opening" @click="emits('open')">
        <template #icon><AIcon type="ExportOutlined" /></template>
        {{ $t('ProjectApplication.detail.open') }}
      </a-button>
    </div>
  </ContentPanel>
</template>

<script setup lang="ts" name="ProjectApplicationSummary">
import type { PropType } from 'vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { IconValueView as AIconValueView } from '@jetlinks-web-core/components/IconValue'
import type { ApplicationTemplate, ProjectApplication } from '../../types'

interface SummaryData {
  application: ProjectApplication
  template: ApplicationTemplate
}

const props = defineProps({
  data: {
    type: Object as PropType<SummaryData>,
    required: true,
  },
  deleting: {
    type: Boolean,
    default: false,
  },
  syncingCredential: {
    type: Boolean,
    default: false,
  },
  settingsEditing: {
    type: Boolean,
    default: false,
  },
  settingsSaving: {
    type: Boolean,
    default: false,
  },
  showSettingsActions: {
    type: Boolean,
    default: false,
  },
  opening: {
    type: Boolean,
    default: false,
  },
})

const emits = defineEmits<{
  'cancel-settings': []
  delete: []
  'edit-settings': []
  'toggle-status': []
  'save-settings': []
  open: []
  'sync-credential': []
}>()
const { t: $t } = useI18n()

const statusActionText = computed(() => $t(props.data.application.status === 'enabled'
  ? 'ProjectApplication.common.disable'
  : 'ProjectApplication.common.enable'))

const statusConfirmText = computed(() => $t('ProjectApplication.detail.statusConfirm', {
  action: statusActionText.value,
  name: props.data.application.name,
}))
const deleteConfirmText = computed(() => $t('ProjectApplication.detail.deleteConfirm', {
  name: props.data.application.name,
}))

</script>

<style scoped>
.application-summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  min-width: 0;
  gap: var(--space-4);
}

.summary-main { display: flex; min-width: 0; flex-direction: column; gap: var(--space-1); }
.identity-row { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2); }
.identity-row h1 { min-width: 0; margin: 0; color: var(--ink-1); font-size: var(--fs-18); font-weight: 600; overflow-wrap: anywhere; }
.summary-description-row { display: flex; align-items: flex-start; gap: var(--space-1); color: var(--ink-3); font-size: var(--fs-12); }
.summary-description-row > .anticon { flex: none; margin-block-start: 0.25em; }
.summary-description { min-width: 0; margin: 0; color: var(--ink-2); line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
.summary-id { min-width: 0; color: var(--ink-4); font-size: var(--fs-12); }
.summary-id :deep(.ant-typography) { color: inherit; font-size: inherit; overflow-wrap: anywhere; }

.meta-row { display: flex; flex-wrap: wrap; gap: var(--space-3); color: var(--ink-4); font-size: var(--fs-12); }
.meta-row span { display: inline-flex; align-items: center; min-width: 0; gap: var(--space-1); overflow-wrap: anywhere; }
.meta-row .anticon { flex: none; }
.summary-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.summary-settings-actions {
  display: flex;
  align-items: center;
}

@media (max-width: 48rem) {
  .application-summary {
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--space-3);
  }

  .summary-actions {
    grid-column: 1 / -1;
  }
}
</style>
