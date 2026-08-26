<template>
  <section class="application-summary">
    <div class="summary-back">
      <a-tooltip :title="$t('ProjectApplication.list.title')">
        <a-button
          type="text"
          shape="circle"
          :aria-label="$t('ProjectApplication.list.title')"
          @click="emits('back')"
        >
          <template #icon><AIcon type="ArrowLeftOutlined" /></template>
        </a-button>
      </a-tooltip>
    </div>

    <div class="summary-icon">
      <img v-if="data.application.icon" :src="data.application.icon" :alt="data.application.name" />
      <img v-else-if="isImageIcon(data.template.icon)" :src="data.template.icon" :alt="data.template.name" />
      <AIcon v-else :type="data.template.icon || 'AppstoreOutlined'" />
    </div>

    <div class="summary-main">
      <div class="identity-row">
        <h1>{{ data.application.name }}</h1>
        <MetaChip :tone="data.application.status === 'enabled' ? 'ok' : 'default'">
          {{ data.application.statusText }}
        </MetaChip>
        <AppTag>{{ data.template.name }}</AppTag>
      </div>
      <p class="summary-description">{{ data.application.description || data.template.description || "--" }}</p>
      <div class="meta-row">
        <span><AIcon type="ClockCircleOutlined" />{{ $t('ProjectApplication.list.createdAt', { time: data.application.createdAt }) }}</span>
      </div>
    </div>

    <div class="summary-actions">
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
  </section>
</template>

<script setup lang="ts" name="ProjectApplicationSummary">
import type { PropType } from 'vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
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
  back: []
  'cancel-settings': []
  delete: []
  'edit-settings': []
  'toggle-status': []
  'save-settings': []
  open: []
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

const isImageIcon = (icon?: string) => !!icon && (/^(https?:|data:|\/)/.test(icon) || icon.includes('.'))
</script>

<style scoped>
.application-summary {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--line);
  border-radius: var(--r-3);
}

.summary-back {
  display: flex;
  align-items: center;
}

.summary-back :deep(.ant-btn) {
  color: var(--ink-2);
}

.summary-icon {
  display: grid;
  width: var(--space-11);
  height: var(--space-11);
  place-items: center;
  flex: none;
  overflow: hidden;
  border-radius: var(--r-3);
  color: var(--accent);
  font-size: var(--fs-20);
}

.summary-icon img { width: 100%; height: 100%; object-fit: cover; }
.summary-main { display: flex; min-width: 0; flex-direction: column; gap: var(--space-1); }
.identity-row { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2); }
.identity-row h1 { min-width: 0; margin: 0; color: var(--ink-1); font-size: var(--fs-20); font-weight: 600; }
.summary-description { max-width: 44rem; margin: 0; overflow: hidden; color: var(--ink-2); line-height: 1.6; text-overflow: ellipsis; white-space: nowrap; }

.meta-row { display: flex; flex-wrap: wrap; gap: var(--space-3); color: var(--ink-4); font-size: var(--fs-12); }
.meta-row span { display: inline-flex; align-items: center; gap: var(--space-1); }
.summary-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding-left: var(--space-3);
  border-left: 1px solid var(--line);
}

.summary-settings-actions {
  display: flex;
  align-items: center;
}

@media (max-width: 48rem) {
  .application-summary {
    grid-template-columns: auto auto minmax(0, 1fr);
    padding: var(--space-3);
  }

  .summary-actions {
    grid-column: 1 / -1;
    padding-left: 0;
    border-left: 0;
  }
}
</style>
