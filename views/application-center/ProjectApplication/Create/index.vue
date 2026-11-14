<template>
  <a-modal
    :open="dialogOpen"
    centered
    destroy-on-close
    wrap-class-name="create-application-dialog"
    :width="680"
    :body-style="modalBodyStyle"
    :title="preview.template ? $t('ProjectApplication.template.previewTitle', { name: preview.template.name }) : $t('ProjectApplication.create.title')"
    :ok-text="$t('ProjectApplication.create.submit')"
    :cancel-text="$t('ProjectApplication.common.cancel')"
    :confirm-loading="submitting"
    :ok-button-props="{ disabled: !canSubmit }"
    @ok="submit"
    @cancel="cancelDialog"
  >
    <div class="create-body">
      <div class="create-form" :inert="preview.template ? true : undefined" :aria-hidden="preview.template ? true : undefined">
        <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
          <a-form-item :label="$t('ProjectApplication.create.applicationKind')">
            <a-radio-group v-model:value="applicationKind" button-style="solid" :disabled="submitting">
              <a-radio-button value="business">{{ $t('ProjectApplication.create.businessApplication') }}</a-radio-button>
              <a-radio-button value="third-party">{{ $t('ProjectApplication.create.thirdPartyApplication') }}</a-radio-button>
            </a-radio-group>
          </a-form-item>
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
              <TemplateSelector v-model="form.templateId" :templates="visibleTemplates" @preview="openPreview" />
              <CloudEmpty v-if="!templatesLoading && !visibleTemplates.length" :description="$t('ProjectApplication.create.noTemplates')" />
            </a-spin>
          </a-form-item>
        </a-form>
      </div>
      <Transition name="template-detail" @after-enter="focusPreview" @after-leave="restorePreviewFocus">
        <section
          v-if="preview.template"
          ref="previewPaneRef"
          class="template-detail"
          role="region"
          :aria-label="$t('ProjectApplication.template.previewTitle', { name: preview.template.name })"
          tabindex="-1"
        >
          <TemplatePreview
            :state="preview"
            @tab-change="preview.activeTab = $event"
            @menus-change="preview.expandedMenus = Array.isArray($event) ? $event : [$event]"
            @retry-document="loadPreviewDocument"
            @retry-menus="loadPreviewMenus"
          />
        </section>
      </Transition>
    </div>
    <template v-if="preview.template" #footer>
      <a-button @click="closePreview">
        <template #icon><AIcon type="ArrowLeftOutlined" /></template>
        {{ $t('ProjectApplication.template.back') }}
      </a-button>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import TemplateSelector from './TemplateSelector.vue'
import { useApplicationCreate } from './useApplicationCreate'
import type { ProjectApplication } from '../types'

const TemplatePreview = defineAsyncComponent(() => import('./TemplatePreview.vue'))

defineOptions({ name: 'ProjectApplicationCreate' })

const props = defineProps({
  open: { type: Boolean, default: false },
  embedded: { type: Boolean, default: false },
})
const emits = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'created', application: ProjectApplication): void
}>()

const {
  applicationKind,
  visibleTemplates,
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
  cancelDialog,
  submit,
  preview,
  previewPaneRef,
  openPreview,
  closePreview,
  focusPreview,
  restorePreviewFocus,
  loadPreviewDocument,
  loadPreviewMenus,
} = useApplicationCreate({
  open: () => props.open,
  embedded: () => props.embedded,
  onOpenChange: value => emits('update:open', value),
  onCreated: application => emits('created', application),
})

const modalBodyStyle = computed(() => {
	if(preview.template) {
		return {background: '#f5f6f8'}
	} else {
		return {}
	}
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

.create-body {
	position: relative;
	height: min(43rem, calc(100dvh - 10rem));
	overflow: hidden;
	background: var(--jet-theme-bg-container)
}

.create-form {
	height: 100%;
	overflow-y: auto;
	padding-right: var(--space-2);
}

.template-detail {
	position: absolute;
	z-index: 1;
	inset: 0;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	background: #f5f6f8;
	outline: none;
}

.template-detail-enter-active, .template-detail-leave-active {
	transition: transform 0.24s cubic-bezier(0.2, 0, 0, 1);
}

.template-detail-enter-from, .template-detail-leave-to {
	transform: translateX(100%);
}

@media (prefers-reduced-motion: reduce) {
  .template-detail-enter-active, .template-detail-leave-active { transition: none; }
}

@media (max-width: 40rem) {
  .icon-upload-row { align-items: flex-start; flex-direction: column; }
}
</style>
