<script setup lang="ts">
import { computed, nextTick, ref, useSlots, watch } from 'vue'
import { useElementSize } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { Empty } from 'ant-design-vue'
import type { AssetDimensionOption } from '@jetlinks-web-core/components/AssetOwnershipCondition'
import type { ConditionOptionPanelConfig } from '@jetlinks-web-core/components/ConditionFilter'
import { useOwnershipOrganizationTree } from './useOwnershipOrganizationTree'
import { useSelectedTagOverflow } from './useSelectedTagOverflow'

const props = defineProps<{
  value: string[]
  options?: AssetDimensionOption[]
  config?: ConditionOptionPanelConfig
  multiple?: boolean
  embedded?: boolean
  selectedOnly?: boolean
  reviewValues?: string[]
  focusValue?: string
}>()
const emit = defineEmits<{
  (event: 'update:value', ids: string[]): void
  (event: 'submit'): void
  (event: 'view-change'): void
  (event: 'options-visible', ids: string[]): void
}>()
const { t } = useI18n()
const key = 'ProjectApplication.ownershipTree.'
const slots = useSlots()
const inline = computed(() => !!props.embedded && !!slots['option-extra'])
const { keyword, loading, failed, retry, selected, treeData, listMode, expandedKeys, onExpand, onCheck, remove } =
  useOwnershipOrganizationTree(
    props,
    (ids) => emit('update:value', ids),
    () => inline.value
  )
const viewport = ref<HTMLElement>()
const { height } = useElementSize(viewport)
const tree = ref<{ scrollTo: (position: { top: number } | { key: string; align: 'auto' }) => void }>()
let focusedValue: string | undefined
watch([() => props.focusValue, loading], ([value, pending]) => {
  if (!pending && value && value !== focusedValue) {
    focusedValue = value
    nextTick(() => tree.value?.scrollTo({ key: value, align: 'auto' }))
  }
})
let browseScroll = 0
const scrollTop = ref(0)
const rememberScroll = (event: Event) => {
  scrollTop.value = (event.target as HTMLElement).scrollTop
  if (!listMode.value) browseScroll = scrollTop.value
}
// 只报告当前视口及少量预读行；关联状态由宿主批量读取，组织树不依赖资产接口。
const visibleOptions = computed(() => {
  const start = Math.max(0, Math.floor(scrollTop.value / 44) - 3)
  const end = start + Math.ceil((height.value || 352) / 44) + 6
  const rows: string[] = [],
    expanded = new Set(expandedKeys.value)
  let index = 0
  const visit = (nodes: typeof treeData.value) => {
    for (const node of nodes) {
      if (index >= end) break
      if (index++ >= start) rows.push(node.key)
      if (node.children && expanded.has(node.key)) visit(node.children)
    }
  }
  visit(treeData.value)
  return rows
})
watch(
  () => JSON.stringify(visibleOptions.value),
  () => {
    if (inline.value) emit('options-visible', visibleOptions.value)
  },
  { immediate: true }
)
// 搜索与核对均为临时视图，回到目录时恢复原滚动位置与展开状态。
watch(listMode, (active) => {
  scrollTop.value = active ? 0 : browseScroll
  nextTick(() => tree.value?.scrollTo({ top: scrollTop.value }))
})
watch(keyword, () => {
  if (listMode.value) {
    scrollTop.value = 0
    nextTick(() => tree.value?.scrollTo({ top: 0 }))
  }
})
watch(
  () => props.selectedOnly,
  (active) => {
    if (active) keyword.value = ''
  }
)
watch(treeData, () => emit('view-change'))
const { container: selectedContainer, moreMeasure, layout, hiddenCount } = useSelectedTagOverflow(() => selected.value)
const popupContainer = ref<HTMLElement>()
// 浮层留在父筛选弹层的层叠上下文中，避开已选标签的 overflow 裁剪。
const getPopupContainer = (trigger: HTMLElement) => popupContainer.value || trigger.ownerDocument.body
</script>

