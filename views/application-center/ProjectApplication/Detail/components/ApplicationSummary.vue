<template>
  <ContentPanel class="application-summary" fill>
    <DetailHeader variant="summary" :title="data.application.name">
      <template #icon>
      <img v-if="data.application.icon" :src="data.application.icon" :alt="data.application.name" />
      <img v-else-if="isImageIcon(data.template.icon)" :src="data.template.icon" :alt="data.template.name" />
      <AIcon v-else :type="data.template.icon || 'AppstoreOutlined'" />
      </template>
      <template #titleExtra>
        <StatusTag :status="data.application.status === 'enabled' ? 'success' : 'disabled'" :text="data.application.statusText" />
        <AppTag :title="data.template.name">{{ data.template.name }}</AppTag>
      </template>
      <template #meta>
        <DetailMetaItem v-if="data.application.id" kind="id" :label="$t('ProjectApplication.detail.applicationId')" :tooltip="$t('DetailMetaItem.copyTooltip', { id: data.application.id })">
          <a-typography-text :copyable="{ text: data.application.id, tooltip: false }"><span>{{ data.application.id }}</span></a-typography-text>
        </DetailMetaItem>
        <DetailMetaItem kind="time" :label="$t('ProjectApplication.settings.createdAt')" :value="data.application.createdAt || $t('comm.table.empty')" :tooltip="data.application.createdAt" />
        <DetailMetaItem kind="description" :label="$t('ThirdPartyApplication.description')" :tooltip="data.application.description || data.template.description" multiline>
          <span class="summary-description">{{ data.application.description || data.template.description || $t('comm.table.empty') }}</span>
        </DetailMetaItem>
      </template>
      <template #actions>
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
      </template>
    </DetailHeader>
  </ContentPanel>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import { computed } from 'vue'
import DetailHeader from '@jetlinks-web-core/components/DetailHeader/index.vue'
import DetailMetaItem from '@jetlinks-web-core/components/DetailMetaItem'
import StatusTag from '@jetlinks-web-core/components/StatusTag/index.vue'
import { useI18n } from 'vue-i18n'
import type { ApplicationTemplate, ProjectApplication } from '../../types'

defineOptions({ name: 'ProjectApplicationSummary' })

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

const isImageIcon = (icon?: string) => !!icon && (/^(https?:|data:|\/)/.test(icon) || icon.includes('.'))
</script>

<style scoped>
.application-summary { margin-block: var(--space-4); }
.summary-description { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 3; white-space: pre-wrap; overflow-wrap: anywhere; }
.summary-settings-actions { display: flex; align-items: center; }
</style>
