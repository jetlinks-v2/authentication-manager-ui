<template>
  <PageChrome>
    <a-button class="template-detail__back" type="text" @click="router.back()">
      <template #icon><AIcon type="LeftOutlined" /></template>
      {{ $t('ApplicationTemplate.detail.back') }}
    </a-button>
  </PageChrome>

  <main class="template-detail">
    <PageChrome flush>
      <ContentPanel class="template-detail__summary-card" fill>
        <TemplateSummary
          :detail="detailState.detail.value"
          :state="detailState.state.value"
          :can-update="canUpdate"
          :saving="basicInfo.busy.value"
          @edit="basicInfo.edit"
          @edit-icon="basicInfo.icon.edit"
          @toggle-state="detailState.toggleState"
        />
      </ContentPanel>
      <SlantedTabs
        :active-key="activeTab"
        :options="tabOptions"
        @change="activeTab = String($event)"
      />
    </PageChrome>

    <FullPage has-padding show-scroll>
      <a-spin :spinning="detailState.loading.value">
        <a-tabs v-model:activeKey="activeTab" class="template-detail-tabs">
          <a-tab-pane key="document" :tab="$t('ApplicationTemplate.detail.document')">
            <DocumentPane
              v-model:draft="detailState.documentDraft.value"
              v-model:i18n-draft="detailState.documentI18nDraft.value"
              :dirty="detailState.documentDirty.value"
              :can-update="canUpdate"
              :saving="detailState.saving.value"
              @reset="resetDocument"
              @save="detailState.saveDocument"
            />
          </a-tab-pane>
          <a-tab-pane v-if="parameters.supported.value" key="config" :tab="$t('ApplicationTemplate.detail.config')">
            <ExternalParameterConfig :state="parameters" :signature="notificationSignature" :can-update="canUpdate && !!detailState.detail.value.id" />
          </a-tab-pane>
          <a-tab-pane key="permission" :tab="$t('ApplicationTemplate.detail.permission')">
            <ConfigPane :state="menuConfig" />
          </a-tab-pane>
          <a-tab-pane v-if="parameters.supported.value" key="grants" :tab="$t('ApplicationTemplate.detail.grants')">
            <GrantPanel v-if="activeTab === 'grants'" :target-id="templateId" :target-type="TEMPLATE_GRANT_TARGET" />
          </a-tab-pane>
        </a-tabs>
      </a-spin>
    </FullPage>
  </main>
  <ApplicationTemplateCreateDialog v-if="basicInfo.open.value" :edit-state="basicInfo" />
  <a-modal
    v-if="basicInfo.icon.open.value"
    :open="basicInfo.icon.open.value"
    :title="$t('ApplicationTemplate.field.icon')"
    :ok-text="$t('ApplicationTemplate.common.save')"
    :confirm-loading="basicInfo.submitting.value"
    :closable="!basicInfo.busy.value"
    :mask-closable="!basicInfo.busy.value"
    :keyboard="!basicInfo.busy.value"
    :cancel-button-props="{ disabled: basicInfo.busy.value }"
    :ok-button-props="{ disabled: basicInfo.disabled.value }"
    @ok="basicInfo.icon.save"
    @cancel="basicInfo.icon.cancel"
  >
    <a-alert v-if="basicInfo.icon.error.value" type="error" show-icon :message="basicInfo.icon.error.value" />
    <div :inert="basicInfo.disabled.value || undefined">
      <AIconValueEditor v-model="basicInfo.icon.draft.value" :preview-size="56" :preview-fallback="detailState.displayName.value" />
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ContentPanel, PageChrome, SlantedTabs } from '@jetlinks-web-core/components'
import { IconValueEditor as AIconValueEditor } from '@jetlinks-web-core/components/IconValue'
import { useAuthStore } from '@jetlinks-web-core/store'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { TEMPLATE_GRANT_TARGET } from '@authentication-manager-ui/api/application-center/apiApplication'
import ConfigPane from './ConfigPane.vue'
import DocumentPane from './DocumentPane.vue'
import TemplateSummary from './TemplateSummary.vue'
import { useApplicationTemplateDetail } from './useApplicationTemplateDetail'
import { useApplicationTemplateBasicInfo } from './useApplicationTemplateBasicInfo'
import { useApplicationTemplateMenuConfig } from './useApplicationTemplateMenuConfig'
import { useApplicationTemplateParameters } from './useApplicationTemplateParameters'
import { useTemplateNotificationSignature } from './useTemplateNotificationSignature'