<template>
  <div
    ref="popupContainer"
    class="ownership-organization-tree"
    :class="{ 'ownership-organization-tree--embedded': embedded, 'ownership-organization-tree--inline': inline }"
  >
    <span
      v-if="inline && selectedOnly"
      class="ownership-organization-tree__selected-heading"
    >
      {{ t(key + 'selected', { count: value.length }) }}
    </span>
    <a-input
      v-else
      v-model:value="keyword"
      :placeholder="t(key + 'search')"
      allow-clear
    />
    <div
      v-if="!embedded && (selected.length || $slots['selection-extra'])"
      class="ownership-organization-tree__selection-row"
    >
      <div
        ref="selectedContainer"
        class="ownership-organization-tree__selected"
        :style="{ maxHeight: `${layout.height}px` }"
      >
        <a-tag
          v-for="(item, index) in selected"
          :key="item.value"
          :title="item.label"
          data-selection-tag
          :style="{ visibility: index < layout.count ? 'visible' : 'hidden' }"
          closable
          @close.prevent="remove(item.value)"
        >
          <span class="ownership-organization-tree__tag-label">{{ item.label }}</span>
        </a-tag>
        <a-popover
          v-if="hiddenCount"
          placement="bottomLeft"
          trigger="hover"
          :get-popup-container="getPopupContainer"
        >
          <template #content>
            <div class="ownership-organization-tree__all-selected">
              <a-tag
                v-for="item in selected"
                :key="item.value"
                closable
                @close.prevent="remove(item.value)"
              >
                {{ item.label }}
              </a-tag>
            </div>
          </template>
          <a-tag
            class="ownership-organization-tree__more"
            :style="{ left: `${layout.left}px`, top: `${layout.top}px` }"
          >
            +{{ hiddenCount }}
          </a-tag>
        </a-popover>
        <span
          ref="moreMeasure"
          class="ownership-organization-tree__measure"
          aria-hidden="true"
        >
          <a-tag>+{{ selected.length }}</a-tag>
        </span>
      </div>
      <div
        v-if="$slots['selection-extra']"
        class="ownership-organization-tree__selection-extra"
      >
        <slot name="selection-extra" />
      </div>
    </div>
    <div
      ref="viewport"
      class="ownership-organization-tree__viewport"
      @scroll.capture="rememberScroll"
    >
      <a-spin
        class="ownership-organization-tree__body"
        :spinning="loading"
      >
        <a-tree
          ref="tree"
          v-if="treeData.length && !failed"
          :tree-data="treeData"
          :checked-keys="{ checked: value, halfChecked: [] }"
          :expanded-keys="expandedKeys"
          :auto-expand-parent="false"
          :selectable="multiple === false"
          :selected-keys="multiple === false ? value : []"
          :height="inline ? Math.max(80, height) : embedded ? 176 : 240"
          :class="{ 'ownership-organization-tree__list': listMode }"
          virtual
          :checkable="multiple !== false"
          check-strictly
          block-node
          @check="onCheck"
          @expand="onExpand"
          @select="(_, info) => emit('update:value', [String(info.node.key)])"
        >
          <template
            v-if="inline"
            #title="node"
          >
            <div class="ownership-organization-tree__node">
              <span class="ownership-organization-tree__copy">
                <span :title="node.title">{{ node.title }}</span>
                <small
                  v-if="listMode && node.path"
                  :title="node.path"
                >
                  {{ node.path }}
                </small>
              </span>
              <span class="ownership-organization-tree__extra">
                <slot
                  name="option-extra"
                  :option="node.option"
                />
              </span>
            </div>
          </template>
        </a-tree>
        <a-alert
          v-else-if="failed"
          type="error"
          show-icon
          :message="t(key + 'loadFailed')"
        >
          <template #action>
            <a-button
              size="small"
              @click="retry"
            >
              {{ t(key + 'retry') }}
            </a-button>
          </template>
        </a-alert>
        <a-empty
          v-else-if="!loading && !failed"
          :description="t(key + 'empty')"
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
        />
      </a-spin>
    </div>
    <span
      v-if="!embedded"
      class="ownership-organization-tree__hint"
    >
      {{ t(key + 'hint') }}
    </span>
    <a-button
      v-if="!embedded"
      type="primary"
      :disabled="!value.length || loading || failed"
      @click="emit('submit')"
    >
      {{ t(key + 'apply') }}
    </a-button>
  </div>
