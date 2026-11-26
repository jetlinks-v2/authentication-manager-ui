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
      <PageChrome>
        <PageBack :label="$t('ThirdPartyApplication.back')" @back="back" />
      </PageChrome>
      <PageChrome :flush="!!application">
        <ContentPanel class="application-summary" fill>
          <DetailHeader variant="summary" :title="application ? form.name : $t('ThirdPartyApplication.detail')">
            <template #icon><AIcon type="ApiOutlined" /></template>
            <template #title>
              <span v-if="!application">{{ $t('ThirdPartyApplication.detail') }}</span>
              <span v-else-if="saving || textState.name.saving">{{ form.name }}</span>
              <Editable v-else class="summary-name" :value="form.name"
                :component-props="{ 'aria-label': $t('ThirdPartyApplication.name') }" @change="saveText('name', $event)" />
            </template>
            <template v-if="application" #titleExtra>
              <StatusTag :status="apiState(application) === 'enabled' ? 'success' : 'disabled'" :text="$t('ApiApplication.status.' + apiState(application))" />
            </template>
            <template v-if="application" #meta>
              <DetailMetaItem kind="id" :label="$t('ThirdPartyApplication.direct.applicationId')" :tooltip="$t('DetailMetaItem.copyTooltip', { id: application.id })">
                <a-typography-text :copyable="{ text: application.id, tooltip: false }" :content="application.id"><span>{{ application.id }}</span></a-typography-text>
              </DetailMetaItem>
              <DetailMetaItem kind="time" :label="$t('ApiApplication.columns.createTime')" :value="formatTime(application.createTime)" :tooltip="formatTime(application.createTime)" />
              <DetailMetaItem kind="description" :label="$t('ThirdPartyApplication.description')" multiline>
                <a-textarea v-model:value="form.description" class="summary-description" :bordered="false" :auto-size="{ minRows: 1, maxRows: 3 }"
                  :disabled="saving || textState.description.saving" :placeholder="$t('comm.table.empty')"
                  :aria-label="$t('ThirdPartyApplication.description')" @blur="saveText('description', form.description)" />
                <TextFeedback field="description" />
              </DetailMetaItem>
            </template>
            <template v-if="application && (textState.name.saving || textState.name.error)" #description>
              <TextFeedback field="name" />
            </template>
            <template v-if="application" #actions>
              <a-popconfirm v-if="apiState(application) === 'disabled'" :disabled="saving || textSaving" :title="$t('ThirdPartyApplication.direct.deleteConfirm')" @confirm="remove">
                <a-button danger :disabled="saving || textSaving"><template #icon><AIcon type="DeleteOutlined" /></template>{{ $t('ApiApplication.actions.delete') }}</a-button>
              </a-popconfirm>
              <a-popconfirm :disabled="saving || textSaving" :title="$t(apiState(application) === 'enabled' ? 'ThirdPartyApplication.direct.disableConfirm' : 'ThirdPartyApplication.direct.enableConfirm')" @confirm="toggle">
                <a-button :loading="saving" :disabled="textSaving">
                  {{ $t(apiState(application) === 'enabled' ? 'ThirdPartyApplication.direct.disable' : 'ApiApplication.actions.enable') }}
                </a-button>
              </a-popconfirm>
            </template>
          </DetailHeader>
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
<script setup lang="ts">
import { createReusableTemplate } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import SlantedTabs from '@jetlinks-web-core/components/SlantedTabs'
import PageBack from '@jetlinks-web-core/components/PageBack/index.vue'
import DetailHeader from '@jetlinks-web-core/components/DetailHeader/index.vue'
import DetailMetaItem from '@jetlinks-web-core/components/DetailMetaItem'
import StatusTag from '@jetlinks-web-core/components/StatusTag/index.vue'
import { useDirectDetail, type ApplicationTextField } from './useDirectDetail'
import { apiState } from '../applicationUtils'
import { formatTime } from '../integrationUtils'
import CredentialPanel from '../Detail/CredentialPanel.vue'
import SubscriptionPanel from '../components/SubscriptionPanel.vue'
import GrantPanel from './GrantPanel.vue'
import AccessGuide from './AccessGuide.vue'
import AccessDebug from './AccessDebug.vue'
import CallLogs from './CallLogs.vue'

defineOptions({ name: 'DirectThirdPartyDetail' })
const { t: $t } = useI18n()
const { application, loading, saving, textSaving, textState, error, form, activeTab, tabOptions, debugMode, logFilter, openDebug, openLogs, load, back, saveText, toggle, remove } = useDirectDetail()
const [DefineTextFeedback, TextFeedback] = createReusableTemplate<{ field: ApplicationTextField }>()
</script>
<style scoped>
.direct-detail { min-width: 0; min-height: 100%; }
.application-summary { margin-block: var(--space-4); }
.summary-name { min-width: 0; max-width: 100%; overflow: hidden; padding: 0; border-radius: var(--r-2); text-overflow: ellipsis; white-space: nowrap; }
.summary-name:hover { background: var(--bg-sunken); }
.summary-description { width: 100%; min-width: 0; max-width: 100%; margin: 0; padding: 0; border-radius: var(--r-2); color: var(--jet-theme-text-secondary); font-size: var(--fs-14); line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
.summary-description:not(:disabled):hover { background: var(--bg-sunken); }
.summary-description:focus { box-shadow: 0 0 0 1px var(--accent); }
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
}
</style>
