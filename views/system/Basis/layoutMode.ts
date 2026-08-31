import type { LayoutMode } from '@jetlinks-web-core/store/system'

const layoutModes: readonly LayoutMode[] = ['mix', 'side', 'top']

// 独立构建的模块不能依赖宿主的可选运行时导出，避免路由加载阶段因版本不同步失败。
export const normalizeLayoutMode = (value: unknown): LayoutMode => (
  layoutModes.includes(value as LayoutMode) ? value as LayoutMode : 'side'
)
