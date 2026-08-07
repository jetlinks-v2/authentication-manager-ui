<template>
  <SectionCard
    icon="SettingOutlined"
    :title="$t('ProjectApplication.settings.title')"
    :sub="$t('ProjectApplication.settings.subtitle')"
  >
    <div class="settings-list">
      <div class="setting-row">
        <div class="setting-label">{{ $t('ProjectApplication.settings.icon') }}</div>
        <div class="icon-setting">
          <div class="application-icon">
            <img v-if="application.icon" :src="application.icon" :alt="application.name" />
            <AIcon v-else type="AppstoreOutlined" />
          </div>
          <a-upload :show-upload-list="false" accept="image/png,image/jpeg,image/svg+xml" :before-upload="beforeUpload">
            <a-button>{{ $t('ProjectApplication.settings.upload') }}</a-button>
          </a-upload>
          <span>{{ $t('ProjectApplication.create.iconHint') }}</span>
        </div>
      </div>

      <div class="setting-row">
        <div class="setting-label">{{ $t('ProjectApplication.settings.language') }}</div>
        <a-select
          :value="application.defaultLanguage"
          class="setting-control"
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

      <div class="setting-row align-start">
        <div class="setting-label">{{ $t('ProjectApplication.settings.directDevice') }}</div>
        <div class="switch-setting">
          <a-switch :checked="application.allowDirectDevice" @change="updateDirectDevice" />
          <p>{{ $t('ProjectApplication.settings.directDeviceHint') }}</p>
        </div>
      </div>
    </div>
  </SectionCard>
</template>

<script setup lang="ts" name="ProjectApplicationSettings">
import type { UploadProps } from 'ant-design-vue'
import type { PropType } from 'vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ProjectApplication } from '../../types'

const props = defineProps({
  application: {
    type: Object as PropType<ProjectApplication>,
    required: true,
  },
})

const emits = defineEmits(['update'])
const { t: $t } = useI18n()

const languageOptions = computed(() => [
  { label: $t('ProjectApplication.settings.zhCN'), value: 'zh-CN' },
  { label: $t('ProjectApplication.settings.enUS'), value: 'en-US' },
])

const beforeUpload: UploadProps['beforeUpload'] = (file) => {
  const reader = new FileReader()
  reader.addEventListener('load', () => emits('update', { icon: String(reader.result || '') }))
  reader.readAsDataURL(file)
  return false
}

const updateLanguage = (value: unknown) => {
  if (value === 'zh-CN' || value === 'en-US') emits('update', { defaultLanguage: value })
}
const updateDomain = (domain: string) => emits('update', { domain: domain.trim() })
const updateDirectDevice = (value: unknown) => emits('update', { allowDirectDevice: Boolean(value) })
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

.icon-setting { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-3); }
.icon-setting > span { color: var(--ink-4); font-size: var(--fs-12); }

.application-icon {
  display: grid;
  width: 3.5rem;
  height: 3.5rem;
  place-items: center;
  overflow: hidden;
  border-radius: var(--r-3);
  background: var(--accent-soft);
  color: var(--accent);
  font-size: var(--fs-20);
}

.application-icon img { width: 100%; height: 100%; object-fit: cover; }
.switch-setting { display: flex; max-width: 42rem; align-items: flex-start; gap: var(--space-3); }
.switch-setting p { margin: 0; color: var(--ink-3); line-height: 1.6; }

@media (max-width: 48rem) {
  .setting-row { grid-template-columns: 1fr; gap: var(--space-2); }
}
</style>
