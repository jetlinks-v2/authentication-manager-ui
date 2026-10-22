<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AssetDimensionOption } from '@jetlinks-web-core/components/AssetOwnershipCondition'
import type { ConditionOptionPanelConfig } from '@jetlinks-web-core/components/ConditionFilter'
import { useOwnershipOrganizationTree } from './useOwnershipOrganizationTree'
import { useSelectedTagOverflow } from './useSelectedTagOverflow'

const props = defineProps<{
  value: string[]
  options?: AssetDimensionOption[]
  config?: ConditionOptionPanelConfig
}>()
const emit = defineEmits<{
  (event: 'update:value', ids: string[]): void
  (event: 'submit'): void
}>()
const { t } = useI18n()
const key = 'ProjectApplication.ownershipTree.'
const { keyword, loading, failed, selected, treeData, expandedKeys, onExpand, onCheck, remove } =
  useOwnershipOrganizationTree(props, ids => emit('update:value', ids))
const { container: selectedContainer, moreMeasure, layout, hiddenCount } = useSelectedTagOverflow(() => selected.value)
const popupContainer = ref<HTMLElement>()
// 浮层留在父筛选弹层的层叠上下文中，避开已选标签的 overflow 裁剪。
const getPopupContainer = (trigger: HTMLElement) => popupContainer.value || trigger.ownerDocument.body
</script>

<template>
  <div ref="popupContainer" class="ownership-organization-tree">
    <a-input v-model:value="keyword" :placeholder="t(key + 'search')" allow-clear />
    <div v-if="selected.length || $slots['selection-extra']" class="ownership-organization-tree__selection-row">
      <div ref="selectedContainer" class="ownership-organization-tree__selected" :style="{ maxHeight: `${layout.height}px` }">
        <a-tag
          v-for="(item, index) in selected" :key="item.value" :title="item.label" data-selection-tag
          :style="{ visibility: index < layout.count ? 'visible' : 'hidden' }"
          closable @close.prevent="remove(item.value)"
        >
          <span class="ownership-organization-tree__tag-label">{{ item.label }}</span>
        </a-tag>
        <a-popover v-if="hiddenCount" placement="bottomLeft" trigger="hover" :get-popup-container="getPopupContainer">
          <template #content>
            <div class="ownership-organization-tree__all-selected">
              <a-tag v-for="item in selected" :key="item.value" closable @close.prevent="remove(item.value)">{{ item.label }}</a-tag>
            </div>
          </template>
          <a-tag class="ownership-organization-tree__more" :style="{ left: `${layout.left}px`, top: `${layout.top}px` }">
            +{{ hiddenCount }}
          </a-tag>
        </a-popover>
        <span ref="moreMeasure" class="ownership-organization-tree__measure" aria-hidden="true"><a-tag>+{{ selected.length }}</a-tag></span>
      </div>
      <div v-if="$slots['selection-extra']" class="ownership-organization-tree__selection-extra">
        <slot name="selection-extra" />
      </div>
    </div>
    <a-spin class="ownership-organization-tree__body" :spinning="loading">
      <a-tree
        v-if="treeData.length && !failed"
        :tree-data="treeData"
        :checked-keys="{ checked: value, halfChecked: [] }" :expanded-keys="expandedKeys"
        :auto-expand-parent="false" :selectable="false" :height="240"
        virtual checkable check-strictly block-node @check="onCheck" @expand="onExpand"
      />
      <a-empty v-else-if="!loading && !failed" :description="t(key + 'empty')" :image="null" />
    </a-spin>
    <span class="ownership-organization-tree__hint">{{ t(key + 'hint') }}</span>
    <a-button type="primary" :disabled="!value.length || loading || failed" @click="emit('submit')">
      {{ t(key + 'apply') }}
    </a-button>
  </div>
</template>

<style scoped>
.ownership-organization-tree { position: relative; display: flex; flex-direction: column; gap: var(--space-2); }
.ownership-organization-tree__selection-row { display: flex; align-items: flex-start; gap: var(--space-2); }
.ownership-organization-tree__selected { position: relative; display: flex; flex: 1; min-width: 0; flex-wrap: wrap; gap: var(--space-1); overflow: hidden; }
.ownership-organization-tree__selection-extra { flex-shrink: 0; margin-left: auto; white-space: nowrap; }
.ownership-organization-tree__selected :deep(.ant-tag) { display: inline-flex; align-items: center; max-width: 100%; margin: 0; }
.ownership-organization-tree__tag-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ownership-organization-tree__more { position: absolute; cursor: pointer; }
.ownership-organization-tree__measure { position: absolute; visibility: hidden; pointer-events: none; white-space: nowrap; }
.ownership-organization-tree__all-selected { display: flex; flex-wrap: wrap; gap: var(--space-1); max-width: min(24rem, calc(100vw - 2rem)); max-height: 16rem; overflow-y: auto; }
.ownership-organization-tree__all-selected :deep(.ant-tag) { max-width: 100%; margin: 0; white-space: normal; overflow-wrap: anywhere; }
.ownership-organization-tree__body :deep(.ant-spin-container) { min-height: 240px; }
.ownership-organization-tree__hint { color: var(--color-jet-text-secondary); font-size: var(--fs-12); }
</style>
