<template>
  <section ref="laneHost" class="private-guide-lane" :data-guide-lane="lane.id" :aria-label="t(`privateOverview.guideLane.${lane.id}`)">
    <header class="private-guide-heading">
      <span class="private-guide-icon"><AIcon :type="lane.id === 'iot' ? 'DeploymentUnitOutlined' : 'VideoCameraOutlined'" /></span>
      <h3>{{ t(`privateOverview.guideLane.${lane.id}`) }}</h3>
      <span class="private-guide-progress">{{ t('privateOverview.guideLaneProgress', { complete, total: steps.length }) }}</span>
    </header>
    <a-config-provider :theme="stepsTheme">
      <a-steps class="private-guide-steps" size="small" label-placement="vertical" :direction="direction" :responsive="false" :current="-1">
        <a-step v-for="step in steps" :key="step.id" :status="step.status" :disabled="!canOpen(step.target)"
          :data-complete-link="step.connectComplete || undefined"
          :aria-current="step.next ? 'step' : undefined"
          @click="canOpen(step.target) && $emit('navigate', step.target)"
          @keydown.enter.prevent="canOpen(step.target) && $emit('navigate', step.target)"
          @keydown.space.prevent="canOpen(step.target) && $emit('navigate', step.target)">
          <template #title>
            <span class="private-guide-step" :class="{ 'is-next': step.next }">{{ t(step.labelKey) }}</span>
            <span class="private-guide-step-state">{{ t(step.statusKey) }}</span>
          </template>
        </a-step>
      </a-steps>
    </a-config-provider>
    <div class="private-guide-task" :class="{ 'is-neutral': !current || current.state === 'unknown' }">
      <div class="private-guide-task-copy">
        <span class="private-guide-task-label">{{ t(!current ? 'privateOverview.guideLaneComplete' : current.state === 'unknown' ? 'privateOverview.guideUnknown' : 'privateOverview.guideCurrent') }}</span>
        <h4 v-if="current">{{ t(current.state === 'unknown' ? current.labelKey : `privateOverview.guideTitle.${current.id}`) }}</h4>
        <p>{{ t(!current ? 'privateOverview.guideLaneCompleteDesc' : current.state === 'unknown' ? 'privateOverview.guideUnknownDesc' : `privateOverview.guideDescription.${current.id}`) }}</p>
      </div>
      <a-button v-if="current?.state === 'unknown'" size="middle" class="private-guide-task-action" @click="$emit('retry')">{{ t('privateOverview.retry') }}</a-button>
      <a-button v-else-if="current?.next" size="middle" type="primary" class="private-guide-task-action" :disabled="!canOpen(current.target)"
        @click="$emit('navigate', current.target)">{{ t(current.actionKey) }}</a-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { AIcon } from '@jetlinks-web/components'
import type { HomeTarget } from '../../shared/types'
import type { PrivateGuideLane } from '../types'
import { usePrivateGuideLayout, usePrivateGuideLane } from '../usePrivateGuideLane'

const props = defineProps<{ lane: PrivateGuideLane; canOpen: (target?: HomeTarget) => boolean }>()
defineEmits<{ navigate: [target?: HomeTarget]; retry: [] }>()
const { t } = useI18n()
const { complete, current, steps } = usePrivateGuideLane(() => props.lane)
const laneHost = ref<HTMLElement>()
const { direction, stepsTheme } = usePrivateGuideLayout(laneHost, () => props.lane.steps.length)
</script>

<style scoped lang="less">
.private-guide-lane { display: flex; flex-direction: column; gap: var(--space-3, .75rem); min-width: 0; }
.private-guide-heading { display: flex; align-items: center; gap: var(--space-2, .5rem); min-width: 0; }
.private-guide-icon { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 1.75rem; height: 1.75rem; border-radius: var(--r-2, .375rem); color: var(--business-component-primary, #1677ff); background: var(--accent-soft, #e8f3ff); font-size: var(--fs-16); }
.private-guide-heading h3 { margin: 0; color: var(--business-component-text, #1f2329); font-size: var(--fs-14); font-weight: 600; }
.private-guide-progress { margin-inline-start: auto; color: var(--business-component-muted, #646c73); font-size: var(--fs-12); white-space: nowrap; }
.private-guide-steps { padding-block: 0; }
/* 图标、标签及连接线的位置全部交给原生 Steps，仅调整完成态颜色。 */
.private-guide-steps :deep(.ant-steps-item-finish > .ant-steps-item-container > .ant-steps-item-icon) {
  background: var(--ant-color-success, #52c41a);
  border-color: var(--ant-color-success, #52c41a);
}
.private-guide-steps :deep(.ant-steps-item-finish > .ant-steps-item-container > .ant-steps-item-icon > .ant-steps-icon) { color: var(--ant-color-text-light-solid, #fff); }
.private-guide-steps :deep(.ant-steps-item > .ant-steps-item-container > .ant-steps-item-tail::after) { background: var(--line, #e5e6eb); }
/* Steps 管理自身 class，连接状态通过独立属性传递。 */
.private-guide-steps :deep(.ant-steps-item[data-complete-link] > .ant-steps-item-container > .ant-steps-item-tail::after) { background: var(--ant-color-success, #52c41a); }
.private-guide-step { display: inline-block; max-width: 100%; font-size: var(--fs-13); white-space: normal; overflow-wrap: anywhere; }
.private-guide-step.is-next { color: var(--business-component-primary, #1677ff); font-weight: 600; }
/* Steps 本身只有一个交互焦点，状态补充给读屏，键盘事件由同一入口处理。 */
.private-guide-step-state { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.private-guide-steps :deep(.ant-steps-item-container:focus-visible) { outline: 2px solid var(--business-component-primary, #1677ff); outline-offset: 2px; border-radius: var(--r-2, .375rem); }
.private-guide-task { display: flex; flex: 1; align-items: center; justify-content: space-between; gap: var(--space-3, .75rem); padding: var(--space-3, .75rem); border-radius: var(--r-3, .5rem); background: var(--home-card-surface, #f7f9fc); background: color-mix(in srgb, var(--business-component-primary, #1677ff) 6%, var(--ant-color-bg-container, #fff)); }
.private-guide-task-copy { flex: 1; min-width: 0; }
.private-guide-task-label { color: var(--business-component-primary, #1677ff); font-size: var(--fs-12); line-height: 1.5; }
.private-guide-task h4 { margin: .125rem 0; color: var(--business-component-text, #1f2329); font-size: var(--fs-14); line-height: 1.5; font-weight: 600; }
.private-guide-task p { margin: .125rem 0 0; color: var(--business-component-muted, #646c73); font-size: var(--fs-12); line-height: 1.5; overflow-wrap: anywhere; }
.private-guide-task-action { flex: none; }
.private-guide-task.is-neutral { background: var(--home-card-surface, #f7f9fc); }
.private-guide-task.is-neutral .private-guide-task-label { color: var(--business-component-muted, #646c73); }
@container (max-width: 399px) {
  .private-guide-heading { gap: var(--space-2, .5rem); flex-wrap: wrap; }
  .private-guide-progress { margin-inline-start: 0; }
  .private-guide-icon { display: none; }
  .private-guide-step { font-size: var(--fs-12); }
  .private-guide-task { align-items: stretch; flex-direction: column; }
  .private-guide-task-action { align-self: flex-end; }
}
</style>