defineOptions({ name: 'ApplicationTemplateSave' })

const ExternalParameterConfig = defineAsyncComponent(() => import('./ExternalParameterConfig.vue'))
const GrantPanel = defineAsyncComponent(() => import('../../ThirdPartyApplication/Direct/GrantPanel.vue'))
const ApplicationTemplateCreateDialog = defineAsyncComponent(() => import('../components/ApplicationTemplateCreateDialog.vue'))

const { t: $t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const menuStore = useMenuStore()
const permission = 'application-center/Template'
const activeTab = ref('document')
const templateId = computed(() => String(route.query.id || ''))
const canUpdate = computed(() => authStore.hasPermission(`${permission}:update`))
const detailState = useApplicationTemplateDetail(
  () => templateId.value,
  {
    loadFailed: $t('ApplicationTemplate.message.loadFailed'),
    documentMaxLength: $t('ApplicationTemplate.message.documentMaxLength'),
    saveFailed: $t('ApplicationTemplate.message.saveFailed'),
    updated: name => $t('ApplicationTemplate.message.templateUpdated', { name }),
  },
)
const basicInfo = useApplicationTemplateBasicInfo({
  getTemplateId: () => templateId.value,
  getDetail: () => detailState.detail.value,
  canUpdate: () => canUpdate.value,
  busy: () => detailState.loading.value || detailState.saving.value,
  persist: detailState.updateBasicInfo,
})
const menuConfig = useApplicationTemplateMenuConfig(
  () => templateId.value,
  {
    loadFailed: $t('ApplicationTemplate.config.loadFailed'),
    saved: $t('ApplicationTemplate.config.saved'),
    notReady: $t('ApplicationTemplate.config.notReady'),
    missingMenus: count => $t('ApplicationTemplate.config.missingMenus', { count }),
  },
  () => canUpdate.value,
)
const notificationSignature = useTemplateNotificationSignature(
  () => detailState.detail.value.provider === 'third-party' && detailState.detail.value.id === templateId.value
    ? templateId.value : '',
)
const parameters = useApplicationTemplateParameters(
  () => detailState.detail.value,
  detailState.updateConfiguration,
  {
    saveFailed: $t('ApplicationTemplate.parameters.saveFailed'),
    redirectUriRequired: $t('ApplicationTemplate.parameters.redirectUriRequired'),
    redirectUriInvalid: $t('ApplicationTemplate.parameters.redirectUriInvalid'),
    platformIdInvalid: $t('ApplicationTemplate.parameters.platformIdInvalid'),
    invalidParameter: $t('ApplicationTemplate.parameters.invalidParameter'),
    invalidNotification: $t('ApplicationTemplate.parameters.invalidNotification'),
  },
)
const tabOptions = computed(() => [
  { key: 'document', label: $t('ApplicationTemplate.detail.document') },
  ...(parameters.supported.value
    ? [{ key: 'config', label: $t('ApplicationTemplate.detail.config') }]
    : []),
  { key: 'permission', label: $t('ApplicationTemplate.detail.permission') },
  ...(parameters.supported.value
    ? [{ key: 'grants', label: $t('ApplicationTemplate.detail.grants') }]
    : []),
])

const resetDocument = () => {
  detailState.documentDraft.value = String(
    detailState.detail.value.i18nDocument || detailState.detail.value.document || '',
  )
  detailState.documentI18nDraft.value = {
    ...(detailState.detail.value.i18nMessages?.document || {}),
  }
}

watch(templateId, id => {
  if (!id) {
    menuStore.jumpPage('application-center/Template', {})
    return
  }
  activeTab.value = 'document'
  void Promise.all([
    detailState.load(),
    menuConfig.loadOptions(),
    menuConfig.loadEditor(),
  ])
}, { immediate: true })
</script>

<style scoped>
.template-detail { min-width: 0; min-height: 0; }
.template-detail__back.ant-btn {
  height: auto;
  padding: 0;
  color: var(--jet-theme-text-secondary);
}
.template-detail__back.ant-btn:hover,
.template-detail__back.ant-btn:focus {
  color: var(--jet-theme-primary);
  background: transparent;
}
.template-detail__summary-card { margin-block: var(--space-4); }
.template-detail-tabs { min-height: 100%; }
/* 仅隐藏原页签头，保留内容的懒挂载与切换状态；文档语言页签仍正常显示。 */
.template-detail-tabs :deep(> .ant-tabs-nav) { display: none; }
</style>
