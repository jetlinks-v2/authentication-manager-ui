<template>
  <j-page-container :show-back="false">
    <TemplateSummary
      :detail="detailState.detail.value"
      :state="detailState.state.value"
      :can-update="canUpdate"
      :saving="detailState.saving.value"
      @update-name="detailState.updateName"
      @update-description="detailState.updateDescription"
      @update-template-url="detailState.updateTemplateUrl"
      @update-icon="detailState.updateIcon"
      @toggle-state="detailState.toggleState"
    />

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
          <a-tab-pane key="config" :tab="$t('ApplicationTemplate.detail.config')">
            <ExternalParameterConfig v-if="parameters.supported.value" :state="parameters" :signature="notificationSignature" :can-update="canUpdate && !!detailState.detail.value.id" />
            <ConfigPane
              :can-update="canUpdate"
              :scope-strategy-options="menuConfig.scopeStrategyOptions.value"
              :scope-strategies="menuConfig.strategyDraft.value"
              :default-scope-strategy="menuConfig.defaultScopeStrategy"
              :missing-menu-ids="menuConfig.missingMenuIds.value"
              :editor="menuConfig.editor"
              :loading-editor="menuConfig.loadingEditor.value"
              :saving="menuConfig.saving.value"
              :initialized="menuConfig.initialized.value"
              @set-scope-strategy="menuConfig.setScopeStrategy"
              @save="menuConfig.save"
            />
          </a-tab-pane>
          <a-tab-pane v-if="parameters.supported.value" key="grants" :tab="$t('ApplicationTemplate.detail.grants')">
            <GrantPanel v-if="activeTab === 'grants'" :target-id="templateId" :target-type="TEMPLATE_GRANT_TARGET" />
          </a-tab-pane>
        </a-tabs>
      </a-spin>
    </FullPage>
  </j-page-container>
</template>

<script setup lang="ts" name="ApplicationTemplateSave">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@jetlinks-web-core/store'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { TEMPLATE_GRANT_TARGET } from '@authentication-manager-ui/api/application-center/apiApplication'
import ConfigPane from './ConfigPane.vue'
import DocumentPane from './DocumentPane.vue'
import TemplateSummary from './TemplateSummary.vue'
import { useApplicationTemplateDetail } from './useApplicationTemplateDetail'
import { useApplicationTemplateMenuConfig } from './useApplicationTemplateMenuConfig'
import { useApplicationTemplateParameters } from './useApplicationTemplateParameters'
import { useTemplateNotificationSignature } from './useTemplateNotificationSignature'

const ExternalParameterConfig = defineAsyncComponent(() => import('./ExternalParameterConfig.vue'))
const GrantPanel = defineAsyncComponent(() => import('../../ThirdPartyApplication/Direct/GrantPanel.vue'))

const { t: $t } = useI18n()
const route = useRoute()
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
    nameRequired: $t('ApplicationTemplate.message.nameRequired'),
    nameMaxLength: $t('ApplicationTemplate.message.nameMaxLength'),
    descriptionMaxLength: $t('ApplicationTemplate.message.descriptionMaxLength'),
    templateUrlMaxLength: $t('ApplicationTemplate.message.templateUrlMaxLength'),
    documentMaxLength: $t('ApplicationTemplate.message.documentMaxLength'),
    iconMaxLength: $t('ApplicationTemplate.message.iconMaxLength'),
    updated: name => $t('ApplicationTemplate.message.templateUpdated', { name }),
  },
)
const menuConfig = useApplicationTemplateMenuConfig(
  () => templateId.value,
  {
    loadFailed: $t('ApplicationTemplate.config.loadFailed'),
    saved: $t('ApplicationTemplate.config.saved'),
    notReady: $t('ApplicationTemplate.config.notReady'),
    missingMenus: count => $t('ApplicationTemplate.config.missingMenus', { count }),
  },
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
    signatureRequired: $t('ApplicationTemplate.signature.required'),
  },
  () => notificationSignature.status.value.configured,
)

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
.template-detail-tabs { min-height: 100%; }
.template-detail-tabs :deep(.ant-tabs-nav) { margin-bottom: var(--space-5); }
.template-detail-tabs :deep(.ant-tabs-tab) { padding: var(--space-4) 0; }
</style>
