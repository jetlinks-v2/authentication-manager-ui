<template>
  <div class="quick-guide-view">
    <template v-for="(step, index) in steps" :key="step.key">
      <a-tooltip :title="step.disabled ? t('packages.ProjectHome.unavailable') : undefined">
        <span class="step-entry">
          <a-button
            class="step-card"
            :class="{ 'is-complete': step.status === 'complete' }"
            :data-step="step.key"
            :disabled="step.disabled"
            :aria-label="`${index + 1}. ${step.title}，${step.disabled ? t('packages.ProjectHome.unavailable') : step.statusText}`"
            @click="$emit('action', step)"
          >
            <span class="step-illustration" aria-hidden="true">
              <img :src="illustrationsByStep[step.key]" alt="" />
            </span>
            <span class="step-copy">
              <span class="step-card-header">
                <span class="step-badge">{{ index + 1 }}</span>
                <strong class="step-title"><j-ellipsis>{{ step.title }}</j-ellipsis></strong>
              </span>
              <j-ellipsis class="step-card-desc">{{ step.description }}</j-ellipsis>
              <span v-if="step.status === 'loading' || step.status === 'unknown'" class="step-state" aria-live="polite">
                <LoadingOutlined v-if="step.status === 'loading'" spin />
                <QuestionCircleOutlined v-else />
                {{ step.statusText }}
              </span>
              <span v-else class="step-card-action">
                {{ step.status === 'complete' ? step.statusText : step.actionText }}
                <img v-if="step.status === 'complete'" :src="completed" alt="" />
                <img v-else :src="actionArrow" alt="" />
              </span>
            </span>
            <img v-if="step.status === 'complete'" class="step-corner" :src="completedCorner" alt="" />
          </a-button>
        </span>
      </a-tooltip>
      <!-- 仅连接已完成的相邻步骤，通向未完成或状态未知的步骤时保持灰色。 -->
      <img
        v-if="index < steps.length - 1"
        class="step-separator"
        :src="step.status === 'complete' && steps[index + 1]?.status === 'complete' ? arrowComplete : arrowPending"
        alt=""
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { LoadingOutlined, QuestionCircleOutlined } from '@ant-design/icons-vue'
import { useI18n } from 'vue-i18n'
import type { HomeTarget } from '../../shared/types'
import type { GuideStatus, GuideStepKey } from '../quickGuideStatus'
import illustrations from '../assets/quick-guide-illustrations.png'
import alarmIllustration from '../assets/alarm.png'
import applicationIllustration from '../assets/application.png'
import completed from '../assets/completed.svg'
import completedCorner from '../assets/completed-corner.svg'
import arrowComplete from '../assets/arrow-complete.svg'
import arrowPending from '../assets/arrow-pending.svg'
import actionArrow from '../assets/action-arrow.svg'

export interface GuideStep {
  key: GuideStepKey
  title: string
  description: string
  actionText: string
  target: HomeTarget
  status: GuideStatus
  statusText: string
  disabled?: boolean
}

// 原有四张插图沿用组合图及裁切，新步骤使用用户提供的独立原图。
const illustrationsByStep: Record<GuideStepKey, string> = {
  space: illustrations, gateway: illustrations, device: illustrations, algorithm: illustrations,
  alarm: alarmIllustration, application: applicationIllustration,
}

defineProps<{ steps: GuideStep[] }>()
defineEmits<{ action: [step: GuideStep] }>()
const { t } = useI18n()
</script>

<style scoped lang="less">
.quick-guide-view {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2, 8px);
  height: 100%;
  min-height: 0;
}

.step-entry { display: flex; flex: 1; min-width: 0; }

.step-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 13px;
  flex: 1;
  min-width: 0;
  height: 96px;
  padding: 12px 16px 8px;
  overflow: hidden;
  border: 1px solid var(--guide-border);
  border-radius: var(--r-3, 8px);
  background: #fff;
  box-shadow: none;
  color: var(--guide-title);
  text-align: left;
  white-space: normal;
  transition: border-color .2s ease, box-shadow .2s ease;

  &.is-complete {
    border-color: #a0c2f7;
    background: linear-gradient(90deg, #fff, #e3eeff);
    .step-badge { background: var(--guide-accent); border-color: var(--guide-accent); color: #fff; }
  }

  &:hover:not(:disabled), &:focus-visible:not(:disabled) {
    border-color: var(--guide-accent);
    color: var(--guide-title);
  }

  &:focus-visible { box-shadow: var(--ring-focus); }
  &:disabled { opacity: .6; }
}

.step-illustration {
  position: relative;
  flex: 0 0 72px;
  width: 72px;
  height: 72px;
  overflow: hidden;
  border-radius: var(--r-3, 8px);

  // 保留 Figma 的原始组合图及每张插图的裁切位置；排序按业务 key，不按序号。
  img { position: absolute; max-width: none; }
}
[data-step="gateway"] .step-illustration img { width: 406.09%; height: 270.18%; left: -91.94%; top: -26.65%; }
[data-step="device"] .step-illustration img { width: 407.47%; height: 270.18%; left: -219.88%; top: -26.65%; }
[data-step="space"] .step-illustration img { width: 408.2%; height: 274.47%; left: -92.61%; top: -146.12%; }
[data-step="algorithm"] .step-illustration img { width: 412.83%; height: 274.47%; left: -224.09%; top: -146.12%; }

[data-step="alarm"] .step-illustration img,
[data-step="application"] .step-illustration img { inset: 0; width: 100%; height: 100%; object-fit: contain; }

.step-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  min-width: 0;
}
.step-card-header { display: flex; align-items: center; gap: 8px; min-width: 0; }
.step-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 20px;
  width: 20px;
  height: 20px;
  border: 1px solid #bfd5ff;
  border-radius: 50%;
  background: #f5f8ff;
  color: var(--guide-accent);
  font-size: var(--fs-12, 12px);
  font-weight: 500;
  line-height: 18px;
}
.step-title { flex: 1; min-width: 0; font-size: var(--fs-14, 14px); line-height: 20px; font-weight: 500; }
.step-card-desc { width: 100%; min-width: 0; color: var(--guide-description); font-size: var(--fs-12, 12px); line-height: 18px; }
.step-card-action, .step-state {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--fs-12, 12px);
  font-weight: 500;
  line-height: 18px;
  white-space: nowrap;
}
.step-card-action { color: var(--guide-accent); }
.step-state { color: var(--guide-secondary); }
.step-card-action img, .step-separator, .step-corner { flex-shrink: 0; display: block; }
.step-corner { position: absolute; top: 1px; right: 1px; }
.step-separator { margin-top: 40px; }

@container project-home (max-width: 1400px) {
  .quick-guide-view { overflow-x: auto; scroll-snap-type: x proximity; scrollbar-width: thin; }
  .step-entry { flex: 1 0 280px; scroll-snap-align: start; }
}

@container project-home (max-width: 1400px) and (min-height: 320px) {
  .quick-guide-view { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-content: start; overflow: auto; }
  .step-separator { display: none; }
}

@container project-home (max-width: 900px) and (min-height: 320px) {
  .quick-guide-view { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@container project-home (max-width: 600px) and (min-height: 420px) {
  .quick-guide-view { grid-template-columns: minmax(0, 1fr); }
}

@container project-home (max-height: 140px) {
  .step-entry { flex: 1 0 150px; }
  .step-card { height: 36px; padding: 6px 10px; }
  .step-illustration, .step-card-desc, .step-card-action, .step-state, .step-corner, .step-separator { display: none; }
  .quick-guide-view { overflow-x: auto; }
}
</style>
