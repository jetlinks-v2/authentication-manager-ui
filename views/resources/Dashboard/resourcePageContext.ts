import { inject, type InjectionKey, type Ref } from 'vue'
import type { DashboardComponentDefinition, DashboardWidget } from '@jetlinks-web-core/components/DashBoardCanvas'
import type { TimeRange } from '../../../visDashboard/ResourceCenter/shared'
import type { useResourceSummary } from './useResourceSummary'

export interface ResourcePageContext {
  scope: Readonly<Ref<string>>
  summary: ReturnType<typeof useResourceSummary>
  messageRange: Readonly<Ref<TimeRange>>
  mapWidget: Readonly<Ref<DashboardWidget | undefined>>
  mapDefinition: Readonly<Ref<DashboardComponentDefinition | undefined>>
  mapLoading: Readonly<Ref<boolean>>
  reloadMap: () => unknown
  onGatewayCount: (count: number) => void
}

export const resourcePageContextKey: InjectionKey<ResourcePageContext> = Symbol('resource-page-context')

/** 画布只保存几何和组件身份；共享请求、响应式状态及动作通过页面上下文传递。 */
export function useResourcePageContext() {
  const context = inject(resourcePageContextKey)
  if (!context) throw new Error('Missing resource page context')
  return context
}
