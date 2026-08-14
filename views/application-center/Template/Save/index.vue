<template>
  <j-page-container :show-back="false">
    <template #title>
      <TemplateSummary
        :detail="detailState.detail.value"
        :state="detailState.state.value"
        :can-update="canUpdate"
        :saving="detailState.saving.value"
        @update-name="detailState.updateName"
        @update-description="detailState.updateDescription"
        @update-icon="detailState.updateIcon"
        @toggle-state="detailState.toggleState"
      />
    </template>

    <FullPage show-scroll>
      <a-spin :spinning="detailState.loading.value">
        <a-tabs v-model:activeKey="activeTab" class="template-detail-tabs">
          <a-tab-pane key="document" :tab="$t('ApplicationTemplate.detail.document')">
            <DocumentPane
              v-model:draft="detailState.documentDraft.value"
              :dirty="detailState.documentDirty.value"
              :can-update="canUpdate"
              :saving="detailState.saving.value"
              @reset="resetDocument"
              @save="detailState.saveDocument"
            />
          </a-tab-pane>
          <a-tab-pane key="config" :tab="$t('ApplicationTemplate.detail.config')">
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
        </a-tabs>
      </a-spin>
    </FullPage>
  </j-page-container>
</template>

<script setup lang="ts" name="ApplicationTemplateSave">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@jetlinks-web-core/store'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import ConfigPane from './ConfigPane.vue'
import DocumentPane from './DocumentPane.vue'
import TemplateSummary from './TemplateSummary.vue'
import { useApplicationTemplateDetail } from './useApplicationTemplateDetail'
import { useApplicationTemplateMenuConfig } from './useApplicationTemplateMenuConfig'

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

const resetDocument = () => {
  detailState.documentDraft.value = String(detailState.detail.value.document || '')
}

watch(templateId, id => {
  if (!id) {
    menuStore.jumpPage('application-center/Template', {})
    return
  }
  activeTab.value = 'document'
  void Promise.all([detailState.load(), menuConfig.loadOptions(), menuConfig.loadEditor()])
}, { immediate: true })
</script>

<style scoped>
.template-detail-tabs { min-height: 100%; padding: 0 var(--space-5) var(--space-5); background: var(--bg); }
.template-detail-tabs :deep(.ant-tabs-nav) { margin-bottom: var(--space-5); }
.template-detail-tabs :deep(.ant-tabs-tab) { padding: var(--space-4) 0; }
</style>