</template>

<style scoped>
.ownership-organization-tree {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.ownership-organization-tree__selection-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
}
.ownership-organization-tree__selected {
  position: relative;
  display: flex;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
  gap: var(--space-1);
  overflow: hidden;
}
.ownership-organization-tree__selection-extra {
  flex-shrink: 0;
  margin-left: auto;
  white-space: nowrap;
}
.ownership-organization-tree__selected :deep(.ant-tag) {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  margin: 0;
}
.ownership-organization-tree__tag-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ownership-organization-tree__more {
  position: absolute;
  cursor: pointer;
}
.ownership-organization-tree__measure {
  position: absolute;
  visibility: hidden;
  pointer-events: none;
  white-space: nowrap;
}
.ownership-organization-tree__all-selected {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  max-width: min(24rem, calc(100vw - 2rem));
  max-height: 16rem;
  overflow-y: auto;
}
.ownership-organization-tree__all-selected :deep(.ant-tag) {
  max-width: 100%;
  margin: 0;
  white-space: normal;
  overflow-wrap: anywhere;
}
.ownership-organization-tree__body :deep(.ant-spin-container) {
  min-height: 240px;
}
.ownership-organization-tree--embedded .ownership-organization-tree__body :deep(.ant-spin-container) {
  min-height: 0;
}
.ownership-organization-tree--inline {
  min-height: 0;
}
.ownership-organization-tree--inline .ownership-organization-tree__viewport {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.ownership-organization-tree--inline .ownership-organization-tree__body,
.ownership-organization-tree--inline .ownership-organization-tree__body :deep(.ant-spin-container) {
  height: 100%;
}
.ownership-organization-tree--inline :deep(.ant-tree-treenode) {
  width: 100%;
  align-items: center;
  padding-bottom: 0;
}
.ownership-organization-tree.ownership-organization-tree--inline :deep(.ant-tree .ant-tree-checkbox) {
  align-self: center;
  margin-top: 0;
}
.ownership-organization-tree.ownership-organization-tree--inline :deep(.ant-tree .ant-tree-switcher) {
  align-self: center;
  height: 20px;
  line-height: 20px;
}
.ownership-organization-tree--inline :deep(.ant-tree-node-content-wrapper) {
  flex: 1;
  min-width: 0;
  padding-inline: 4px;
}
.ownership-organization-tree--inline :deep(.ant-tree-title) {
  display: block;
}
.ownership-organization-tree__node {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 112px;
  align-items: center;
  column-gap: 8px;
  min-width: 0;
  height: 44px;
}
.ownership-organization-tree__copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
  font-size: 13px;
  line-height: 20px;
}
.ownership-organization-tree__copy > span,
.ownership-organization-tree__copy > small {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.ownership-organization-tree__copy > small {
  font-size: 11px;
  line-height: 16px;
  color: var(--color-jet-text-secondary);
}
.ownership-organization-tree__extra {
  display: flex;
  align-items: center;
  min-width: 0;
  max-width: 100%;
  width: 112px;
}
.ownership-organization-tree__list :deep(.ant-tree-switcher-noop) {
  display: none;
}
.ownership-organization-tree__selected-heading {
  line-height: 32px;
  color: var(--color-jet-text-secondary);
  font-size: 12px;
}
.ownership-organization-tree__hint {
  color: var(--color-jet-text-secondary);
  font-size: var(--fs-12);
}
</style>
