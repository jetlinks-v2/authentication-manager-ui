<template>
  <PrivatePanel class="private-access" :title="t(guide?.show ? 'privateOverview.accessGuide' : 'privateOverview.quickActions')" :state="state" @retry="$emit('retry')">
    <div v-if="guide?.show" class="private-guide">
      <PrivateGuideLane v-for="lane in guide.lanes" :key="lane.id" :lane="lane" :can-open="canOpen"
        @navigate="$emit('navigate', $event)" @retry="$emit('retry')" />
    </div>
    <div v-else class="private-quick-grid">
      <button v-for="action in actions" :key="action.id" type="button" class="private-quick-action" :disabled="!canOpen(action.target)" @click="$emit('navigate', action.target)">
        <span class="private-quick-icon"><AIcon :type="action.icon || 'AppstoreOutlined'" /></span>
        <span class="private-quick-copy"><strong>{{ action.label || (action.labelKey ? t(action.labelKey) : '') }}</strong><span>{{ action.description || (action.descriptionKey ? t(action.descriptionKey) : '') }}</span></span>
      </button>
    </div>
  </PrivatePanel>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { AIcon } from '@jetlinks-web/components'
import PrivatePanel from './PrivatePanel.vue'
import PrivateGuideLane from './PrivateGuideLane.vue'
import type { HomeRow, HomeTarget } from '../../shared/types'
import type { PrivateGuide } from '../types'

defineProps<{
  guide?: PrivateGuide
  actions: HomeRow[]
  state?: { loading?: boolean; error?: boolean; empty?: boolean }
  canOpen: (target?: HomeTarget) => boolean
}>()
defineEmits<{ navigate: [target?: HomeTarget]; retry: [] }>()
const { t } = useI18n()
</script>

<style scoped lang="less">
.private-access { min-width: 0; }
.private-guide { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: var(--space-4, 1rem); flex: 1; min-width: 0; }
.private-guide > :not(:first-child) { border-inline-start: 1px solid var(--line, #e5e6eb); padding-inline-start: var(--space-4, 1rem); }
@container (max-width: 899px) {
  .private-guide { grid-auto-flow: row; grid-template-columns: minmax(0, 1fr); }
  .private-guide > :not(:first-child) { border-inline-start: 0; padding-inline-start: 0; border-top: 1px solid var(--line, #e5e6eb); padding-top: var(--space-4, 1rem); }
}
.private-quick-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px 10px; }
.private-quick-action { display: flex; align-items: center; gap: 12px; min-width: 0; min-height: 60px; padding: 9px 12px; border: 1px solid var(--line, #e5e6eb); border-radius: var(--r-3, 8px); background: transparent; color: var(--business-component-text, #1f2329); font: inherit; text-align: left; cursor: pointer; transition: border-color .2s, background-color .2s; }
.private-quick-action:hover:not(:disabled) { border-color: var(--business-component-primary, #1677ff); background: var(--home-card-surface, #f7f9fc); }
.private-quick-action:disabled { cursor: default; }
.private-quick-action:focus-visible { outline: 2px solid var(--business-component-primary, #1677ff); outline-offset: 2px; }
.private-quick-icon { display: inline-flex; flex: 0 0 34px; width: 34px; height: 34px; align-items: center; justify-content: center; border-radius: var(--r-2, 6px); background: var(--accent-soft, #e8f3ff); color: var(--business-component-primary, #1677ff); }
.private-quick-icon :deep(.anticon) { font-size: 18px; }
.private-quick-copy { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.private-quick-copy strong { font-size: 13px; font-weight: 600; line-height: 20px; }
.private-quick-copy > span { color: var(--business-component-muted, #646c73); font-size: 12px; line-height: 18px; overflow-wrap: anywhere; }
@container (max-width: 899px) { .private-quick-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@container (max-width: 399px) { .private-quick-grid { grid-template-columns: minmax(0, 1fr); } }
</style>
