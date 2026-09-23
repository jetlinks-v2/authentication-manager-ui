<template>
  <JlDrawerShell
    :open="open"
    :title="$t(editing ? 'ThirdPartyLogin.drawerEdit' : 'ThirdPartyLogin.drawerCreate')"
    :width="560"
    @update:open="handleOpenChange"
  >
    <a-form ref="formRef" :model="draft" layout="vertical" @submit.prevent="submit">
      <a-form-item :label="$t('ThirdPartyLogin.type')" name="method">
        <div v-if="editing" class="method-locked">
          <img :src="methodIcons[draft.method]" alt="" />
          <span>{{ $t(`ThirdPartyLogin.${draft.method}`) }}</span>
          <span class="form-help">{{ $t('ThirdPartyLogin.typeImmutable') }}</span>
        </div>
        <a-radio-group v-else v-model:value="draft.method" class="method-picker">
          <a-radio-button v-for="method in loginMethods" :key="method" :value="method">
            <span class="method-picker__label">
              <img :src="methodIcons[method]" alt="" />
              {{ $t(`ThirdPartyLogin.${method}`) }}
            </span>
          </a-radio-button>
        </a-radio-group>
      </a-form-item>
      <a-form-item :label="$t('ThirdPartyLogin.name')" name="name" :rules="requiredRules">
        <a-input v-model:value="draft.name" :placeholder="$t('ThirdPartyLogin.namePlaceholder')" :maxlength="64" />
      </a-form-item>
      <a-form-item :label="$t('ThirdPartyLogin.icon')" name="logoUrl">
        <div class="icon-control-row">
          <div class="icon-preview" :class="`icon-preview--${draft.method}`">
            <img :src="draft.logoUrl || methodIcons[draft.method]" alt="" />
          </div>
          <a-upload
            accept="image/png,image/svg+xml"
            :show-upload-list="false"
            :before-upload="beforeIconUpload"
            :custom-request="uploadIcon"
            @change="handleIconChange"
          >
            <a-button :loading="iconUploading">{{ $t('ThirdPartyLogin.iconSelect') }}</a-button>
          </a-upload>
          <a-button :disabled="!draft.logoUrl" @click="draft.logoUrl = ''">
            {{ $t('ThirdPartyLogin.iconDefault') }}
          </a-button>
        </div>
        <div class="form-help">{{ $t('ThirdPartyLogin.iconHint') }}</div>
      </a-form-item>

      <div class="drawer-section-title">{{ $t('ThirdPartyLogin.credentials') }}</div>
      <ProviderFields :draft="draft" />

      <div class="drawer-section-title">{{ $t('ThirdPartyLogin.displaySettings') }}</div>
      <div class="login-entry-switch">
        <a-switch v-model:checked="draft.showOnLogin" />
        <span>{{ $t('ThirdPartyLogin.showOnLogin') }}</span>
      </div>
      <div class="login-entry-switch login-entry-switch--detail">
        <a-switch v-model:checked="draft.autoCreateUser" />
        <div>
          <div>{{ $t('ThirdPartyLogin.autoCreateUser') }}</div>
          <div class="form-help">{{ $t('ThirdPartyLogin.autoCreateUserHint') }}</div>
        </div>
      </div>
      <a-form-item
        v-if="draft.autoCreateUser"
        :label="$t('ThirdPartyLogin.usernamePrefix')"
        name="usernamePrefix"
        :rules="usernamePrefixRules"
      >
        <a-input
          v-model:value="draft.usernamePrefix"
          :placeholder="$t('ThirdPartyLogin.usernamePrefixPlaceholder')"
          :maxlength="64"
        />
        <div class="form-help">{{ $t('ThirdPartyLogin.usernamePrefixHint') }}</div>
      </a-form-item>
      <a-form-item
        v-if="draft.autoCreateUser"
        :label="$t('ThirdPartyLogin.defaultRole')"
        name="roleIdList"
        :rules="roleRules"
      >
        <form-item-role
          v-model:value="draft.roleIdList"
          :extra-props="{ multiple: true }"
          :show-add="false"
        />
      </a-form-item>
      <a-form-item
        v-if="draft.autoCreateUser"
        :label="$t('ThirdPartyLogin.organization')"
        name="orgIdList"
      >
        <form-item-org v-model:value="draft.orgIdList" :extra-props="{ multiple: true }" :show-add="false" />
      </a-form-item>
      <a-form-item class="callback-field" :label="$t('ThirdPartyLogin.callbackAddress')">
        <div class="callback-row">
          <a-input
            :value="callbackUrl"
            :placeholder="$t('ThirdPartyLogin.callbackPending')"
            readonly
          />
          <a-button type="link" :disabled="!callbackUrl" @click="copyCallbackUrl">
            {{ $t('ThirdPartyLogin.copy') }}
          </a-button>
        </div>
        <div class="form-help">{{ $t('ThirdPartyLogin.callbackHint') }}</div>
      </a-form-item>
    </a-form>
    <template #foot>
      <StickyActionBar position="inline">
        <a-button @click="handleOpenChange(false)">{{ $t('ThirdPartyLogin.cancel') }}</a-button>
        <a-button type="primary" :loading="saving" @click="submit">{{ $t('ThirdPartyLogin.save') }}</a-button>
      </StickyActionBar>
    </template>
  </JlDrawerShell>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch, type PropType } from 'vue'
