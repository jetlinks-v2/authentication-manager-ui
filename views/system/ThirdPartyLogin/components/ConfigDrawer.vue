<template>
  <JlDrawerShell
    :open="open"
    :title="$t(editing ? 'ThirdPartyLogin.drawerEdit' : 'ThirdPartyLogin.drawerCreate')"
    :sub="$t('ThirdPartyLogin.localOnlyTip')"
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
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item :label="$t('ThirdPartyLogin.name')" name="name" :rules="requiredRules">
            <a-input v-model:value="draft.name" :placeholder="$t('ThirdPartyLogin.namePlaceholder')" :maxlength="64" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="$t('ThirdPartyLogin.displayName')" name="displayName" :rules="requiredRules">
            <a-input v-model:value="draft.displayName" :placeholder="$t('ThirdPartyLogin.displayNamePlaceholder')" :maxlength="64" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item :label="$t('ThirdPartyLogin.icon')">
        <a-space align="center">
          <a-avatar shape="square" :size="40" :src="draft.iconDataUrl || methodIcons[draft.method]" />
          <a-upload accept="image/png,image/jpeg" :show-upload-list="false" :before-upload="selectIcon">
            <a-button>{{ $t('ThirdPartyLogin.iconSelect') }}</a-button>
          </a-upload>
          <a-button :disabled="!draft.iconDataUrl" @click="draft.iconDataUrl = ''">
            {{ $t('ThirdPartyLogin.iconDefault') }}
          </a-button>
        </a-space>
        <div class="form-help">{{ $t('ThirdPartyLogin.iconHint') }}</div>
      </a-form-item>

      <div class="drawer-section-title">{{ $t('ThirdPartyLogin.credentials') }}</div>
      <a-alert class="secret-notice" type="warning" show-icon :message="$t('ThirdPartyLogin.noRealCredential')" />
      <ProviderFields :draft="draft" />

      <div class="drawer-section-title">{{ $t('ThirdPartyLogin.displaySettings') }}</div>
      <a-form-item :label="$t('ThirdPartyLogin.showOnLogin')" name="showOnLogin">
        <a-switch v-model:checked="draft.showOnLogin" />
      </a-form-item>

      <a-form-item :label="$t('ThirdPartyLogin.callbackAddress')">
        <div class="callback-row">
          <a-input :value="$t('ThirdPartyLogin.callbackPending')" disabled />
          <a-button disabled>{{ $t('ThirdPartyLogin.copy') }}</a-button>
        </div>
        <div class="form-help">{{ $t('ThirdPartyLogin.callbackHint') }}</div>
      </a-form-item>
    </a-form>
    <template #foot>
      <StickyActionBar position="inline">
        <a-button @click="handleOpenChange(false)">{{ $t('ThirdPartyLogin.cancel') }}</a-button>
        <a-button type="primary" @click="submit">{{ $t('ThirdPartyLogin.save') }}</a-button>
      </StickyActionBar>
    </template>
  </JlDrawerShell>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch, type PropType } from 'vue'
import { message, type FormInstance } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import ProviderFields from './ProviderFields.vue'
import { methodIcons } from '../methodIcons'
import {
  createDraft, hasDuplicateIdentifier, loginMethods, type LoginConfig,
  type LoginConfigDraft, type LoginMethod,
} from '../model'

const { t } = useI18n()
const props = defineProps({
  open: { type: Boolean, required: true },
  method: { type: String as PropType<LoginMethod>, required: true },
  editing: { type: Object as PropType<LoginConfig>, default: undefined },
  records: { type: Array as PropType<LoginConfig[]>, required: true },
})
const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'save', value: LoginConfigDraft): void
}>()

const formRef = ref<FormInstance>()
const draft = reactive<LoginConfigDraft>(createDraft('wechat'))
const initialSnapshot = ref('')
const requiredRules = computed(() => [{ required: true, whitespace: true, message: t('ThirdPartyLogin.required') }])

watch(() => props.open, async (open) => {
  if (!open) return
  Object.assign(draft, createDraft(props.method), props.editing || {})
  initialSnapshot.value = JSON.stringify(draft)
  await nextTick()
  formRef.value?.clearValidate()
})

// 新建时切换方式，清除旧方式参数和自选图标，恢复新方式的默认图标。
watch(() => draft.method, (method, previous) => {
  if (!props.open || props.editing || method === previous) return
  const { name, displayName } = draft
  Object.assign(draft, createDraft(method), { name, displayName })
  formRef.value?.clearValidate()
})

function handleOpenChange(open: boolean) {
  if (!open && JSON.stringify(draft) !== initialSnapshot.value
    && !window.confirm(t('ThirdPartyLogin.unsavedChangesConfirm'))) return
  emit('update:open', open)
  if (!open) Object.assign(draft, createDraft('wechat'))
}

async function selectIcon(file: File) {
  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    message.error(t('ThirdPartyLogin.iconInvalid'))
    return false
  }
  if (file.size > 2 * 1024 * 1024) {
    message.error(t('ThirdPartyLogin.iconTooLarge'))
    return false
  }
  const reader = new FileReader()
  const method = draft.method
  reader.onload = () => {
    if (props.open && draft.method === method && typeof reader.result === 'string') {
      draft.iconDataUrl = reader.result
    }
  }
  reader.readAsDataURL(file)
  return false
}

async function submit() {
  try {
    await formRef.value?.validate()
  } catch { return }
  if (hasDuplicateIdentifier(props.records, draft, props.editing?.id)) {
    message.error(t('ThirdPartyLogin.duplicateIdentifier'))
    return
  }
  emit('save', { ...draft })
  Object.assign(draft, createDraft('wechat'))
}
</script>

<style scoped>
.method-picker { display: grid; width: 100%; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-2); }
.method-picker :deep(.ant-radio-button-wrapper) { min-width: 0; padding: 0; border-inline-start-width: 1px; border-radius: var(--r-2); text-align: center; }
.method-picker :deep(.ant-radio-button-wrapper::before) { display: none; }
.method-picker__label, .method-locked { display: inline-flex; align-items: center; gap: var(--space-2); }
.method-picker__label img, .method-locked img { width: 1.125rem; height: 1.125rem; object-fit: contain; }
.method-locked .form-help { margin: 0 0 0 var(--space-2); }
.callback-row { display: flex; gap: var(--space-2); }
.callback-row .ant-input { min-width: 0; }
.drawer-section-title {
  color: var(--ink-1);
  font-size: var(--fs-14);
  font-weight: 600;
  margin: var(--space-4) 0 var(--space-3);
}
.form-help { color: var(--ink-4); font-size: var(--fs-12); margin-top: var(--space-1); }
.secret-notice { margin-bottom: var(--space-4); }
@media (max-width: 600px) {
  .method-picker { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
