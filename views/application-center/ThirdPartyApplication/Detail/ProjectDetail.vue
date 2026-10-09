<template>
  <j-page-container>
    <div class="third-party-detail">
      <a-alert v-if="contextError" type="warning" show-icon :message="$t(contextError)" />
      <a-spin v-else :spinning="loading">
        <a-alert v-if="error" type="error" show-icon :message="error" class="detail-alert" />
        <template v-if="relation">
          <div class="detail-head">
            <a-button type="text" :aria-label="$t('ThirdPartyApplication.back')" @click="back"><AIcon type="ArrowLeftOutlined" /></a-button>
            <div class="detail-heading"><h1>{{ title }}</h1><p>{{ $t('ThirdPartyApplication.project.integrationId') }}: {{ relation.id }}</p></div>
            <a-badge :status="integrationState(relation.state) === 'enabled' ? 'success' : 'default'" :text="integrationStateLabel(relation, $t)" />
            <a-space wrap>
              <a-button v-if="integrationState(relation.state) !== 'enabled'" type="primary" :disabled="!canEnable" @click="openAction('enabled')">{{ $t('ThirdPartyApplication.project.action.enabled') }}</a-button>
              <template v-else>
                <a-button v-if="apiState(application) !== 'enabled'" type="primary" :disabled="!canEnable" @click="openAction('enabled')">{{ $t('ThirdPartyApplication.project.enableApi') }}</a-button>
                <a-button @click="openAction('disabled')">{{ $t('ThirdPartyApplication.project.action.disabled') }}</a-button>
              </template>
              <a-button danger @click="openAction('removed')">{{ $t('ThirdPartyApplication.project.action.removed') }}</a-button>
            </a-space>
          </div>
          <a-alert v-if="catalogError" type="error" show-icon :message="$t('ThirdPartyApplication.project.catalogError')" :description="catalogError" class="detail-alert" />
          <a-alert v-else-if="!profile" type="warning" show-icon :message="$t('ThirdPartyApplication.project.approvalUnavailable')" class="detail-alert" />
          <a-alert v-if="!runtimeReady" type="warning" show-icon :message="$t('ThirdPartyApplication.project.runtimeContextMissing')" class="detail-alert" />
          <a-alert v-else-if="runtimeError" type="error" show-icon :message="$t('ThirdPartyApplication.project.runtimeStatusUnknown')" :description="runtimeError" class="detail-alert" />
          <a-alert v-else-if="integrationState(relation.state) === 'enabled' && apiState(application) === 'disabled'" type="info" show-icon
            :message="$t('ThirdPartyApplication.project.initialActivationHint')" class="detail-alert" />
          <div class="detail-content">
            <a-tabs v-model:active-key="activeTab">
              <a-tab-pane key="basic" :tab="$t('ThirdPartyApplication.tab.basic')" />
              <a-tab-pane key="grants" :tab="$t('ThirdPartyApplication.tab.grants')" />
              <a-tab-pane key="oauth" :tab="$t('ThirdPartyApplication.tab.oauth')" />
              <a-tab-pane key="subscriptions" :tab="$t('ApiApplication.subscription.title')" />
            </a-tabs>
            <div v-if="activeTab === 'basic'" class="tab-content">
              <a-descriptions :column="1" bordered size="small">
                <a-descriptions-item :label="$t('ThirdPartyApplication.project.projectId')">{{ relation.projectId }}</a-descriptions-item>
                <a-descriptions-item :label="$t('ThirdPartyApplication.project.profileId')">{{ relation.appId }}</a-descriptions-item>
                <a-descriptions-item :label="$t('ThirdPartyApplication.project.integrationId')">{{ relation.id }}</a-descriptions-item>
                <a-descriptions-item :label="$t('ThirdPartyApplication.project.environment')">{{ relation.environment }}</a-descriptions-item>
                <a-descriptions-item :label="$t('ThirdPartyApplication.project.runtimeId')">{{ relation.runtimeId || '-' }}</a-descriptions-item>
                <a-descriptions-item :label="$t('ThirdPartyApplication.project.runtimeApplicationId')">{{ relation.runtimeApplicationId || '-' }}</a-descriptions-item>
                <a-descriptions-item :label="$t('ThirdPartyApplication.project.apiApplicationState')">
                  <a-spin :spinning="runtimeLoading" />
                  {{ apiState(application) ? (typeof application?.state === 'object' && application.state?.text || $t('ApiApplication.status.' + apiState(application))) : $t('ThirdPartyApplication.project.unconfirmed') }}
                </a-descriptions-item>
                <a-descriptions-item :label="$t('ThirdPartyApplication.project.authorizationRevision')">{{ relation.authorizationRevision }}</a-descriptions-item>
                <a-descriptions-item :label="$t('ThirdPartyApplication.project.authorizedAt')">{{ formatTime(relation.authorizedAt) }}</a-descriptions-item>
                <a-descriptions-item :label="$t('ApiApplication.columns.createTime')">{{ formatTime(relation.createTime) }}</a-descriptions-item>
              </a-descriptions>
              <a-popconfirm :title="$t('ThirdPartyApplication.project.discardConfirm')" @confirm="load">
                <a-button class="refresh-button">{{ $t('ThirdPartyApplication.project.refresh') }}</a-button>
              </a-popconfirm>
            </div>
            <AuthorizationPanel v-if="activeTab === 'grants'" :relation="relation" :profile="profile" :runtime-ready="runtimeReady && !!application"
              class="tab-content" @saved="acceptRelation" @reload="load" />
            <template v-if="activeTab === 'oauth' || activeTab === 'subscriptions'">
              <a-spin :spinning="runtimeLoading">
                <template v-if="runtimeReady && application">
                  <CredentialPanel v-if="activeTab === 'oauth'" :key="runtimeApplicationId" :application-id="runtimeApplicationId" :active="true" class="tab-content" />
                  <SubscriptionPanel v-else :key="runtimeApplicationId" :application="application" class="tab-content" />
                </template>
                <a-empty v-else :description="$t('ThirdPartyApplication.project.runtimeUnavailable')" />
              </a-spin>
            </template>
          </div>
        </template>
        <a-empty v-else-if="!loading" :description="$t('ThirdPartyApplication.project.notFound')">
          <a-button @click="back">{{ $t('ThirdPartyApplication.back') }}</a-button>
        </a-empty>
      </a-spin>
    </div>
    <IntegrationStateModal :action="action" @close="action = undefined" @saved="stateSaved" />
  </j-page-container>
