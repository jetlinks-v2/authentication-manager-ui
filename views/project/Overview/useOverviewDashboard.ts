import { computed } from 'vue'
import { isSaaS } from '@jetlinks-web-core/utils/consts'
import { dashboardSources } from '@jetlinks-web-core/components/DashBoardCanvas/dashboard-sources'
import { useDashboardCatalog } from '@jetlinks-web-core/components/DashBoardCanvas/discovery'
import type { DashboardValue } from '@jetlinks-web-core/components/DashBoardCanvas'
const saasLayout = [
  ['QuickActions', 0, 0, 5, 7], ['Applications', 5, 0, 3, 7],
  ['Resources', 0, 7, 8, 16], ['Quotas', 8, 0, 4, 7],
  ['Operations', 8, 7, 4, 12], ['Announcements', 8, 19, 4, 7],
] as const
const privateLayout = [
  ['QuickActions', 0, 0, 8, 7], ['Applications', 8, 0, 4, 7],
  ['Resources', 0, 7, 8, 16], ['Operations', 8, 7, 4, 12],
] as const
// 私有化不创建公告和配额实例，避免无效请求，并让顶部卡片填满空出的区域。
const layout = isSaaS ? saasLayout : privateLayout
export function useOverviewDashboard() {
  const { catalog, loading, errors, reload } = useDashboardCatalog(dashboardSources, {
    modules: ['authentication-manager-ui'], directories: ['visDashboard'],
    groups: ['authentication-manager-ui/visDashboard/Base'],
  })
  const dashboard = computed<DashboardValue>(() => ({
    canvas: { backgroundColor: 'transparent', gridLayout: { rowHeight: 16, marginHorizontal: 18, marginVertical: 18 } },
    components: layout.flatMap(([feature, x, y, w, h]) => {
      const type = `projectHome${feature}`, definition = catalog.value.components[type]
      if (!definition) return []
      return [{ ...definition.defaultConfig, id: type, type, isLocked: true,
        componentProps: { ...definition.defaultConfig.componentProps, gridItem: { x, y, w, h } } }]
    }),
  }))
  return { catalog, loading, errors, reload, dashboard }
}
