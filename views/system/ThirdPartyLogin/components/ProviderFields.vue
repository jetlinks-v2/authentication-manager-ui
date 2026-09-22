<template>
  <template v-if="draft.method === 'wechat'">
    <a-form-item :label="$t('ThirdPartyLogin.wechatAppType')" name="wechatAppType" required>
      <a-radio-group v-model:value="draft.wechatAppType" class="app-type-picker">
        <a-radio-button value="official">{{ $t('ThirdPartyLogin.wechatAppOfficial') }}</a-radio-button>
        <a-radio-button value="mini">{{ $t('ThirdPartyLogin.wechatAppMini') }}</a-radio-button>
        <a-radio-button value="open">{{ $t('ThirdPartyLogin.wechatAppOpen') }}</a-radio-button>
      </a-radio-group>
    </a-form-item>
    <a-form-item :label="$t('ThirdPartyLogin.appId')" name="appId" :rules="requiredRules">
      <a-input v-model:value="draft.appId" placeholder="demo-app-id" />
    </a-form-item>
  </template>

  <template v-else-if="draft.method === 'dingtalk'">
    <a-form-item :label="$t('ThirdPartyLogin.corpId')" name="corpId" :rules="requiredRules">
      <a-input v-model:value="draft.corpId" placeholder="demo-corp-id" />
    </a-form-item>
    <a-form-item :label="$t('ThirdPartyLogin.appKey')" name="appKey" :rules="requiredRules">
      <a-input v-model:value="draft.appKey" placeholder="demo-app-key" />
    </a-form-item>
    <a-form-item :label="$t('ThirdPartyLogin.syncOrganization')" name="syncOrganization">
      <a-switch v-model:checked="draft.syncOrganization" />
    </a-form-item>
  </template>

  <template v-else-if="draft.method === 'wecom'">
    <a-form-item :label="$t('ThirdPartyLogin.corpId')" name="corpId" :rules="requiredRules">
      <a-input v-model:value="draft.corpId" placeholder="demo-corp-id" />
    </a-form-item>
    <a-form-item :label="$t('ThirdPartyLogin.agentId')" name="agentId" :rules="requiredRules">
      <a-input v-model:value="draft.agentId" placeholder="demo-agent-id" />
    </a-form-item>
  </template>

  <template v-else>
    <a-form-item :label="$t('ThirdPartyLogin.authorizeUrl')" name="authorizationUrl" :rules="urlRules">
      <a-input v-model:value="draft.authorizationUrl" placeholder="https://example.com/oauth/authorize" />
    </a-form-item>
    <a-form-item :label="$t('ThirdPartyLogin.tokenUrl')" name="tokenUrl" :rules="urlRules">
      <a-input v-model:value="draft.tokenUrl" placeholder="https://example.com/oauth/token" />
    </a-form-item>
    <a-form-item :label="$t('ThirdPartyLogin.userInfoUrl')" name="userInfoUrl" :rules="optionalUrlRules">
      <a-input v-model:value="draft.userInfoUrl" placeholder="https://example.com/oauth/userinfo" />
    </a-form-item>
    <a-form-item :label="$t('ThirdPartyLogin.clientId')" name="clientId" :rules="requiredRules">
      <a-input v-model:value="draft.clientId" placeholder="demo-client-id" />
    </a-form-item>
    <a-row :gutter="16">
      <a-col :span="12">
        <a-form-item :label="$t('ThirdPartyLogin.scope')" name="scope">
          <a-input v-model:value="draft.scope" placeholder="openid profile" />
        </a-form-item>
      </a-col>
      <a-col :span="12">
        <a-form-item :label="$t('ThirdPartyLogin.userIdField')" name="userIdField">
          <a-input v-model:value="draft.userIdField" placeholder="sub" />
        </a-form-item>
      </a-col>
    </a-row>
  </template>

  <a-form-item :label="secretLabel" name="secret" :rules="secretRules">
    <a-input-password v-model:value="draft.secret" placeholder="demo-example-secret" autocomplete="new-password" />
  </a-form-item>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { isExampleSecret, type LoginConfigDraft } from '../model'

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
const optionalUrlRules = [{ validator: urlValidator }]
const secretRules = computed(() => [{
  validator: (_rule: unknown, value: string) => isExampleSecret(value)
    ? Promise.resolve()
    : Promise.reject(new Error(t('ThirdPartyLogin.exampleSecretHint'))),
}])
const secretLabel = computed(() => t(`ThirdPartyLogin.${props.draft.method === 'oauth2'
  ? 'clientSecret'
  : props.draft.method === 'wecom' ? 'secret' : 'appSecret'}`))
</script>

<style scoped>
.app-type-picker { display: grid; width: 100%; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-2); }
.app-type-picker :deep(.ant-radio-button-wrapper) { min-width: 0; padding: 0; border-inline-start-width: 1px; border-radius: var(--r-2); text-align: center; }
.app-type-picker :deep(.ant-radio-button-wrapper::before) { display: none; }
@media (max-width: 600px) {
  .app-type-picker { grid-template-columns: 1fr; }
}
</style>
