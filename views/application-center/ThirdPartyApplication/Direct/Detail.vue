<template>
  <DefineTextFeedback v-slot="{ field }">
    <div v-if="textState[field].saving || textState[field].error"
      class="text-feedback" :class="{ 'text-feedback--error': textState[field].error }"
      :role="textState[field].error ? 'alert' : 'status'" :aria-live="textState[field].error ? 'assertive' : 'polite'">
      <template v-if="textState[field].saving">
        <a-spin size="small" />{{ $t('ThirdPartyApplication.direct.autosave.saving') }}
      </template>
      <template v-else-if="textState[field].error">
        <AIcon type="ExclamationCircleOutlined" /><span>{{ textState[field].error }}</span>
        <a-button type="link" size="small" :disabled="saving" @click="saveText(field, form[field])">{{ $t('ThirdPartyApplication.direct.autosave.retry') }}</a-button>
      </template>
    </div>
  </DefineTextFeedback>
  <j-page-container v-bind="$attrs">
    <div class="direct-detail">
      <PageChrome :flush="!!application">
        <ContentPanel class="application-summary" fill>
          <div class="summary-back">
            <a-tooltip :title="$t('ThirdPartyApplication.back')">
              <a-button type="text" shape="circle" :aria-label="$t('ThirdPartyApplication.back')" @click="back">
                <template #icon><AIcon type="ArrowLeftOutlined" /></template>
              </a-button>
            </a-tooltip>
          </div>
          <div class="summary-icon"><AIcon type="ApiOutlined" /></div>
          <div class="summary-main">
            <div class="identity-row">
              <h1>
                <span v-if="!application">{{ $t('ThirdPartyApplication.detail') }}</span>
                <span v-else-if="saving || textState.name.saving">{{ form.name }}</span>
                <Editable v-else class="summary-name" :value="form.name"
                  :component-props="{ 'aria-label': $t('ThirdPartyApplication.name') }" @change="saveText('name', $event)" />
              </h1>
              <MetaChip v-if="application" :tone="apiState(application) === 'enabled' ? 'ok' : 'default'">
                {{ $t('ApiApplication.status.' + apiState(application)) }}
              </MetaChip>
            </div>
            <TextFeedback field="name" />
            <template v-if="application">
              <div class="summary-meta">
                <span class="summary-id">
                  <span>{{ $t('ThirdPartyApplication.direct.applicationId') }}</span>
                  <a-typography-text type="secondary" copyable :content="application.id">{{ application.id }}</a-typography-text>
                </span>
                <span class="summary-created-at"><AIcon type="ClockCircleOutlined" />{{ $t('ThirdPartyApplication.direct.createdAt', { time: formatTime(application.createTime) }) }}</span>
              </div>
              <div class="summary-description-row">
                <span class="description-label">{{ $t('ThirdPartyApplication.description') }}</span>
                <a-textarea v-model:value="form.description" class="summary-description" :bordered="false" :auto-size="{ minRows: 1, maxRows: 3 }"
                  :disabled="saving || textState.description.saving" :placeholder="$t('comm.table.empty')"
                  :aria-label="$t('ThirdPartyApplication.description')" @blur="saveText('description', form.description)" />
              </div>
              <TextFeedback field="description" />
            </template>
          </div>
          <PageActions v-if="application" class="summary-actions">
            <a-popconfirm v-if="apiState(application) === 'disabled'" :disabled="saving || textSaving" :title="$t('ThirdPartyApplication.direct.deleteConfirm')" @confirm="remove">
              <a-button danger :disabled="saving || textSaving"><template #icon><AIcon type="DeleteOutlined" /></template>{{ $t('ApiApplication.actions.delete') }}</a-button>
            </a-popconfirm>
            <a-popconfirm :disabled="saving || textSaving" :title="$t(apiState(application) === 'enabled' ? 'ThirdPartyApplication.direct.disableConfirm' : 'ThirdPartyApplication.direct.enableConfirm')" @confirm="toggle">
              <a-button :loading="saving" :disabled="textSaving">
                {{ $t(apiState(application) === 'enabled' ? 'ThirdPartyApplication.direct.disable' : 'ApiApplication.actions.enable') }}
              </a-button>
            </a-popconfirm>
          </PageActions>
        </ContentPanel>
        <SlantedTabs v-if="application" :active-key="activeTab" :options="tabOptions" @change="activeTab = String($event)" />
      </PageChrome>
      <a-alert v-if="error" type="error" show-icon :message="error" class="detail-alert" />
      <a-spin :spinning="loading">
        <div v-if="application" class="detail-workspace">
          <CredentialPanel v-if="activeTab === 'basic'" :key="application.id" :application-id="application.id" :active="true" compact />
          <AccessGuide v-else-if="activeTab === 'guide'" @navigate="activeTab = $event" @debug="openDebug" />
          <AccessDebug v-else-if="activeTab === 'debug'" :key="application.id" :application="application" :initial-mode="debugMode" @navigate="activeTab = $event" @logs="openLogs" />
          <GrantPanel v-else-if="activeTab === 'grants'" :key="application.id" :target-id="application.id" />
          <SubscriptionPanel v-else-if="activeTab === 'subscriptions'" :key="application.id" :application="application" />
          <CallLogs v-else-if="activeTab === 'logs'" :key="application.id" :application="application" :initial-filter="logFilter" />
        </div>
        <CloudEmpty v-else-if="!loading" :description="$t('ThirdPartyApplication.direct.notFound')"><a-button @click="load">{{ $t('ThirdPartyApplication.project.refresh') }}</a-button></CloudEmpty>
      </a-spin>
    </div>
  </j-page-container>
