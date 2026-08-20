<template>
  <SectionCard
    class="application-settings"
    icon="SettingOutlined"
    :title="$t('ProjectApplication.settings.title')"
  >
    <template #actions>
      <a-space v-if="editingModel">
        <a-button :disabled="saving" @click="cancelEdit">
          {{ $t('ProjectApplication.common.cancel') }}
        </a-button>
        <a-button type="primary" :loading="saving" @click="saveSettings">
          <template #icon><AIcon type="CheckOutlined" /></template>
          {{ $t('ProjectApplication.common.save') }}
        </a-button>
      </a-space>
      <a-button v-else @click="startEdit">
        <template #icon><AIcon type="EditOutlined" /></template>
        {{ $t('ProjectApplication.common.edit') }}
      </a-button>
    </template>

    <a-form ref="formRef" :model="draft" :rules="rules">
      <div class="settings-list">
        <div class="setting-row setting-row--icon">
          <div class="setting-label">{{ $t('ProjectApplication.settings.icon') }}</div>
          <div v-if="editingModel" class="icon-edit">
            <div class="application-icon-upload">
              <ImageUpload
                v-model:value="draft.icon"
                accept="image/png,image/jpeg"
                :types="iconTypes"
                :border-style="iconUploadBorderStyle"
                :cropper-props="iconCropperProps"
              />
            </div>
            <span>{{ $t('ProjectApplication.settings.iconEditHint') }}</span>
          </div>
          <div v-else class="application-icon">
            <img v-if="isImageIcon(visibleIcon)" :src="visibleIcon" :alt="application.name" />
            <AIcon v-else :type="visibleIcon || 'AppstoreOutlined'" />
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-label" :class="{ required: editingModel }">
            {{ $t('ProjectApplication.create.name') }}
          </div>
          <a-form-item v-if="editingModel" class="setting-form-item" name="name">
            <a-input
              v-model:value="draft.name"
              class="setting-control"
              :maxlength="30"
              show-count
              :placeholder="$t('ProjectApplication.create.namePlaceholder')"
            />
          </a-form-item>
          <div v-else class="setting-value">{{ application.name }}</div>
        </div>

        <div class="setting-row align-start">
          <div class="setting-label">{{ $t('ProjectApplication.create.descriptionLabel') }}</div>
          <a-form-item v-if="editingModel" class="setting-form-item" name="description">
            <a-textarea
              v-model:value="draft.description"
              class="setting-control"
              :maxlength="100"
              show-count
              :rows="3"
              :placeholder="$t('ProjectApplication.create.descriptionPlaceholder')"
            />
          </a-form-item>
          <div v-else class="setting-value setting-description">
            {{ application.description || '--' }}
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-label">{{ $t('ProjectApplication.settings.language') }}</div>
          <a-select
            v-if="editingModel"
            v-model:value="draft.defaultLanguage"
            class="setting-select"
            :options="languageOptions"
          />
          <div v-else class="setting-value">{{ languageDisplayValue }}</div>
        </div>

        <div class="setting-row">
          <div class="setting-label">{{ $t('ProjectApplication.settings.link') }}</div>
          <div class="setting-link">
            <code>{{ domainDisplayValue }}</code>
            <a-tooltip :title="$t('ProjectApplication.settings.copy')">
              <a-button size="small" @click="copyApplicationUrl">
                <template #icon><AIcon type="CopyOutlined" /></template>
                {{ $t('ProjectApplication.settings.copy') }}
              </a-button>
            </a-tooltip>
          </div>
        </div>
      </div>
    </a-form>
  </SectionCard>
</template>

<script setup lang="ts" name="ProjectApplicationSettings">
import type { PropType } from 'vue'
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { createApplicationAccessDisplayUrl } from '@jetlinks-web-core/utils/application-access'
import type { ApplicationTemplate, ProjectApplication } from '../../types'

interface SettingsData {
  application: ProjectApplication
  template: ApplicationTemplate
}

interface SettingsDraft {
  icon?: string
  name: string
  description: string
  defaultLanguage: string
}

const props = defineProps({
  data: { type: Object as PropType<SettingsData>, required: true },
  editing: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
})

const emits = defineEmits<{
  (event: 'update:editing', value: boolean): void
  (event: 'save', patch: Partial<ProjectApplication>): void
}>()
const { t: $t } = useI18n()
const formRef = ref<FormInstance>()
const draft = reactive<SettingsDraft>({
  icon: undefined,
  name: '',
  description: '',
  defaultLanguage: 'zh-CN',
})
const iconTypes = ['image/jpeg', 'image/png']
const iconUploadBorderStyle = {
  border: '1px dashed var(--line-strong)',
  borderRadius: 'var(--r-2)',
}
const iconCropperProps = { fixedNumber: [1, 1], autoCropWidth: 256, autoCropHeight: 256 }

