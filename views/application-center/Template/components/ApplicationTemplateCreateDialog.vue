<template>
  <a-modal
    :open="dialogOpen"
    :title="$t(editState ? 'ApplicationTemplate.detail.edit' : 'ApplicationTemplate.list.add')"
    :ok-text="$t(editState ? 'ApplicationTemplate.common.save' : 'ApplicationTemplate.common.confirm')"
    :confirm-loading="loading"
    :width="520"
    :closable="!loading"
    :mask-closable="!loading"
    :keyboard="!loading"
    :cancel-button-props="{ disabled: loading }"
    :ok-button-props="{ disabled }"
    destroy-on-close
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-alert v-if="editState?.error.value" type="error" show-icon :message="editState.error.value" class="template-dialog__error" />
    <div class="template-dialog__body" :inert="disabled || undefined">
      <a-form :ref="setFormRef" layout="vertical" :model="formData" :rules="rules" :disabled="loading">
        <a-form-item :label="$t('ProjectApplication.create.applicationKind')" name="provider">
          <a-radio-group
            :value="editState ? editState.detail.value.provider || 'official' : createState.formData.provider"
            button-style="solid"
            :disabled="loading || !!editState"
            @update:value="createState.formData.provider = $event"
          >
            <a-radio-button value="official">{{ $t('ProjectApplication.create.businessApplication') }}</a-radio-button>
            <a-radio-button value="third-party">{{ $t('ProjectApplication.create.thirdPartyApplication') }}</a-radio-button>
          </a-radio-group>
        </a-form-item>
        <a-form-item :label="$t('ApplicationTemplate.field.name')" name="name">
          <I18nTextField
            v-model:value="formData.name"
            v-model:i18nMessages="formData.i18nMessages"
            field="name"
            :label="$t('ApplicationTemplate.field.name')"
            :maxlength="64"
            :i18n-max-length="64"
            :disabled="loading"
            :placeholder="$t('ApplicationTemplate.field.namePlaceholder')"
          />
        </a-form-item>
        <a-form-item :label="$t('ApplicationTemplate.field.code')" name="code">
          <a-input
            :value="editState ? editState.detail.value.code : createState.formData.code"
            :disabled="loading || !!editState"
            :maxlength="64"
            :placeholder="$t('ApplicationTemplate.field.codePlaceholder')"
            @update:value="createState.formData.code = $event"
          />
        </a-form-item>
        <a-form-item v-if="!editState && createState.thirdParty.value" :label="$t('ApplicationTemplate.parameters.redirectUri')" name="redirectUri">
          <a-input
            v-model:value="createState.formData.redirectUri"
            :disabled="loading"
            :placeholder="$t('ApplicationTemplate.parameters.redirectUriPlaceholder')"
          />
        </a-form-item>
        <a-form-item v-if="editState" :label="$t('ApplicationTemplate.field.description')" name="description">
          <I18nTextField
            v-model:value="editState.draft.description"
            v-model:i18nMessages="editState.draft.i18nMessages"
            field="description"
            :label="$t('ApplicationTemplate.field.description')"
            textarea :rows="3" :maxlength="512" :i18n-max-length="512"
            :disabled="loading" show-count
          />
        </a-form-item>
      </a-form>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, type ComponentPublicInstance, type PropType } from 'vue'
import type { FormInstance } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { I18nTextField } from '@jetlinks-web-core/components'
import { useApplicationTemplateCreate } from '../useApplicationTemplateCreate'
import type { ApplicationTemplateBasicInfoState } from '../Save/useApplicationTemplateBasicInfo'

const props = defineProps({
  open: { type: Boolean, default: false },
  editState: { type: Object as PropType<ApplicationTemplateBasicInfoState>, default: undefined },
})
const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'created', id: string): void
}>()

const { t: $t } = useI18n()
const createState = useApplicationTemplateCreate({
  open: () => props.open,
  onOpenChange: value => emit('update:open', value),
  onCreated: id => emit('created', id),
})
// 两种模式复用同一份表单；编辑草稿由详情持有，新增继续使用原有创建流程。
const dialogOpen = computed(() => props.editState?.open.value ?? createState.dialogOpen.value)
const formData = computed(() => props.editState?.draft ?? createState.formData)
const rules = computed(() => props.editState?.rules.value ?? createState.rules.value)
const loading = computed(() => props.editState?.busy.value ?? createState.loading.value)
const disabled = computed(() => props.editState?.disabled.value ?? loading.value)
const handleOk = () => props.editState ? props.editState.save() : createState.handleOk()
const handleCancel = () => {
  if (loading.value) return
  if (props.editState) props.editState.cancel()
  else createState.dialogOpen.value = false
}
const setFormRef = (instance: Element | ComponentPublicInstance | null) => {
  const target = props.editState?.formRef ?? createState.formRef
  target.value = instance ? instance as FormInstance : undefined
}
</script>

<style scoped>
.template-dialog__body { max-height: calc(100vh - 15rem); padding-inline-end: var(--space-2); overflow-y: auto; overscroll-behavior: contain; }
.template-dialog__error { margin-bottom: var(--space-4); }
</style>
