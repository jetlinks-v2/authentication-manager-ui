import { computed, markRaw, ref, type Ref } from 'vue'
import { isSaaS } from '@jetlinks-web-core/utils/consts'
import { isPrivateDeployment } from '@jetlinks-web-core/utils/deployment'
import { dashboardSources } from '@jetlinks-web-core/components/DashBoardCanvas/dashboard-sources'
import { useDashboardCatalog } from '@jetlinks-web-core/components/DashBoardCanvas/discovery'
import type { DashboardValue } from '@jetlinks-web-core/components/DashBoardCanvas'
import { useResourceCapabilities } from '../../../visDashboard/ResourceCenter/hooks/useResourceCapabilities'
import { homeFeatureAvailable } from '../../../visDashboard/Base/shared/resources'
import type { HomeFeature } from '../../../visDashboard/Base/shared/types'
import { buildOverviewLayout, overviewLayoutStorageKey } from './overviewDashboardLayout'
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

/** 概览与资源仪表盘共享能力状态，过滤组件目录并生成当前用户、项目及能力组合的布局。 */
export function useOverviewDashboard(showQuickGuide: Ref<boolean>) {
  const capabilities = useResourceCapabilities(ref(false))
  const modules = capabilities.modules
  const quickGuideAvailable = !isPrivateDeployment()
  const storageKey = computed(() => overviewLayoutStorageKey(
    capabilities.scope.value, isSaaS, modules.value, quickGuideAvailable && showQuickGuide.value,
  ))
  const discovery = useDashboardCatalog(dashboardSources, {
    modules: ['authentication-manager-ui'], directories: ['visDashboard'],
    groups: ['authentication-manager-ui/visDashboard/Base'],
  })

  const { catalog } = discovery
  const fullCatalog = computed(() => {
    const components = { ...catalog.value.components }
    // 租户用量接口只属于 SaaS 项目，私有化环境不暴露卡片及其添加入口。
    if (!isSaaS) delete components.projectHomeQuotas
    // 私有化不提供引导入口，旧布局中的引导记录也不能重新生成实例。
    if (!quickGuideAvailable) delete components.projectHomeQuickGuide
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

    if (quickGuideAvailable) {
      registerFallback(
        'projectHomeQuickGuide',
        ProjectHomeQuickGuide,
        ProjectHomeQuickGuideConfig,
        ProjectHomeQuickGuideConfigProps,
        { w: 12, h: guideRows, x: 0, y: 0, minW: 4, minH: 3 },
      )
    }
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
    for (const type of Object.keys(components)) {
      const feature = type.replace(/^projectHome/, '') as HomeFeature
      if (!homeFeatureAvailable(feature, modules.value) || (!isSaaS && feature === 'Announcements')) delete components[type]
    }
    return { ...catalog.value, components }
  })

  const dashboard = computed<DashboardValue>(() => ({
    canvas: { backgroundColor: 'transparent', gridLayout: { rowHeight: 16, marginHorizontal: 18, marginVertical: 18 } },
    components: buildOverviewLayout({
      saas: isSaaS, modules: modules.value, showGuide: showQuickGuide.value, guideAvailable: quickGuideAvailable,
    }).flatMap(([feature, x, y, w, h]) => {
      const type = `projectHome${feature}`, definition = fullCatalog.value.components[type]
      if (!definition) return []
      return [{ ...definition.defaultConfig, id: type, type,
        componentProps: { ...definition.defaultConfig.componentProps,
          gridItem: { ...definition.defaultGridItem, ...definition.defaultConfig.componentProps.gridItem, x, y, w, h } } }]
    }),
  }))

  const loading = computed(() => capabilities.loading.value || discovery.loading.value)
  const errors = computed(() => [...capabilities.errors.value, ...discovery.errors.value])
  async function reload() {
    await capabilities.reload()
    await discovery.reload()
  }
  return { catalog: fullCatalog, loading, errors, reload, dashboard, storageKey, legacyLayoutKeys: [] }
}
