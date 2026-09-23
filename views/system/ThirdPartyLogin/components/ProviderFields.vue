<template>
  <template v-if="draft.method === 'wechat'">
    <a-form-item :label="$t('ThirdPartyLogin.appId')" name="appId" :rules="requiredRules">
      <a-input v-model:value="draft.appId" />
    </a-form-item>
  </template>

  <template v-else-if="draft.method === 'dingtalk'">
    <a-form-item :label="$t('ThirdPartyLogin.appKey')" name="appKey" :rules="requiredRules">
      <a-input v-model:value="draft.appKey" />
    </a-form-item>
  </template>

  <template v-else>
    <a-form-item :label="$t('ThirdPartyLogin.authorizeUrl')" name="authorizationUrl" :rules="urlRules">
      <a-input v-model:value="draft.authorizationUrl" placeholder="https://example.com/oauth/authorize" />
    </a-form-item>
    <a-form-item :label="$t('ThirdPartyLogin.tokenUrl')" name="tokenUrl" :rules="urlRules">
      <a-input v-model:value="draft.tokenUrl" placeholder="https://example.com/oauth/token" />
    </a-form-item>
    <a-form-item :label="$t('ThirdPartyLogin.userInfoUrl')" name="userInfoUrl" :rules="urlRules">
      <a-input v-model:value="draft.userInfoUrl" placeholder="https://example.com/oauth/userinfo" />
    </a-form-item>
    <a-form-item :label="$t('ThirdPartyLogin.clientId')" name="clientId" :rules="requiredRules">
      <a-input v-model:value="draft.clientId" />
    </a-form-item>
  </template>

  <a-form-item :label="secretLabel" name="secret" :rules="secretRules">
    <a-input-password v-model:value="draft.secret" :placeholder="$t('ThirdPartyLogin.secretPlaceholder')" autocomplete="new-password" />
  </a-form-item>

  <a-row v-if="draft.method === 'oauth2'" :gutter="16">
    <a-col :span="12">
      <a-form-item :label="$t('ThirdPartyLogin.scope')" name="scope">
        <a-input v-model:value="draft.scope" placeholder="openid profile" />
      </a-form-item>
    </a-col>
    <a-col :span="12">
      <a-form-item :label="$t('ThirdPartyLogin.userIdField')" name="userIdField" :rules="requiredRules">
        <a-input v-model:value="draft.userIdField" placeholder="sub" />
      </a-form-item>
    </a-col>
  </a-row>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { LoginConfigDraft } from '../model'

const { t } = useI18n()
const props = defineProps({
  draft: { type: Object as PropType<LoginConfigDraft>, required: true },
})

const requiredRules = computed(() => [{ required: true, whitespace: true, message: t('ThirdPartyLogin.required') }])
const urlValidator = (_rule: unknown, value: string) => {
  if (!value) return Promise.resolve()
  try {
    if (['http:', 'https:'].includes(new URL(value).protocol)) return Promise.resolve()
  } catch { /* 无效 URL 由下面的统一提示承接。 */ }
  return Promise.reject(new Error(t('ThirdPartyLogin.invalidUrl')))
}
const urlRules = computed(() => [...requiredRules.value, { validator: urlValidator }])
const secretRules = requiredRules
const secretLabel = computed(() => t(`ThirdPartyLogin.${props.draft.method === 'oauth2'
  ? 'clientSecret'
  : 'appSecret'}`))
</script>
