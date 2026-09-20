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
import {
  ProjectHomeDeviceAccess,
  ProjectHomeDeviceAccessConfig,
  ProjectHomeDeviceAccessConfigProps,
} from '../../../visDashboard/Base/DeviceAccess/index'
import {
  ProjectHomeVisualization,
  ProjectHomeVisualizationConfig,
  ProjectHomeVisualizationConfigProps,
} from '../../../visDashboard/Base/Visualization/index'
import {
  ProjectHomeAiCenter,
  ProjectHomeAiCenterConfig,
  ProjectHomeAiCenterConfigProps,
} from '../../../visDashboard/Base/AiCenter/index'
import {
  ProjectHomeRuleEngine,
  ProjectHomeRuleEngineConfig,
  ProjectHomeRuleEngineConfigProps,
} from '../../../visDashboard/Base/RuleEngine/index'
import {
  ProjectHomeCollection,
  ProjectHomeCollectionConfig,
  ProjectHomeCollectionConfigProps,
} from '../../../visDashboard/Base/Collection/index'
import {
  ProjectHomeQuotas,
  ProjectHomeQuotasConfig,
  ProjectHomeQuotasConfigProps,
} from '../../../visDashboard/Base/Quotas/index'

const saasLayout = [
  ['QuickActions', 0, 0, 8, 9], ['Quotas', 8, 0, 4, 9],
  ['DeviceAccess', 0, 9, 3, 13], ['Visualization', 3, 9, 5, 13], ['Operations', 8, 9, 4, 10],
  ['AiCenter', 0, 22, 4, 11], ['RuleEngine', 4, 22, 4, 11], ['Applications', 8, 19, 4, 11],
  ['Announcements', 8, 30, 4, 12],
] as const

const privateLayout = [
  ['QuickActions', 0, 0, 12, 9],
  ['DeviceAccess', 0, 9, 3, 13], ['Visualization', 3, 9, 5, 13], ['Operations', 8, 9, 4, 13],
  ['AiCenter', 0, 22, 4, 11], ['RuleEngine', 4, 22, 4, 11], ['Applications', 8, 22, 4, 11],
  ['Collection', 0, 33, 4, 10], ['Announcements', 4, 33, 8, 10],
] as const

const layout = isSaaS ? saasLayout : privateLayout

export function useOverviewDashboard() {
  const { catalog, loading, errors, reload } = useDashboardCatalog(dashboardSources, {
    modules: ['authentication-manager-ui'], directories: ['visDashboard'],
    groups: ['authentication-manager-ui/visDashboard/Base'],
  })

  const fullCatalog = computed(() => {
    const components = { ...catalog.value.components }
    // 租户用量接口只属于 SaaS 项目，私有化环境不暴露卡片及其添加入口。
    if (!isSaaS) delete components.projectHomeQuotas
    const registerFallback = (
      type: string,
      comp: { component: any },
      configs: any,
      defaultConfig: any,
      defaultGridItem: { w: number; h: number; x: number; y: number; minW: number; minH: number },
    ) => {
      if (!components[type]) {
        components[type] = {
          component: markRaw(comp.component),
          configs: configs as any,
          defaultConfig: defaultConfig as any,
          groupId: 'authentication-manager-ui/visDashboard/Base',
          defaultGridItem,
        }
      }
    }

    registerFallback(
      'projectHomeQuickGuide',
      ProjectHomeQuickGuide,
      ProjectHomeQuickGuideConfig,
      ProjectHomeQuickGuideConfigProps,
      { w: 8, h: 5, x: 0, y: 7, minW: 4, minH: 2 },
    )
    registerFallback(
      'projectHomeDeviceAccess',
      ProjectHomeDeviceAccess,
      ProjectHomeDeviceAccessConfig,
      ProjectHomeDeviceAccessConfigProps,
      { w: 3, h: 10, x: 0, y: 7, minW: 3, minH: 6 },
    )
    registerFallback(
      'projectHomeVisualization',
      ProjectHomeVisualization,
      ProjectHomeVisualizationConfig,
      ProjectHomeVisualizationConfigProps,
      { w: 5, h: 10, x: 3, y: 7, minW: 4, minH: 6 },
    )
    registerFallback(
      'projectHomeAiCenter',
      ProjectHomeAiCenter,
      ProjectHomeAiCenterConfig,
      ProjectHomeAiCenterConfigProps,
      { w: 4, h: 10, x: 0, y: 17, minW: 3, minH: 6 },
    )
    registerFallback(
      'projectHomeRuleEngine',
      ProjectHomeRuleEngine,
      ProjectHomeRuleEngineConfig,
      ProjectHomeRuleEngineConfigProps,
      { w: 4, h: 10, x: 4, y: 17, minW: 2, minH: 6 },
    )
    registerFallback(
      'projectHomeCollection',
      ProjectHomeCollection,
      ProjectHomeCollectionConfig,
      ProjectHomeCollectionConfigProps,
      { w: 3, h: 10, x: 0, y: 17, minW: 2, minH: 6 },
    )
    if (isSaaS) {
      registerFallback(
        'projectHomeQuotas',
        ProjectHomeQuotas,
        ProjectHomeQuotasConfig,
        ProjectHomeQuotasConfigProps,
        { w: 4, h: 7, x: 8, y: 0, minW: 3, minH: 6 },
      )
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