const application = computed(() => props.data.application)
const template = computed(() => props.data.template)
const editingModel = computed({
  get: () => props.editing,
  set: value => emits('update:editing', value),
})
const languageOptions = computed(() => [
  { label: $t('ProjectApplication.settings.zhCN'), value: 'zh-CN' },
  { label: $t('ProjectApplication.settings.enUS'), value: 'en-US' },
])
const languageDisplayValue = computed(() => languageOptions.value.find(
  item => item.value === application.value.defaultLanguage,
)?.label || application.value.defaultLanguage)
const fallbackDomainUrl = computed(() => createApplicationAccessDisplayUrl(application.value.id))
const domainDisplayValue = computed(() => application.value.domain || fallbackDomainUrl.value)
const visibleIcon = computed(() => application.value.icon || template.value.icon)
const rules = computed(() => ({
  name: [
    { required: true, message: $t('ProjectApplication.create.nameRequired') },
    { max: 30, message: $t('ProjectApplication.create.nameLength') },
  ],
}))

const resetDraft = () => {
  draft.icon = application.value.icon
  draft.name = application.value.name
  draft.description = application.value.description
  draft.defaultLanguage = application.value.defaultLanguage
  formRef.value?.clearValidate()
}

watch(() => props.editing, editing => {
  if (editing) resetDraft()
})

const startEdit = () => {
  resetDraft()
  editingModel.value = true
}

const cancelEdit = () => {
  resetDraft()
  editingModel.value = false
}

const saveSettings = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  emits('save', {
    icon: draft.icon,
    name: draft.name.trim(),
    description: draft.description.trim(),
    defaultLanguage: draft.defaultLanguage,
  })
}

const copyApplicationUrl = async () => {
  try {
    await navigator.clipboard.writeText(domainDisplayValue.value)
    onlyMessage($t('ProjectApplication.settings.copySuccess'))
  } catch {
    onlyMessage($t('ProjectApplication.settings.copyFailed'), 'warning')
  }
}

const isImageIcon = (icon?: string) => !!icon && (/^(https?:|data:|\/)/.test(icon) || icon.includes('.'))
</script>

<style scoped>
.application-settings :deep(.section-head) { align-items: center; }
.application-settings :deep(.section-title) { margin-bottom: 0; }
.application-settings :deep(.section-title .ic),
.application-settings :deep(.section-sub) { display: none; }
.settings-list { display: flex; flex-direction: column; }

.setting-row { display: grid; min-height: 4rem; grid-template-columns: 6.5rem minmax(0, 1fr); align-items: center; gap: var(--space-4); padding: var(--space-3) 0; border-bottom: 1px solid var(--line); }

.setting-row:last-child { border-bottom: 0; }
.setting-row.align-start { align-items: flex-start; }
.setting-label { padding-top: var(--space-1); color: var(--ink-3); }
.setting-label.required::before { margin-right: var(--space-1); color: var(--danger); content: '*'; }
.setting-control { width: min(100%, 24rem); }
.setting-select { width: min(100%, 15rem); }
.setting-form-item { width: 100%; margin: 0; }
.setting-value { min-width: 0; color: var(--ink-1); }
.setting-description { max-width: 44rem; line-height: 1.7; }

.application-icon,
.application-icon-upload { display: grid; width: 3.5rem; height: 3.5rem; place-items: center; overflow: hidden; border-radius: var(--r-2); background: var(--bg-sunken); color: var(--accent); font-size: var(--fs-20); }

.application-icon img { width: 100%; height: 100%; object-fit: cover; }
.icon-edit { display: flex; align-items: center; gap: var(--space-3); }
.icon-edit > span { color: var(--ink-4); font-size: var(--fs-12); }

.setting-link { display: flex; min-width: 0; align-items: center; gap: var(--space-2); }

.setting-link code { max-width: min(100%, 34rem); overflow: hidden; padding: var(--space-1) var(--space-2); border-radius: var(--r-1); background: var(--accent-soft); color: var(--accent); font-family: var(--font-mono); font-size: var(--fs-12); text-overflow: ellipsis; white-space: nowrap; }

@media (max-width: 48rem) {
  .setting-row { grid-template-columns: 1fr; gap: var(--space-2); }
  .setting-control,
  .setting-select { width: 100%; }
  .icon-edit { align-items: flex-start; flex-direction: column; }
  .setting-link { align-items: stretch; flex-direction: column; }
  .setting-link code { max-width: 100%; }
}
</style>
