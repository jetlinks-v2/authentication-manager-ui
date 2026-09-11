import { computed, markRaw } from 'vue'
import { isSaaS } from '@jetlinks-web-core/utils/consts'
import { dashboardSources } from '@jetlinks-web-core/components/DashBoardCanvas/dashboard-sources'
import { useDashboardCatalog } from '@jetlinks-web-core/components/DashBoardCanvas/discovery'
import type { DashboardValue } from '@jetlinks-web-core/components/DashBoardCanvas'
import {
  ProjectHomeQuickGuide,
  ProjectHomeQuickGuideConfig,
  ProjectHomeQuickGuideConfigProps,
} from '../../../visDashboard/Base/QuickGuide/index'

const saasLayout = [
  ['QuickActions', 0, 0, 5, 7], ['Applications', 5, 0, 3, 7],
  ['QuickGuide', 0, 7, 8, 5],
  ['Resources', 0, 12, 8, 17],
  ['Operations', 8, 0, 4, 12], ['Announcements', 8, 12, 4, 17],
] as const

const privateLayout = [
  ['QuickActions', 0, 0, 5, 7], ['Applications', 5, 0, 3, 7],
  ['QuickGuide', 0, 7, 8, 5],
  ['Resources', 0, 12, 8, 17],
  ['Operations', 8, 0, 4, 29],
] as const

const layout = isSaaS ? saasLayout : privateLayout

export function useOverviewDashboard() {
  const { catalog, loading, errors, reload } = useDashboardCatalog(dashboardSources, {
    modules: ['authentication-manager-ui'], directories: ['visDashboard'],
    groups: ['authentication-manager-ui/visDashboard/Base'],
  })

  const fullCatalog = computed(() => {
    const components = { ...catalog.value.components }
    if (!components.projectHomeQuickGuide) {
      components.projectHomeQuickGuide = {
        component: markRaw(ProjectHomeQuickGuide.component),
        configs: ProjectHomeQuickGuideConfig as any,
        defaultConfig: ProjectHomeQuickGuideConfigProps as any,
        groupId: 'authentication-manager-ui/visDashboard/Base',
        defaultGridItem: { w: 8, h: 5, x: 0, y: 7, minW: 4, minH: 2 },
      }
    }
    return { ...catalog.value, components }
  })

  const dashboard = computed<DashboardValue>(() => ({
    canvas: { backgroundColor: 'transparent', gridLayout: { rowHeight: 16, marginHorizontal: 18, marginVertical: 18 } },
    components: layout.flatMap(([feature, x, y, w, h]) => {
      const type = `projectHome${feature}`, definition = fullCatalog.value.components[type]
      if (!definition) return []
      return [{ ...definition.defaultConfig, id: type, type,
        componentProps: { ...definition.defaultConfig.componentProps,
          gridItem: { ...definition.defaultGridItem, ...definition.defaultConfig.componentProps.gridItem, x, y, w, h } } }]
    }),
  }))

  return { catalog: fullCatalog, loading, errors, reload, dashboard }
}


