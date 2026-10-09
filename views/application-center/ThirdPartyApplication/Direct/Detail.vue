<template>
  <j-page-container>
    <div class="direct-detail">
      <div class="detail-head">
        <a-button type="text" :aria-label="$t('ThirdPartyApplication.back')" @click="back"><AIcon type="ArrowLeftOutlined" /></a-button>
        <div class="heading"><h1>{{ application?.name || $t('ThirdPartyApplication.detail') }}</h1><p>{{ $t('ThirdPartyApplication.direct.subtitle') }}</p></div>
        <a-space v-if="application">
          <a-badge :status="apiState(application) === 'enabled' ? 'success' : 'default'" :text="$t('ApiApplication.status.' + apiState(application))" />
          <a-popconfirm :title="$t(apiState(application) === 'enabled' ? 'ThirdPartyApplication.direct.disableConfirm' : 'ThirdPartyApplication.direct.enableConfirm')" @confirm="toggle">
            <a-button :loading="saving">{{ $t(apiState(application) === 'enabled' ? 'ApiApplication.actions.disable' : 'ApiApplication.actions.enable') }}</a-button>
          </a-popconfirm>
          <a-popconfirm :title="$t('ThirdPartyApplication.direct.deleteConfirm')" @confirm="remove"><a-button danger :disabled="saving">{{ $t('ApiApplication.actions.delete') }}</a-button></a-popconfirm>
        </a-space>
      </div>
      <a-alert v-if="error" type="error" show-icon :message="error" class="detail-alert" />
      <a-spin :spinning="loading">
        <div v-if="application" class="detail-content">
          <a-tabs v-model:active-key="activeTab">
            <a-tab-pane key="basic" :tab="$t('ThirdPartyApplication.tab.basic')" />
            <a-tab-pane key="grants" :tab="$t('ThirdPartyApplication.direct.grants')" />
            <a-tab-pane key="oauth" :tab="$t('ThirdPartyApplication.tab.oauth')" />
            <a-tab-pane key="subscriptions" :tab="$t('ApiApplication.subscription.title')" />
          </a-tabs>
          <div v-if="activeTab === 'basic'">
            <a-descriptions :column="1" bordered size="small">
              <a-descriptions-item :label="$t('ThirdPartyApplication.direct.applicationId')"><a-typography-text copyable :content="application.id">{{ application.id }}</a-typography-text></a-descriptions-item>
              <a-descriptions-item :label="$t('ApiApplication.columns.createTime')">{{ formatTime(application.createTime) }}</a-descriptions-item>
            </a-descriptions>
            <a-form layout="vertical" class="basic-form">
              <a-form-item :label="$t('ThirdPartyApplication.name')" required><a-input v-model:value="form.name" :disabled="saving" /></a-form-item>
              <a-form-item :label="$t('ThirdPartyApplication.description')"><a-textarea v-model:value="form.description" :rows="3" :disabled="saving" /></a-form-item>
              <a-button type="primary" :loading="saving" :disabled="!form.name.trim()" @click="save">{{ $t('ApiApplication.actions.save') }}</a-button>
            </a-form>
          </div>
          <GrantPanel v-else-if="activeTab === 'grants'" :key="application.id" :application-id="application.id" />
          <div v-else-if="activeTab === 'oauth'">
            <a-alert type="info" show-icon class="detail-alert" :message="$t('ThirdPartyApplication.direct.oauthHint')" />
            <CredentialPanel :key="application.id" :application-id="application.id" :active="true" />
          </div>
          <SubscriptionPanel v-else-if="activeTab === 'subscriptions'" :key="application.id" :application="application" />
        </div>
        <a-empty v-else-if="!loading" :description="$t('ThirdPartyApplication.direct.notFound')"><a-button @click="load">{{ $t('ThirdPartyApplication.project.refresh') }}</a-button></a-empty>
      </a-spin>
    </div>
  </j-page-container>
</template>
<script setup lang="ts" name="DirectThirdPartyDetail">
import { useI18n } from 'vue-i18n'
import { useDirectDetail } from './useDirectDetail'
import { apiState } from '../applicationUtils'
import { formatTime } from '../integrationUtils'
import CredentialPanel from '../Detail/CredentialPanel.vue'
import SubscriptionPanel from '../components/SubscriptionPanel.vue'
import GrantPanel from './GrantPanel.vue'
const { t: $t } = useI18n()
const { application, loading, saving, error, form, activeTab, load, back, save, toggle, remove } = useDirectDetail()
</script>
<style scoped>
.direct-detail { padding: var(--space-4); min-height: 100%; background: var(--bg); }
.detail-head { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }.heading { flex: 1; }
h1 { margin: 0; font-size: var(--fs-20); }p { color: var(--ink-4); margin: 4px 0 0; }.detail-alert { margin-bottom: 16px; }
.detail-content { padding: var(--space-4); background: var(--bg-card, #fff); border-radius: var(--r-2); }.basic-form { margin-top: 20px; max-width: 680px; }
</style>
