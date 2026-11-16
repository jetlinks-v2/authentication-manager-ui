<template>
  <a-form-item :label="$t('ThirdPartyLogin.autoCreateUser')" name="autoCreateUser">
    <a-switch v-model:checked="draft.autoCreateUser" />
    <div class="form-help">{{ $t('ThirdPartyLogin.autoCreateUserHint') }}</div>
  </a-form-item>
  <!-- 关闭时卸载建号字段的校验，保留草稿以便重新开启。 -->
  <template v-if="draft.autoCreateUser">
    <a-form-item :label="$t('ThirdPartyLogin.usernamePrefix')" name="usernamePrefix" :rules="usernamePrefixRules">
      <a-input
        v-model:value="draft.usernamePrefix"
        :placeholder="$t('ThirdPartyLogin.usernamePrefixPlaceholder')"
        :maxlength="64"
      />
      <div class="form-help">{{ $t('ThirdPartyLogin.usernamePrefixHint') }}</div>
    </a-form-item>
    <a-form-item :label="$t('ThirdPartyLogin.defaultPasswd')" name="defaultPasswd" :rules="passwordRules">
      <a-input-password
        v-model:value="draft.defaultPasswd"
        :placeholder="$t('ThirdPartyLogin.defaultPasswdPlaceholder')"
        autocomplete="new-password"
      />
      <div class="form-help">{{ $t('ThirdPartyLogin.defaultPasswdHint') }}</div>
    </a-form-item>
    <a-form-item :label="$t('ThirdPartyLogin.defaultRole')" name="roleIdList" :rules="roleRules">
      <form-item-role v-model:value="draft.roleIdList" :extra-props="{ multiple: true }" :show-add="false" />
    </a-form-item>
    <a-form-item :label="$t('ThirdPartyLogin.organization')" name="orgIdList">
      <form-item-org v-model:value="draft.orgIdList" :extra-props="{ multiple: true }" :show-add="false" />
    </a-form-item>
  </template>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { passwordRegEx } from '@jetlinks-web-core/utils/validate'
import type { LoginConfigDraft } from '../model'

type UserCreationDraft = Pick<LoginConfigDraft,
  'autoCreateUser' | 'defaultPasswd' | 'usernamePrefix' | 'roleIdList' | 'orgIdList'>

defineProps({
  draft: { type: Object as PropType<UserCreationDraft>, required: true },
})
const { t } = useI18n()
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
// 与旧应用表单保持相同的长度和强度要求，不修改输入的密码内容。
const passwordRules = computed(() => [
  { required: true, whitespace: true, message: t('ThirdPartyLogin.defaultPasswdPlaceholder') },
  { min: 8, message: t('components.EditForm.949962-88') },
  { max: 64, message: t('components.EditForm.949962-2') },
  {
    validator: (_rule: unknown, value: string) => !value || passwordRegEx(value)
      ? Promise.resolve()
      : Promise.reject(t('components.EditForm.949962-89')),
  },
])
</script>

<style scoped>
.form-help { color: var(--ink-4); font-size: var(--fs-12); margin-top: var(--space-1); }
</style>
