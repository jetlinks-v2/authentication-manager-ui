import { computed, markRaw, provide, ref, watch, type Ref } from 'vue'
import CryptoJS from 'crypto-js'
import { useI18n } from 'vue-i18n'
import { isSaaS } from '@jetlinks-web-core/utils/consts'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { moduleRegistry } from '@jetlinks-web-core/utils/module-registry'
import { dashboardSources } from '@jetlinks-web-core/components/DashBoardCanvas/dashboard-sources'
import { useDashboardCatalog } from '@jetlinks-web-core/components/DashBoardCanvas/discovery'
import type { DashboardCatalog, DashboardValue, DashboardWidget } from '@jetlinks-web-core/components/DashBoardCanvas'
import { provideResourceCapabilities, useResourceCapabilities } from '../../../visDashboard/ResourceCenter/hooks/useResourceCapabilities'
import { provideVideoSummary } from '../../../visDashboard/ResourceCenter/hooks/videoSummaryContext'
import { resolveResourcePageAccess } from './services/resourcePageAccess'
import { buildResourcePageLayout } from './resourcePageLayout'
import { getResourceSummaryKinds } from './services/resourceSummary'
import { useResourceSummary } from './useResourceSummary'
import { buildResourcePageWidgets, resourcePageCanvasMode } from './resourcePageCanvas'
import { resourcePageContextKey } from './resourcePageContext'
import ResourceDashboardWidget from './components/ResourceDashboardWidget.vue'

const mapGroup = 'device-manager-ui/visDashboard/DeviceManagement'
const mapEntry = `${mapGroup}/DeviceMapCard`

/** 原型作为默认画布排布；实际坐标的保存和恢复统一交给 core 画布。 */
export function useResourcePage(width: Readonly<Ref<number>>) {
  const { t } = useI18n()
  const layoutWidth = ref(0)
  // 缓存页面暂时隐藏时宽度会归零，保留实际宽度以免切换个人布局或重建业务卡片。
  watch(width, value => { if (value > 0) layoutWidth.value = Math.round(value) }, { immediate: true })
  const menu = useMenuStore()
  const capabilities = useResourceCapabilities(ref(false))
  provideResourceCapabilities(capabilities)
  provideVideoSummary()
  const access = computed(() => {
    // 模块注册变化复用能力层的响应式版本；不通过请求失败来推测能力。
    void capabilities.modules.value
    return resolveResourcePageAccess({ saas: isSaaS,
      menus: menu.initialized && !menu.loading ? menu.menuResultCache : [],
      installed: name => moduleRegistry.hasModule(name),
    })
  })
  const mapSourceAvailable = computed(() => access.value.map
    && !!dashboardSources.get('device-manager-ui')?.['visDashboard/DeviceManagement']?.entries[mapEntry])
  const mapDiscovery = useDashboardCatalog(dashboardSources, computed(() => ({
    modules: mapSourceAvailable.value ? ['device-manager-ui'] : [],
    directories: ['visDashboard'], groups: [mapGroup], entries: [mapEntry],
  })))
  const mapWidget = computed<DashboardWidget | undefined>(() => {
    const definition = mapDiscovery.catalog.value.components.deviceMapCard
    if (!mapSourceAvailable.value || !definition) return undefined
    return { ...definition.defaultConfig, id: 'resource-device-map', type: 'deviceMapCard',
      componentProps: { ...definition.defaultConfig.componentProps, deviceMapCard: {
        ...(definition.defaultConfig.componentProps?.deviceMapCard as object || {}), topTitle: t('resourceDashboard.DeviceDistribution'),
        presentation: 'distribution', scope: capabilities.scope.value,
      } },
    }
  })
  const cells = computed(() => buildResourcePageLayout(access.value))
  const nodeCount = ref<number>()
  const fewNodes = computed(() => nodeCount.value !== undefined && nodeCount.value <= 3)
  watch(capabilities.scope, () => { nodeCount.value = undefined })
  function onGatewayCount(count: number) { nodeCount.value = count }
  const hasContent = computed(() => cells.value.length > 0 || getResourceSummaryKinds(access.value).length > 0)
  const messageRange = computed(() => getResourceSummaryKinds(access.value).includes('message') ? '7d' : 'today')
  const summary = useResourceSummary(access, capabilities.scope)
  provide(resourcePageContextKey, { scope: capabilities.scope, summary, messageRange, mapWidget,
    mapDefinition: computed(() => mapDiscovery.catalog.value.components.deviceMapCard), mapLoading: mapDiscovery.loading,
    reloadMap: mapDiscovery.reload, onGatewayCount })
  const widgets = computed(() => buildResourcePageWidgets(getResourceSummaryKinds(access.value), cells.value, layoutWidth.value, nodeCount.value))
  const catalog: DashboardCatalog = { groups: [], components: {
    resourceSaasWidget: { component: markRaw(ResourceDashboardWidget), configs: [], groupId: 'saas-resource-dashboard',
      defaultConfig: { type: 'resourceSaasWidget', componentProps: {} } },
  } }
  const dashboard = computed<DashboardValue>(() => ({
    canvas: { backgroundColor: 'transparent', gridLayout: { colNum: 24, rowHeight: 8, marginHorizontal: 16, marginVertical: 16 } },
    components: widgets.value.map(({ id, kind, summaryId, gridItem }) => ({ id, type: 'resourceSaasWidget',
      componentProps: { gridItem, resourcePage: { kind, summaryId }, visionEnabled: access.value.vision } })),
  }))
  // 组件集合参与键名，授权变化不会让画布删除其他组合的个人布局；旧 v8 键保留。
  const storageKey = computed(() => `resource-dashboard:saas:v9:${CryptoJS.MD5(JSON.stringify([
    capabilities.scope.value, resourcePageCanvasMode(layoutWidth.value), widgets.value.map(item => item.id).sort(),
  ])).toString()}`)
  return { capabilities, hasContent, catalog, dashboard, storageKey, ready: computed(() => layoutWidth.value > 0), fewNodes }
}