import { message, type FormInstance, type UploadChangeParam, type UploadProps } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { fileUpload } from '@jetlinks-web-core/api/comm'
import ProviderFields from './ProviderFields.vue'
import { methodIcons } from '../methodIcons'
import {
  createDraft, loginMethods, type LoginConfig,
  type LoginConfigDraft, type LoginMethod,
} from '../model'

const { t } = useI18n()
const props = defineProps({
  open: { type: Boolean, required: true },
  method: { type: String as PropType<LoginMethod>, required: true },
  editing: { type: Object as PropType<LoginConfig>, default: undefined },
  saving: { type: Boolean, default: false },
  callbackBasePath: { type: String, default: '' },
})
const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'save', value: LoginConfigDraft): void
}>()

const formRef = ref<FormInstance>()
const draft = reactive<LoginConfigDraft>(createDraft('wechat'))
const initialSnapshot = ref('')
const iconUploading = ref(false)
const requiredRules = computed(() => [{ required: true, whitespace: true, message: t('ThirdPartyLogin.required') }])
const usernamePrefixRules = computed(() => [{
  pattern: /^[^\u4e00-\u9fa5]*$/,
  message: t('ThirdPartyLogin.usernamePrefixInvalid'),
}])
const roleRules = computed(() => [{
  required: true,
  type: 'array' as const,
  min: 1,
  message: t('ThirdPartyLogin.defaultRoleRequired'),
}])
const callbackUrl = computed(() => props.editing?.id && props.callbackBasePath
  ? `${props.callbackBasePath}/application/sso/${props.editing.id}/notify`
  : '')

watch(() => props.open, async (open) => {
  if (!open) return
  Object.assign(draft, createDraft(props.method), props.editing || {})
  initialSnapshot.value = JSON.stringify(draft)
  await nextTick()
  formRef.value?.clearValidate()
})

// 新建时切换方式，清除上一种 provider 的字段，避免提交无关配置。
watch(() => draft.method, (method, previous) => {
  if (!props.open || props.editing || method === previous) return
  const { name } = draft
  Object.assign(draft, createDraft(method), { name })
  formRef.value?.clearValidate()
})

function handleOpenChange(open: boolean) {
  if (!open && JSON.stringify(draft) !== initialSnapshot.value
    && !window.confirm(t('ThirdPartyLogin.unsavedChangesConfirm'))) return
  emit('update:open', open)
  if (!open) Object.assign(draft, createDraft('wechat'))
}

function beforeIconUpload(file: File) {
  if (!['image/png', 'image/svg+xml'].includes(file.type)) {
    message.error(t('ThirdPartyLogin.iconInvalid'))
    return false
  }
  if (file.size > 2 * 1024 * 1024) {
    message.error(t('ThirdPartyLogin.iconTooLarge'))
    return false
  }
  return true
}

