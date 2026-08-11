<template>
  <SectionCard
    icon="SettingOutlined"
    :title="$t('ProjectApplication.settings.title')"
    :sub="$t('ProjectApplication.settings.subtitle')"
  >
    <div class="settings-list">
      <div class="setting-row">
        <div class="setting-label">{{ $t('ProjectApplication.settings.icon') }}</div>
        <div class="application-icon-upload">
          <ImageUpload
            :value="application.icon"
            accept="image/png,image/jpeg"
            :types="iconTypes"
            :border-style="iconUploadBorderStyle"
            :cropper-props="iconCropperProps"
            @update:value="updateIcon"
          />
        </div>
      </div>

      <div class="setting-row">
        <div class="setting-label">{{ $t('ProjectApplication.create.name') }}</div>
        <InputEditable
          class="setting-control"
          :value="application.name"
          :max-length="30"
          @change="updateName"
        />
      </div>

      <div class="setting-row align-start">
        <div class="setting-label">{{ $t('ProjectApplication.create.descriptionLabel') }}</div>
        <InputEditable
          class="setting-control"
          :value="application.description"
          :max-length="100"
          @change="updateDescription"
        />
      </div>

      <div class="setting-row">
        <div class="setting-label">{{ $t('ProjectApplication.create.template') }}</div>
        <div class="setting-value">
          <img v-if="isImageIcon(template.icon)" class="template-icon" :src="template.icon" :alt="template.name" />
          <AIcon v-else :type="template.icon || 'AppstoreOutlined'" />
          <span>{{ template.name }}</span>
        </div>
      </div>

      <div class="setting-row">
        <div class="setting-label">{{ $t('ProjectApplication.settings.language') }}</div>
        <a-select
          class="setting-control"
          :value="application.defaultLanguage"
          :options="languageOptions"
          @change="updateLanguage"
        />
      </div>

      <div class="setting-row">
        <div class="setting-label">{{ $t('ProjectApplication.settings.domain') }}</div>
        <InputEditable
          class="setting-control"
          :value="application.domain"
          :max-length="128"
          @change="updateDomain"
        />
      </div>

      <div class="setting-row">
        <div class="setting-label">{{ $t('ProjectApplication.settings.createdAt') }}</div>
        <div class="setting-value">{{ application.createdAt }}</div>
      </div>
    </div>
  </SectionCard>
</template>

<script setup lang="ts" name="ProjectApplicationSettings">
import type { PropType } from 'vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ApplicationTemplate, ProjectApplication } from '../../types'

const props = defineProps({
  application: {
    type: Object as PropType<ProjectApplication>,
    required: true,
  },
  template: {
    type: Object as PropType<ApplicationTemplate>,
    required: true,
  },
})

const emits = defineEmits<{
  update: [patch: Partial<ProjectApplication>, field: 'icon' | 'name' | 'description' | 'domain' | 'language']
}>()
const { t: $t } = useI18n()
const iconTypes = ['image/jpeg', 'image/png']
const iconUploadBorderStyle = { borderRadius: 'var(--r-3)' }
const iconCropperProps = {
  fixedNumber: [1, 1],
  autoCropWidth: 256,
  autoCropHeight: 256,
}

const languageOptions = computed(() => [
  { label: $t('ProjectApplication.settings.zhCN'), value: 'zh-CN' },
  { label: $t('ProjectApplication.settings.enUS'), value: 'en-US' },
])

const updateIcon = (icon: string) => emits('update', { icon }, 'icon')
const updateName = (name: string) => {
  const nextName = name.trim()
  if (nextName) emits('update', { name: nextName }, 'name')
}
const updateDescription = (description: string) => emits('update', { description: description.trim() }, 'description')
const updateDomain = (domain: string) => emits('update', { domain: domain.trim() }, 'domain')
const updateLanguage = (defaultLanguage: unknown) => {
  if (typeof defaultLanguage === 'string') emits('update', { defaultLanguage }, 'language')
}
const isImageIcon = (icon?: string) => !!icon && (/^(https?:|data:|\/)/.test(icon) || icon.includes('.'))
</script>

<style scoped>
.settings-list { display: flex; flex-direction: column; }

.setting-row {
  display: grid;
  min-height: 4rem;
  grid-template-columns: 12rem minmax(0, 1fr);
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--line);
}

.setting-row:last-child { border-bottom: 0; }
.setting-row.align-start { align-items: flex-start; }
.setting-label { color: var(--ink-2); font-weight: 500; }
.setting-control { width: min(100%, 28rem); }

.application-icon-upload {
  width: 3.5rem;
  height: 3.5rem;
}

.setting-value { display: inline-flex; align-items: center; gap: var(--space-2); color: var(--ink-2); }
.template-icon { width: 1.5rem; height: 1.5rem; border-radius: var(--r-1); object-fit: cover; }
@media (max-width: 48rem) {
  .setting-row { grid-template-columns: 1fr; gap: var(--space-2); }
}
</style>
