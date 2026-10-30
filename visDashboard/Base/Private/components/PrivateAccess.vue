<template>
  <PrivatePanel class="private-access" :title="t(guide?.show ? 'privateOverview.accessGuide' : 'privateOverview.quickActions')" :state="state" @retry="$emit('retry')">
    <template v-if="guide?.show" #extra><span class="private-guide-progress">{{ t('privateOverview.guideProgress', { complete: guide.complete, total: guide.total }) }}</span></template>
    <div v-if="guide?.show" class="private-guide">
      <div v-for="lane in guide.lanes" :key="lane.id" class="private-guide-lane">
        <span class="private-guide-name">{{ t(lane.labelKey) }}</span>
        <ol class="private-guide-steps">
          <li v-for="(step, index) in lane.steps" :key="step.id">
            <RightOutlined v-if="index" class="private-guide-arrow" />
            <button type="button" class="private-guide-step" :class="[`is-${step.state}`, { 'is-next': step.next && step.state === 'incomplete' }]"
              :disabled="!canOpen(step.target)" :aria-current="step.next ? 'step' : undefined" @click="$emit('navigate', step.target)">
              <span class="private-guide-mark"><CheckOutlined v-if="step.state === 'complete'" /><span v-else>{{ step.state === 'unknown' ? '?' : index + 1 }}</span></span>
              <span>{{ t(step.labelKey) }}</span>
              <span v-if="step.state === 'unknown'" class="private-guide-unknown">{{ t('privateOverview.metricUnknown') }}</span>
              <span v-else-if="step.next" class="private-guide-action">{{ t(step.actionKey) }} <RightOutlined /></span>
            </button>
          </li>
        </ol>
      </div>
      <div v-if="guide.lanes.some(lane => lane.steps.some(step => step.state === 'unknown'))" class="private-guide-retry">
        <a-button type="link" size="small" @click="$emit('retry')">{{ t('privateOverview.retry') }}</a-button>
      </div>
    </div>
    <div v-else class="private-quick-grid">
      <button v-for="action in actions" :key="action.id" type="button" class="private-quick-action" :disabled="!canOpen(action.target)" @click="$emit('navigate', action.target)">
        <span class="private-quick-icon"><HomeIcon :name="action.icon || action.id" neutral /></span>
        <span class="private-quick-copy"><strong>{{ action.label || (action.labelKey ? t(action.labelKey) : '') }}</strong><span>{{ action.description || (action.descriptionKey ? t(action.descriptionKey) : '') }}</span></span>
      </button>
    </div>
  </PrivatePanel>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { CheckOutlined, RightOutlined } from '@ant-design/icons-vue'
import HomeIcon from '../../shared/HomeIcon.vue'
import PrivatePanel from './PrivatePanel.vue'
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
.private-guide-progress { color: var(--business-component-muted, #646c73); font-size: 12px; white-space: nowrap; }
.private-guide { display: flex; flex: 1; flex-direction: column; justify-content: center; gap: 10px; min-height: 92px; }
.private-guide-lane { display: flex; align-items: flex-start; gap: 8px; min-width: 0; }
.private-guide-name { flex: 0 0 30px; padding-top: 7px; color: var(--business-component-muted, #646c73); font-size: 13px; font-weight: 600; line-height: 20px; }
.private-guide-steps { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 4px; min-width: 0; margin: 0; padding: 0; list-style: none; }
.private-guide-steps li { display: inline-flex; align-items: center; gap: 4px; max-width: 100%; }
.private-guide-arrow { color: var(--ink-4, #c9cdd4); font-size: 10px; }
.private-guide-step { display: inline-flex; flex-wrap: wrap; align-items: center; justify-content: flex-start; gap: 6px; min-height: 32px; max-width: 100%; padding: 5px 10px; border: 1px solid var(--line, #e5e6eb); border-radius: 16px; color: var(--business-component-text, #1f2329); background: var(--ant-color-bg-container, #fff); font: inherit; font-size: 12px; line-height: 20px; text-align: left; cursor: pointer; }
.private-guide-step:hover:not(:disabled) { border-color: var(--business-component-primary, #1677ff); }
.private-guide-step:disabled { cursor: default; }
.private-guide-step:focus-visible, .private-quick-action:focus-visible { outline: 2px solid var(--business-component-primary, #1677ff); outline-offset: 2px; }
.private-guide-step.is-next { border-color: var(--business-component-primary, #1677ff); background: var(--accent-soft, #f7faff); }
.private-guide-step.is-unknown { border-style: dashed; }
.private-guide-mark { display: inline-flex; flex: 0 0 16px; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 50%; background: var(--bg-sunken, #f2f3f5); color: var(--business-component-muted, #646c73); font-size: 10px; font-weight: 600; }
.is-complete .private-guide-mark { color: var(--ant-color-success, #00803a); background: var(--ant-color-success-bg, #e8ffea); }
.is-next .private-guide-mark { color: #fff; background: var(--business-component-primary, #1677ff); }
.private-guide-action { color: var(--business-component-primary, #1677ff); font-size: 12px; }
.private-guide-action :deep(.anticon) { font-size: 9px; }
.private-guide-unknown { color: var(--business-component-muted, #646c73); }
.private-guide-retry { align-self: flex-end; }
.private-quick-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px 10px; }
.private-quick-action { display: flex; align-items: center; gap: 10px; min-width: 0; padding: 9px 10px; border: 1px solid var(--line, #e5e6eb); border-radius: var(--r-2, 6px); background: transparent; color: var(--business-component-text, #1f2329); font: inherit; text-align: left; cursor: pointer; transition: border-color .2s, background-color .2s; }
.private-quick-action:hover:not(:disabled) { border-color: var(--business-component-primary, #1677ff); background: var(--home-card-surface, #f7f9fc); }
.private-quick-action:disabled { cursor: default; }
.private-quick-icon { display: inline-flex; flex: 0 0 34px; width: 34px; height: 34px; align-items: center; justify-content: center; border-radius: var(--r-2, 6px); background: var(--accent-soft, #e8f3ff); color: var(--business-component-primary, #1677ff); }
.private-quick-copy { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.private-quick-copy strong { font-size: 13px; font-weight: 500; line-height: 20px; }
.private-quick-copy > span { color: var(--business-component-muted, #646c73); font-size: 12px; line-height: 18px; overflow-wrap: anywhere; }
@container (max-width: 899px) { .private-quick-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@container (max-width: 399px) { .private-quick-grid { grid-template-columns: minmax(0, 1fr); } .private-guide-lane { flex-direction: column; gap: 4px; } .private-guide-name { flex-basis: auto; padding: 0; } }
</style>
