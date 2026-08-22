<template>
  <a-modal
    v-model:open="dialogOpen"
    centered
    destroy-on-close
    wrap-class-name="create-application-dialog"
    :width="680"
    :title="$t('ProjectApplication.create.title')"
    :ok-text="$t('ProjectApplication.create.submit')"
    :cancel-text="$t('ProjectApplication.common.cancel')"
    :confirm-loading="submitting"
    :ok-button-props="{ disabled: !canSubmit }"
    @ok="submit"
    @cancel="closeDialog"
  >
    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
      <a-form-item :label="$t('ProjectApplication.create.icon')">
        <div class="icon-upload-row">
          <div class="icon-upload">
            <ImageUpload
              v-model:value="form.icon"
              accept="image/png,image/jpeg"
              :types="iconTypes"
              :border-style="iconUploadBorderStyle"
              :cropper-props="iconCropperProps"
            />
          </div>
          <span class="upload-copy">{{ $t('ProjectApplication.create.iconHint') }}</span>
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

      <a-form-item :label="$t('ProjectApplication.create.template')" name="templateId">
        <a-spin :spinning="templatesLoading">
          <TemplateSelector v-model="form.templateId" :templates="store.templates" />
        </a-spin>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts" name="ProjectApplicationCreate">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import type { FormInstance } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useProjectRouter } from '@jetlinks-web-core/hooks/useProjectRouter'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import TemplateSelector from './TemplateSelector.vue'
import { useProjectApplication } from '../useProjectApplication'
import type { ProjectApplication, ProjectApplicationDraft } from '../types'

const props = defineProps({
  open: { type: Boolean, default: false },
  embedded: { type: Boolean, default: false },
})

const emits = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'created', application: ProjectApplication): void
}>()

const { t: $t } = useI18n()
const menuStore = useMenuStore()
const { projectId } = useProjectRouter()
const store = useProjectApplication()
const formRef = ref<FormInstance>()
const submitting = ref(false)
const templatesLoading = ref(false)
const form = reactive<ProjectApplicationDraft>({ name: '', description: '', templateId: '' })
const iconTypes = ['image/jpeg', 'image/png']
const iconUploadBorderStyle = {
  border: '1px dashed var(--line-strong)',
  borderRadius: 'var(--r-2)',
}
const iconCropperProps = {
  fixedNumber: [1, 1],
  autoCropWidth: 256,
  autoCropHeight: 256,
}

// Keep the legacy Create route usable while the ledger owns the normal dialog state.
const dialogOpen = computed({
  get: () => props.embedded ? props.open : true,
  set: value => {
    if (props.embedded) emits('update:open', value)
    else if (!value) menuStore.jumpPage('application-center/ProjectApplication', {})
  },
})

const canSubmit = computed(() => {
  const template = store.templates.find(item => item.id === form.templateId)
  return !!projectId.value && !!form.name.trim() && !!template && !template.disabled
})

const rules = computed(() => ({
  name: [
    { required: true, message: $t('ProjectApplication.create.nameRequired') },
    { max: 30, message: $t('ProjectApplication.create.nameLength') },
  ],
  templateId: [{ required: true, message: $t('ProjectApplication.create.templateRequired') }],
}))

const resetForm = async () => {
  form.name = ''
  form.description = ''
  form.templateId = ''
  form.icon = undefined
  await nextTick()
  formRef.value?.clearValidate()
}

const loadTemplates = async () => {
  templatesLoading.value = true
  try {
    await store.loadTemplates()
  } catch {
    // The shared request layer reports the backend error.
  } finally {
    templatesLoading.value = false
  }
}

watch(dialogOpen, open => {
  if (!open) return
  void resetForm()
  void loadTemplates()
}, { immediate: true })

const closeDialog = () => {
  dialogOpen.value = false
}

const submit = async () => {
  if (!projectId.value) {
    onlyMessage($t('ProjectApplication.list.missingProject'), 'warning')
    return
  }
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    const application = await store.createApplication(projectId.value, {
      ...form,
      name: form.name.trim(),
      description: form.description.trim(),
    })
    onlyMessage($t('ProjectApplication.create.success', { name: application.name }))
    emits('created', application)
    if (props.embedded) dialogOpen.value = false
    else menuStore.jumpPage('application-center/ProjectApplication/Detail', { params: { id: application.id } })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.icon-upload-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.icon-upload {
  width: 3.5rem;
  height: 3.5rem;
  flex: none;
}

.upload-copy {
  color: var(--ink-4);
  font-size: var(--fs-12);
  line-height: 1.6;
}

:global(.create-application-dialog .ant-modal-body) {
  max-height: min(43rem, calc(100vh - 10rem));
  overflow-y: auto;
  padding-right: var(--space-2);
}

@media (max-width: 40rem) {
  .icon-upload-row { align-items: flex-start; flex-direction: column; }
}
</style>
