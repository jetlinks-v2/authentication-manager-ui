<template>
  <j-page-container>
    <div class="create-page">
      <header class="create-heading">
        <div class="heading-copy">
          <a-button type="text" shape="circle" @click="backToList">
            <template #icon><AIcon type="ArrowLeftOutlined" /></template>
          </a-button>
          <div>
            <h1>{{ $t('ProjectApplication.create.title') }}</h1>
            <p>{{ $t('ProjectApplication.create.description') }}</p>
          </div>
        </div>
        <a-space>
          <a-button @click="backToList">{{ $t('ProjectApplication.common.cancel') }}</a-button>
          <a-button type="primary" :loading="submitting" @click="submit">
            {{ $t('ProjectApplication.create.submit') }}
          </a-button>
        </a-space>
      </header>

      <main class="create-content">
        <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
          <a-form-item :label="$t('ProjectApplication.create.icon')">
            <div class="icon-upload-row">
              <a-upload :show-upload-list="false" accept="image/png,image/jpeg,image/svg+xml" :before-upload="beforeUpload">
                <button type="button" class="icon-upload">
                  <img v-if="form.icon" :src="form.icon" alt="" />
                  <AIcon v-else type="PlusOutlined" />
                </button>
              </a-upload>
              <div class="upload-copy">
                <a-upload :show-upload-list="false" accept="image/png,image/jpeg,image/svg+xml" :before-upload="beforeUpload">
                  <a-button type="link">{{ $t('ProjectApplication.create.uploadIcon') }}</a-button>
                </a-upload>
                <span>{{ $t('ProjectApplication.create.iconHint') }}</span>
              </div>
            </div>
          </a-form-item>

          <a-form-item :label="$t('ProjectApplication.create.name')" name="name">
            <a-input
              v-model:value="form.name"
              :maxlength="30"
              show-count
              :placeholder="$t('ProjectApplication.create.namePlaceholder')"
            />
          </a-form-item>

          <a-form-item :label="$t('ProjectApplication.create.descriptionLabel')" name="description">
            <a-textarea
              v-model:value="form.description"
              :maxlength="100"
              show-count
              :rows="3"
              :placeholder="$t('ProjectApplication.create.descriptionPlaceholder')"
            />
          </a-form-item>

          <a-form-item name="templateId">
            <template #label>
              <div class="template-label">
                <strong>{{ $t('ProjectApplication.create.template') }}</strong>
                <span>{{ $t('ProjectApplication.create.templateHint') }}</span>
              </div>
            </template>
            <TemplateSelector v-model="form.templateId" :templates="store.templates" />
          </a-form-item>
        </a-form>
      </main>
    </div>
  </j-page-container>
</template>

<script setup lang="ts" name="ProjectApplicationCreate">
import type { UploadProps } from 'ant-design-vue'
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import TemplateSelector from './TemplateSelector.vue'
import { useProjectApplication } from '../useProjectApplication'
import type { ProjectApplicationDraft } from '../types'

const { t: $t } = useI18n()
const menuStore = useMenuStore()
const store = useProjectApplication()
const formRef = ref()
const submitting = ref(false)
const form = reactive<ProjectApplicationDraft>({ name: '', description: '', templateId: '' })

const rules = computed(() => ({
  name: [
    { required: true, message: $t('ProjectApplication.create.nameRequired') },
    { max: 30, message: $t('ProjectApplication.create.nameLength') },
  ],
  templateId: [{ required: true, message: $t('ProjectApplication.create.templateRequired') }],
}))

const beforeUpload: UploadProps['beforeUpload'] = (file) => {
  const reader = new FileReader()
  reader.addEventListener('load', () => { form.icon = String(reader.result || '') })
  reader.readAsDataURL(file)
  return false
}

const backToList = () => menuStore.jumpPage('application-center/ProjectApplication', {})

const submit = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  submitting.value = true
  try {
    const application = await store.createApplication({ ...form })
    onlyMessage($t('ProjectApplication.create.success', { name: application.name }))
    menuStore.jumpPage('application-center/ProjectApplication/Detail', { params: { id: application.id } })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.create-page {
  min-height: 100%;
  background: var(--bg-sunken);
}

.create-heading {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--line);
  background: var(--bg);
}

.heading-copy { display: flex; align-items: center; gap: var(--space-2); }
.heading-copy h1 { margin: 0; color: var(--ink-1); font-size: var(--fs-20); }
.heading-copy p { margin: var(--space-1) 0 0; color: var(--ink-3); }

.create-content {
  width: min(100%, 55rem);
  padding: var(--space-5);
}

.icon-upload-row { display: flex; align-items: center; gap: var(--space-3); }

.icon-upload {
  display: grid;
  width: 4.5rem;
  height: 4.5rem;
  place-items: center;
  overflow: hidden;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-3);
  background: var(--bg);
  color: var(--ink-3);
  cursor: pointer;
}

.icon-upload:hover { border-color: var(--accent); color: var(--accent); }
.icon-upload img { width: 100%; height: 100%; object-fit: cover; }
.upload-copy { display: flex; flex-direction: column; align-items: flex-start; }
.upload-copy span { color: var(--ink-4); font-size: var(--fs-12); }
.upload-copy :deep(.ant-btn) { padding-inline: 0; }

.template-label { display: flex; flex-direction: column; gap: var(--space-1); }
.template-label span { color: var(--ink-3); font-size: var(--fs-12); font-weight: 400; }

@media (max-width: 48rem) {
  .create-heading { align-items: flex-start; padding: var(--space-3); }
  .create-content { padding: var(--space-3); }
  .heading-copy p { display: none; }
}
</style>