</template>
<script setup lang="ts" name="DirectThirdPartyDetail">
import { createReusableTemplate } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import SlantedTabs from '@jetlinks-web-core/components/SlantedTabs'
import { useDirectDetail, type ApplicationTextField } from './useDirectDetail'
import { apiState } from '../applicationUtils'
import { formatTime } from '../integrationUtils'
import CredentialPanel from '../Detail/CredentialPanel.vue'
import SubscriptionPanel from '../components/SubscriptionPanel.vue'
import GrantPanel from './GrantPanel.vue'
import AccessGuide from './AccessGuide.vue'
import AccessDebug from './AccessDebug.vue'
import CallLogs from './CallLogs.vue'
const { t: $t } = useI18n()
const { application, loading, saving, textSaving, textState, error, form, activeTab, tabOptions, debugMode, logFilter, openDebug, openLogs, load, back, saveText, toggle, remove } = useDirectDetail()
const [DefineTextFeedback, TextFeedback] = createReusableTemplate<{ field: ApplicationTextField }>()
</script>
<style scoped>
.direct-detail { min-width: 0; min-height: 100%; }
.application-summary { display: grid; grid-template-columns: auto auto minmax(0, 1fr) auto; align-items: start; gap: var(--space-3); margin-block: var(--space-4); }
.summary-back { display: flex; align-items: center; }
.summary-back :deep(.ant-btn) { color: var(--ink-2); }
.summary-icon { display: grid; width: var(--space-11); height: var(--space-11); place-items: center; flex: none; color: var(--accent); font-size: var(--fs-20); }
.summary-main { display: flex; min-width: 0; flex-direction: column; gap: var(--space-2); }
.identity-row { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2); }
.identity-row h1 { min-width: 0; max-width: 100%; margin: 0; color: var(--ink-1); font-size: var(--fs-20); font-weight: 600; }
.identity-row .summary-name { min-width: 0; max-width: 36rem; padding: 0; border-radius: var(--r-2); overflow-wrap: anywhere; }
.identity-row .summary-name:hover { background: var(--bg-sunken); }
.summary-id { display: inline-flex; align-items: baseline; gap: var(--space-2); min-width: 0; max-width: 100%; color: var(--ink-3); font-size: var(--fs-14); line-height: 1.6; }
.summary-id > span:first-child { flex: none; font-weight: 400; }
.summary-id :deep(.ant-typography) { min-width: 0; margin: 0; font-size: inherit; overflow-wrap: anywhere; }
.summary-meta { display: flex; min-width: 0; align-items: flex-start; flex-wrap: wrap; gap: var(--space-1) var(--space-4); }
.summary-description-row { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: start; gap: var(--space-2); min-width: 0; }
.description-label { color: var(--ink-3); font-size: var(--fs-14); line-height: 1.6; }
.summary-description { width: 100%; min-width: 0; max-width: 100%; margin: 0; padding: 0; border-radius: var(--r-2); color: var(--ink-3); font-size: var(--fs-14); line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
.summary-description:not(:disabled):hover { background: var(--bg-sunken); }
.summary-description:focus { box-shadow: 0 0 0 1px var(--accent); }
.summary-created-at { display: inline-flex; min-width: 0; align-items: baseline; gap: var(--space-1); color: var(--ink-3); font-size: var(--fs-14); line-height: 1.6; overflow-wrap: anywhere; }
.summary-actions { justify-content: flex-end; padding-inline-start: var(--space-3); border-inline-start: 1px solid var(--line); }
.text-feedback { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2); color: var(--ink-4); font-size: var(--fs-12); font-weight: normal; line-height: 1.5; white-space: normal; }
.text-feedback--error { color: var(--danger); }
.text-feedback .ant-btn { height: auto; padding: 0; font-size: inherit; }
.detail-alert { margin-bottom: var(--space-4); }
.detail-workspace { min-width: 0; padding: var(--space-4) 0; }
.detail-workspace :deep(.subscription-panel) {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-4);
  min-width: 0;
  max-width: 100%;
  padding: 0;
}
.detail-workspace :deep(.subscription-toolbar) { align-items: center; flex-wrap: wrap; }
.detail-workspace :deep(.subscription-toolbar .condition-filter) { flex: 1 1 20rem; }
.detail-workspace :deep(.subscription-panel > .subscription-alert) { margin: 0; }
.detail-workspace :deep(.subscription-panel > .pro-table__no-padding) { min-width: 0; max-width: 100%; overflow: hidden; }
.detail-workspace :deep(.subscription-panel .ant-table-thead > tr > th) {
  background: var(--jet-theme-bg-layout);
  color: var(--jet-theme-text-secondary);
  font-size: var(--fs-14);
}
@media (max-width: 48rem) {
  .detail-workspace { padding-block: var(--space-3); }
  .application-summary { grid-template-columns: auto auto minmax(0, 1fr); padding: var(--space-3); }
  .summary-actions { grid-column: 1 / -1; padding-inline-start: 0; border-inline-start: 0; }
}
</style>
