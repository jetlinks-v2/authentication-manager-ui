<template>
  <a-modal
    :open="open"
    :title="$t('ProjectApplication.user.addTitle')"
    :ok-text="$t('ProjectApplication.user.add')"
    :cancel-text="$t('ProjectApplication.common.cancel')"
    destroy-on-close
    @ok="confirm"
    @cancel="close"
  >
    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
      <a-form-item :label="$t('ProjectApplication.user.name')" name="name">
        <a-input v-model:value="form.name" :maxlength="64" :placeholder="$t('ProjectApplication.user.namePlaceholder')" />
      </a-form-item>
      <a-form-item :label="$t('ProjectApplication.user.username')" name="username" validate-first>
        <a-input v-model:value="form.username" :maxlength="64" :placeholder="$t('ProjectApplication.user.usernamePlaceholder')" />
      </a-form-item>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item :label="$t('ProjectApplication.user.phone')" name="phone">
            <a-input v-model:value="form.phone" :maxlength="20" :placeholder="$t('ProjectApplication.user.phonePlaceholder')" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="$t('ProjectApplication.user.email')" name="email">
            <a-input v-model:value="form.email" :maxlength="64" :placeholder="$t('ProjectApplication.user.emailPlaceholder')" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item :label="$t('ProjectApplication.user.role')" name="roleId">
        <a-select
          v-model:value="form.roleId"
          :options="roleOptions"
          :placeholder="$t('ProjectApplication.user.rolePlaceholder')"
        />
      </a-form-item>
      <a-form-item :label="$t('ProjectApplication.user.password')" name="password">
        <a-input-password v-model:value="form.password" :maxlength="64" :placeholder="$t('ProjectApplication.user.passwordPlaceholder')" />
      </a-form-item>
      <a-form-item :label="$t('ProjectApplication.user.confirmPassword')" name="confirmPassword">
        <a-input-password
          v-model:value="form.confirmPassword"
          :maxlength="64"
          :placeholder="$t('ProjectApplication.user.confirmPasswordPlaceholder')"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts" name="ProjectApplicationUserCreateModal">
import type { PropType } from 'vue'
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FormInstance } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import { passwordRegEx } from '@jetlinks-web-core/utils/validate'
import { validateField_api as validateUserField } from '@authentication-manager-ui/api/system/user'
import { resultOf } from '../../applicationModel'
import type { ApplicationRole, ApplicationUserDraft } from '../../types'

interface FieldValidationResult {
  passed?: boolean
  reason?: string
}

const props = defineProps({
  open: { type: Boolean, default: false },
  roles: { type: Array as PropType<ApplicationRole[]>, default: () => [] },
})
const emits = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm', draft: ApplicationUserDraft): void
}>()
const { t: $t } = useI18n()
const formRef = ref<FormInstance>()
const form = reactive<ApplicationUserDraft>({
  name: '',
  username: '',
  phone: '',
  email: '',
  roleId: '',
  password: '',
  confirmPassword: '',
})

const roleOptions = computed(() => props.roles.map(role => ({ label: role.name, value: role.id })))

const validateRemoteField = async (
  type: 'username' | 'password',
  value: string,
  fallback: string,
) => {
  const result = resultOf<FieldValidationResult>(await validateUserField(type, value))
  return result?.passed ? Promise.resolve() : Promise.reject(result?.reason || fallback)
}

const validateUsername = async (_rule: Rule, value: string) => {
  const username = String(value || '')
  if (!username) return Promise.reject($t('ProjectApplication.user.usernamePlaceholder'))
  if (/[\u4e00-\u9fa5]/.test(username)) return Promise.reject($t('ProjectApplication.user.usernamePattern'))
  return validateRemoteField('username', username, $t('ProjectApplication.user.usernameInvalid'))
}

const validatePassword = async (_rule: Rule, value: string) => {
  const password = String(value || '')
  if (!password) return Promise.reject($t('ProjectApplication.user.passwordPlaceholder'))
  if (password.length < 8) return Promise.reject($t('ProjectApplication.user.passwordLength'))
  if (!passwordRegEx(password)) return Promise.reject($t('ProjectApplication.user.passwordFormat'))
  return validateRemoteField('password', password, $t('ProjectApplication.user.passwordFormat'))
}

const validateConfirmPassword = (_rule: Rule, value: string) => {
  if (!value) return Promise.reject($t('ProjectApplication.user.confirmPasswordPlaceholder'))
  return value === form.password
    ? Promise.resolve()
    : Promise.reject($t('ProjectApplication.user.passwordMismatch'))
}

const rules = computed<Record<string, Rule[]>>(() => ({
  name: [{ required: true, message: $t('ProjectApplication.user.namePlaceholder') }],
  username: [{ required: true, validator: validateUsername, trigger: 'blur' }],
  phone: [{ pattern: /^1[3456789]\d{9}$/, message: $t('ProjectApplication.user.phoneInvalid'), trigger: 'blur' }],
  email: [{ type: 'email' as const, message: $t('ProjectApplication.user.emailInvalid'), trigger: 'blur' }],
  roleId: [{ required: true, message: $t('ProjectApplication.user.roleRequired') }],
  password: [{ required: true, validator: validatePassword, trigger: 'blur' }],
  confirmPassword: [{ required: true, validator: validateConfirmPassword, trigger: 'blur' }],
}))

const resetForm = () => {
  Object.assign(form, {
    name: '',
    username: '',
    phone: '',
    email: '',
    roleId: props.roles[0]?.id || '',
    password: '',
    confirmPassword: '',
  })
  nextTick(() => formRef.value?.clearValidate())
}

watch(() => props.open, open => {
  if (open) resetForm()
})
watch(() => props.roles, roles => {
  if (!roles.some(role => role.id === form.roleId)) form.roleId = roles[0]?.id || ''
}, { deep: true })

const close = () => emits('update:open', false)

const confirm = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  emits('confirm', { ...form })
  close()
}
</script>
