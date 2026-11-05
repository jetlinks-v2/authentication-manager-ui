import { computed, type Ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import { theme } from 'ant-design-vue'
import type { PrivateGuideLane } from './types'

/** 从已授权流程派生展示状态；未知步骤保留原位，不把后续步骤升级为当前任务。 */
export function usePrivateGuideLane(lane: () => PrivateGuideLane) {
  const complete = computed(() => lane().steps.filter(step => step.state === 'complete').length)
  const current = computed(() => lane().steps.find(step => step.state !== 'complete'))
  const steps = computed(() => lane().steps.map((step, index) => ({
    ...step,
    // 只有相邻两步都已完成才连接完成色，未知或待完成步骤前保留中性连接线。
    connectComplete: step.state === 'complete' && lane().steps[index + 1]?.state === 'complete',
    status: step.state === 'complete' ? 'finish' as const
      : step.next && step.state === 'incomplete' ? 'process' as const : 'wait' as const,
    statusKey: `privateOverview.guideState.${step.state}`,
  })))
  return { complete, current, steps }
}

/** 按卡片实际宽度使用 Steps 原生横/纵布局，不依赖整个浏览器的断点。 */
export function usePrivateGuideLayout(host: Ref<HTMLElement | undefined>, stepCount: () => number) {
  const { width } = useElementSize(host)
  const { token } = theme.useToken()
  // 通过 Steps 的公开组件级 token 收紧标签占位，节点与连线仍由组件统一计算。
  const stepsTheme = computed(() => ({ components: { Steps: {
    controlHeight: token.value.controlHeight,
    controlHeightLG: token.value.controlHeightSM,
  } } }))
  // 原生 vertical-label 的标签宽度为 controlHeight + 2 * controlHeightLG。
  const minimumWidth = computed(() => {
    const size = stepsTheme.value.components.Steps
    return stepCount() * (size.controlHeight + size.controlHeightLG * 2)
  })
  const direction = computed(() => width.value >= minimumWidth.value ? 'horizontal' as const : 'vertical' as const)
  return { direction, stepsTheme }
}
