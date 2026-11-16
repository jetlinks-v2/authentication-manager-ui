<template>
  <SlantedTabs
    class="template-preview"
    :active-key="state.activeTab"
    :options="tabs"
    @update:active-key="$emit('tab-change', $event)"
  >
    <template #default="{ option }">
      <a-spin v-if="option.key === 'document'" :spinning="state.documentLoading">
        <a-alert v-if="state.documentError" type="error" show-icon :message="$t('ProjectApplication.template.documentError')">
          <template #action>
            <a-button size="small" @click="$emit('retry-document')">{{ $t('ProjectApplication.template.retry') }}</a-button>
          </template>
        </a-alert>
        <MarkdownEditor
          v-else-if="!state.documentLoading"
          :model-value="state.document"
          disabled
          :texts="{ emptyDescription: $t('ApplicationTemplate.document.empty') }"
        />
      </a-spin>
      <a-spin v-else :spinning="state.menusLoading">
        <a-alert v-if="state.menusError" type="error" show-icon :message="$t('ProjectApplication.template.menusError')">
          <template #action>
            <a-button size="small" @click="$emit('retry-menus')">{{ $t('ProjectApplication.template.retry') }}</a-button>
          </template>
        </a-alert>
        <a-collapse
          v-else-if="state.menus.length"
          class="template-preview__menus"
          :active-key="state.expandedMenus"
          :bordered="false"
          @change="$emit('menus-change', $event)"
        >
          <a-collapse-panel
            v-for="menu in state.menus"
            :key="menu.key"
            :show-arrow="!!menu.children.length"
            :collapsible="menu.children.length ? undefined : 'disabled'"
          >
            <template #header>
              <TemplatePreviewMenuRow :menu="menu" :show-icon="!menu.children.length" />
            </template>
            <template v-if="menu.children.length" #extra>
              <span class="template-preview__count">{{ $t('ProjectApplication.template.menuCount', { count: menu.children.length }) }}</span>
            </template>
            <a-tree :tree-data="menu.children" :selectable="false" block-node default-expand-all>
              <template #title="node"><TemplatePreviewMenuRow :menu="node" /></template>
            </a-tree>
          </a-collapse-panel>
        </a-collapse>
        <CloudEmpty v-else-if="!state.menusLoading" :description="$t('ProjectApplication.template.noMenus')" />
      </a-spin>
    </template>
  </SlantedTabs>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import SlantedTabs from '@jetlinks-web-core/components/SlantedTabs'
import TemplatePreviewMenuRow from './TemplatePreviewMenuRow.vue'
import type { TemplatePreviewState } from './useTemplatePreview'

defineProps<{ state: TemplatePreviewState }>()
defineEmits<{
  'tab-change': [key: string | number]
  'menus-change': [keys: string | number | Array<string | number>]
  'retry-document': []
  'retry-menus': []
}>()
const { t: $t } = useI18n()
const MarkdownEditor = defineAsyncComponent(() => import('@jetlinks-web-core/components/MarkdownEditor'))
const tabs = computed(() => [
  { key: 'document', label: $t('ProjectApplication.template.document') },
  { key: 'menus', label: $t('ApplicationTemplate.detail.permission') },
])
</script>

<style scoped>
.template-preview {
	display: flex;
	min-height: 0;
	flex: 1;
	flex-direction: column;
}
.template-preview :deep(.slanted-tabs__panel) {
	flex: 1;
	min-height: 0;
	overflow: auto;
	padding: var(--space-4);
}

.template-preview :deep(.ant-spin-nested-loading),
.template-preview :deep(.ant-spin-container) {
	min-height: 14rem;
}

.template-preview__menus {
	background: transparent;
}

.template-preview__menus :deep(.ant-collapse-item) {
	margin-bottom: var(--space-2);
	overflow: hidden;
	border: 1px solid var(--line);
	border-radius: var(--r-2);
}

.template-preview__menus :deep(.ant-collapse-content-box) {
	border-top: 1px solid var(--line);
	background: var(--bg-2);
}

.template-preview__menus :deep(.ant-tree) {
	background: transparent;
}

.template-preview__menus :deep(.ant-tree-treenode) {
	border-bottom: 1px solid var(--line);
}

.template-preview__menus :deep(.ant-tree-title) {
	white-space: normal;
	overflow-wrap: anywhere;
}

.template-preview__menus :deep(.ant-tree-node-content-wrapper),
.template-preview__menus :deep(.ant-collapse-header-text) {
	min-width: 0;
}

.template-preview__count {
	color: var(--ink-4);
	font-size: var(--fs-12);
	white-space: nowrap;
}
</style>