const uploadIcon: NonNullable<UploadProps['customRequest']> = async (options) => {
  const formData = new FormData()
  formData.append('file', options.file as File)
  try {
    const response = await fileUpload(formData)
    options.onSuccess?.(response)
  } catch (error) {
    options.onError?.(error as Error)
  }
}

function handleIconChange(info: UploadChangeParam) {
  iconUploading.value = info.file.status === 'uploading'
  if (info.file.status === 'done') {
    draft.logoUrl = info.file.response?.result?.accessUrl || ''
    iconUploading.value = false
  }
  if (info.file.status === 'error') {
    iconUploading.value = false
    message.error(t('ThirdPartyLogin.iconUploadFailed'))
  }
}

/** Clipboard API 仅在安全上下文可用，HTTP 和部分微应用环境使用选区复制降级。 */
function legacyCopyText(value: string): boolean {
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.readOnly = true
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  textarea.setSelectionRange(0, value.length)
  const copied = document.execCommand('copy')
  textarea.remove()
  return copied
}

async function copyCallbackUrl() {
  if (!callbackUrl.value) return
  try {
    if (window.isSecureContext && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(callbackUrl.value)
        message.success(t('ThirdPartyLogin.copySuccess'))
        return
      } catch {
        // 浏览器可能单独拒绝剪贴板权限，继续使用兼容方式。
      }
    }
    if (!legacyCopyText(callbackUrl.value)) throw new Error('copy failed')
    message.success(t('ThirdPartyLogin.copySuccess'))
  } catch {
    message.error(t('ThirdPartyLogin.copyFailed'))
  }
}

async function submit() {
  try {
    await formRef.value?.validate()
  } catch { return }
  emit('save', { ...draft })
}
</script>

<style scoped>
.method-picker { display: grid; width: 100%; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-2); }
.method-picker :deep(.ant-radio-button-wrapper) { min-width: 0; padding: 0; border-inline-start-width: 1px; border-radius: var(--r-2); text-align: center; }
.method-picker :deep(.ant-radio-button-wrapper::before) { display: none; }
.method-picker__label, .method-locked { display: inline-flex; align-items: center; gap: var(--space-2); }
.method-picker__label img, .method-locked img { width: 1.125rem; height: 1.125rem; object-fit: contain; }
.method-locked .form-help { margin: 0 0 0 var(--space-2); }
.drawer-section-title {
  color: var(--ink-1);
  font-size: var(--fs-14);
  font-weight: 600;
  margin: var(--space-4) 0 var(--space-3);
}
.icon-control-row { display: flex; align-items: center; gap: var(--space-3); min-height: 2.75rem; }
.icon-preview {
  width: 2.75rem;
  height: 2.75rem;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-2);
  background: var(--fill-2, #f5f7fa);
  overflow: hidden;
}
.icon-preview img { width: 1.5rem; height: 1.5rem; object-fit: contain; }
.icon-preview--wechat { background: #eefbf3; }
.icon-preview--dingtalk { background: #eef7ff; }
.icon-preview--oauth2 { background: #f4f0ff; }
.form-help { color: var(--ink-4); font-size: var(--fs-12); margin-top: var(--space-1); }
.login-entry-switch { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-4); }
.login-entry-switch--detail { align-items: flex-start; }
.login-entry-switch--detail :deep(.ant-switch) { flex: none; margin-top: 0.125rem; }
.login-entry-switch--detail .form-help { margin-top: var(--space-1); }
.callback-field { margin-bottom: 0; }
.callback-row {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--border-color, #d9d9d9);
  border-radius: var(--r-2);
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.callback-row:focus-within {
  border-color: var(--ant-primary-color, #1890ff);
  box-shadow: 0 0 0 2px rgb(24 144 255 / 10%);
}
.callback-row :deep(.ant-input) { min-width: 0; border: 0; box-shadow: none; }
.callback-row :deep(.ant-btn) { flex: none; height: auto; border: 0; border-radius: 0; }
@media (max-width: 600px) {
  .method-picker { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .icon-control-row { align-items: flex-start; flex-wrap: wrap; }
}
</style>
