import { computed, markRaw, type Ref } from 'vue'
import { isSaaS } from '@jetlinks-web-core/utils/consts'
import { dashboardSources } from '@jetlinks-web-core/components/DashBoardCanvas/dashboard-sources'
import { useDashboardCatalog } from '@jetlinks-web-core/components/DashBoardCanvas/discovery'
import { readDashboardLayout } from '@jetlinks-web-core/components/DashBoardCanvas/utils/layoutStorage'
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

const guideRows = 6
const legacyLayoutKeys = Array.from({ length: 14 }, (_, index) => `project-overview-v${14 - index}`)

const saasLayout = [
  ['QuickGuide', 0, 0, 12, guideRows],
  ['QuickActions', 0, 6, 8, 9], ['Quotas', 8, 6, 4, 9],
  // 运维卡包含健康状态与告警操作，窄列时健康状态会换行，预设高度需完整容纳两个分组。
  ['DeviceAccess', 0, 15, 3, 13], ['Visualization', 3, 15, 5, 13], ['Operations', 8, 15, 4, 13],
  ['AiCenter', 0, 28, 4, 11], ['RuleEngine', 4, 28, 4, 11], ['Applications', 8, 28, 4, 11],
  ['Announcements', 8, 39, 4, 12],
] as const

const privateLayout = [
  ['QuickGuide', 0, 0, 12, guideRows],
  ['DeviceAccess', 0, 0, 3, 13], ['Collection', 3, 0, 3, 13],
  ['RuleEngine', 6, 0, 3, 13], ['AiCenter', 9, 0, 3, 13],
  ['QuickActions', 0, 13, 6, 9], ['Applications', 6, 13, 6, 9],
  ['Visualization', 0, 22, 6, 14], ['Operations', 6, 22, 6, 14],
  // 保留旧布局里的公告 ID 以兼容个人缓存；私有化组装时隐藏，不发起公告请求。
  ['Announcements', 8, 36, 4, 12],
] as const

const layout = isSaaS ? saasLayout : privateLayout

function migrateQuickGuideLayout() {
  try {
    const saved = readDashboardLayout(localStorage, 'project-overview', legacyLayoutKeys)
    if (!saved || saved.some(item => item.i === 'projectHomeQuickGuide')) return
    const previousIds = new Set(layout.slice(1).map(([feature]) => `projectHome${feature}`))
    if (saved.length !== previousIds.size || new Set(saved.map(item => item.i)).size !== previousIds.size
      || saved.some(item => !previousIds.has(item.i))) return
    localStorage.setItem('project-overview', JSON.stringify([
      { i: 'projectHomeQuickGuide', x: 0, y: 0, w: 12, h: guideRows },
      ...saved.map(item => ({ ...item, y: item.y + guideRows })),
    ]))
  } catch { /* 存储不可用时沿用默认布局。 */ }
}

export function useOverviewDashboard(showQuickGuide: Ref<boolean>) {
  migrateQuickGuideLayout()
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
      { w: 12, h: guideRows, x: 0, y: 0, minW: 4, minH: 3 },
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
        ...(feature === 'QuickGuide' ? { visible: showQuickGuide.value } : {}),
        ...(!isSaaS && feature === 'Announcements' ? { visible: false } : {}),
        componentProps: { ...definition.defaultConfig.componentProps,
          gridItem: { ...definition.defaultGridItem, ...definition.defaultConfig.componentProps.gridItem, x, y, w, h } } }]
    }),
  }))

  return { catalog: fullCatalog, loading, errors, reload, dashboard, legacyLayoutKeys }
}
