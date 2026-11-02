import type { InjectionKey } from 'vue'
import type { useQuickGuideSteps } from './useQuickGuideSteps'

/** 概览的显示条件与卡片使用同一份引导状态，独立画布组件仍可自行加载。 */
export const quickGuideContextKey: InjectionKey<ReturnType<typeof useQuickGuideSteps>> = Symbol('quick-guide')