</template>
<script setup lang="ts" name="ProjectThirdPartyDetail">
import { useI18n } from 'vue-i18n'
import { useThirdPartyDetail } from './useThirdPartyDetail'
import { apiState } from '../applicationUtils'
import { formatTime, integrationState, integrationStateLabel } from '../integrationUtils'
import CredentialPanel from './CredentialPanel.vue'
import AuthorizationPanel from './AuthorizationPanel.vue'
import SubscriptionPanel from '../components/SubscriptionPanel.vue'
import IntegrationStateModal from '../components/IntegrationStateModal.vue'
const { t: $t } = useI18n()
const { contextError, relation, profile, application, runtimeApplicationId, title, loading, runtimeLoading,
  error, catalogError, runtimeError, runtimeReady, canEnable, activeTab, action, load, back,
  openAction, acceptRelation, stateSaved } = useThirdPartyDetail()
</script>
<style scoped>
.third-party-detail { min-height: 100%; padding: var(--space-4); background: var(--bg); }
.detail-head { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-3); padding: var(--space-4); background: var(--bg-card, #fff); border-radius: var(--r-2); margin-bottom: var(--space-3); }
.detail-heading { flex: 1; min-width: 200px; }.detail-heading h1 { margin: 0; color: var(--ink-1); font-size: var(--fs-20); }.detail-heading p { margin: 4px 0 0; color: var(--ink-4); }
.detail-content { padding: var(--space-4); background: var(--bg-card, #fff); border-radius: var(--r-2); }
.tab-content { padding-top: var(--space-3); }.detail-alert { margin-bottom: 16px; }.refresh-button { margin-top: 16px; }
@media (max-width: 720px) { .third-party-detail { padding: var(--space-2); } }
</style>
