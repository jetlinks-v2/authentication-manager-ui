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
import TemplateSelector from './TemplateSelector.vue'
import { useApplicationCreate } from './useApplicationCreate'
import type { ProjectApplication } from '../types'

const props = defineProps({
  open: { type: Boolean, default: false },
  embedded: { type: Boolean, default: false },
})
const emits = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'created', application: ProjectApplication): void
}>()

const {
  store,
  formRef,
  submitting,
  templatesLoading,
  form,
  iconTypes,
  iconUploadBorderStyle,
  iconCropperProps,
  dialogOpen,
  canSubmit,
  rules,
  closeDialog,
  submit,
} = useApplicationCreate({
  open: () => props.open,
  embedded: () => props.embedded,
  onOpenChange: value => emits('update:open', value),
  onCreated: application => emits('created', application),
})
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
