import { computed, markRaw, onActivated, onDeactivated, provide, ref, watch, type Ref } from 'vue'
import CryptoJS from 'crypto-js'
import dayjs from 'dayjs'
import { useI18n } from 'vue-i18n'
import { isSaaS } from '@jetlinks-web-core/utils/consts'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { moduleRegistry } from '@jetlinks-web-core/utils/module-registry'
import { dashboardSources } from '@jetlinks-web-core/components/DashBoardCanvas/dashboard-sources'
import { useDashboardCatalog } from '@jetlinks-web-core/components/DashBoardCanvas/discovery'
import type { DashboardCatalog, DashboardValue, DashboardWidget } from '@jetlinks-web-core/components/DashBoardCanvas'
import { provideResourceCapabilities, useResourceCapabilities } from '../../../visDashboard/ResourceCenter/hooks/useResourceCapabilities'
import { provideVideoSummary } from '../../../visDashboard/ResourceCenter/hooks/videoSummaryContext'
import { hasGrantedResourceMenu, resolveResourcePageAccess } from './services/resourcePageAccess'
import { buildResourcePageLayout } from './resourcePageLayout'
import { getResourceSummaryKinds } from './services/resourceSummary'
import { useResourceSummary } from './useResourceSummary'
import { buildResourcePageWidgets, resourcePageCanvasMode } from './resourcePageCanvas'
import { resourcePageContextKey } from './resourcePageContext'
import ResourceDashboardWidget from './components/ResourceDashboardWidget.vue'
import { buildResourceDeviceScope } from './services/resourceDeviceScope'
import { migrateResourceDistributionLayout } from './resourceLayoutStorage'

const mapGroup = 'device-manager-ui/visDashboard/DeviceManagement'
const mapEntry = `${mapGroup}/DeviceMapCard`

/** 原型作为默认画布排布；实际坐标的保存和恢复统一交给 core 画布。 */
export function useResourcePage(width: Readonly<Ref<number>>) {
  const { t } = useI18n()
  const active = ref(true)
  onActivated(() => { active.value = true })
  onDeactivated(() => { active.value = false })
  const layoutWidth = ref(0)
  // 缓存页面暂时隐藏时宽度会归零，保留实际宽度以免切换个人布局或重建业务卡片。
  watch(width, value => { if (value > 0) layoutWidth.value = Math.round(value) }, { immediate: true })
  const menu = useMenuStore()
  const capabilities = useResourceCapabilities(ref(false), true)
  provideResourceCapabilities(capabilities)
  provideVideoSummary()
  const access = computed(() => {
    return resolveResourcePageAccess({ saas: isSaaS,
      menus: menu.initialized && !menu.loading ? menu.menuResultCache : [],
      installed: name => moduleRegistry.hasModule(name),
      edgeSupported: capabilities.modules.value.edge,
    })
  })
  const mapSourceAvailable = computed(() => access.value.map
    && !!dashboardSources.get('device-manager-ui')?.['visDashboard/DeviceManagement']?.entries[mapEntry])
  const deviceScope = computed(() => buildResourceDeviceScope(access.value))
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
        // 沿用原设备地图的默认模式，保留高德地图的拖动、缩放和聚合交互。
        scope: capabilities.scope.value, showStatus: true,
        deviceTerms: deviceScope.value.terms,
      } },
    }
  })
  const nodeCount = ref<number>()
  const cells = computed(() => buildResourcePageLayout(access.value, nodeCount.value))
  const fewNodes = computed(() => nodeCount.value !== undefined && nodeCount.value <= 3)
  watch([capabilities.scope, () => access.value.edge], () => { nodeCount.value = undefined })
  function onGatewayCount(count: number) { nodeCount.value = count }
  const hasContent = computed(() => cells.value.length > 0 || getResourceSummaryKinds(access.value).length > 0)
  const messageRange = computed(() => getResourceSummaryKinds(access.value).includes('message') ? '7d' : 'today')
  const summary = useResourceSummary(access, capabilities.scope)
  const updatedText = computed(() => summary.updatedAt?.value
    ? t('resourcePage.updatedAt', { time: dayjs(summary.updatedAt.value).format('YYYY-MM-DD HH:mm') }) : undefined)
  provide(resourcePageContextKey, { scope: capabilities.scope, summary, messageRange, mapWidget,
    deviceScope,
    mapDefinition: computed(() => mapDiscovery.catalog.value.components.deviceMapCard), mapLoading: mapDiscovery.loading,
    reloadMap: mapDiscovery.reload, onGatewayCount })
  const widgets = computed(() => buildResourcePageWidgets(getResourceSummaryKinds(access.value), cells.value,
    layoutWidth.value, nodeCount.value, { private: !access.value.saas }))
  const catalog: DashboardCatalog = { groups: [], components: {
    resourceSaasWidget: { component: markRaw(ResourceDashboardWidget), configs: [], groupId: 'saas-resource-dashboard',
      defaultConfig: { type: 'resourceSaasWidget', componentProps: {} } },
  } }
  const dashboard = computed<DashboardValue>(() => ({
    canvas: { backgroundColor: 'transparent', gridLayout: { colNum: 24, rowHeight: 8, marginHorizontal: 16, marginVertical: 16 } },
    components: widgets.value.map(({ id, kind, summaryId, gridItem }) => ({ id, type: 'resourceSaasWidget',
      componentProps: { gridItem, resourcePage: { kind, summaryId }, visionEnabled: access.value.vision } })),
  }))
  /** 新旧组件集合沿用同一范围算法，迁移不会跨账号、部署、宽度或能力组合读取。 */
  function layoutKey(ids: readonly string[]) {
    return `resource-dashboard:${access.value.saas ? 'saas:v9' : access.value.map ? 'private:v1' : 'private:v4'}:${CryptoJS.MD5(JSON.stringify([
      capabilities.scope.value, resourcePageCanvasMode(layoutWidth.value), [...ids].sort(),
      ...(!access.value.saas ? [cells.value.map(cell => [cell.id, cell.panels, cell.offline])] : []),
    ])).toString()}`
  }
  const storageKey = computed(() => layoutKey(widgets.value.map(item => item.id)))
  // 在画布恢复前复制同范围的旧布局。
  watch([storageKey, () => layoutWidth.value > 0, capabilities.loading], ([key, ready]) => {
    if (capabilities.loading.value || capabilities.errors.value.length || !ready
      || !widgets.value.some(item => item.kind === 'distribution')) return
    try {
      if (typeof localStorage === 'undefined') return
      const legacyKey = layoutKey(widgets.value.flatMap(item => item.kind === 'distribution'
        ? ['resource-panel-map', 'resource-panel-offline'] : [item.id]))
      const mapOnlyLegacyKey = access.value.saas ? layoutKey(widgets.value.map(item => item.kind === 'distribution'
        ? 'resource-panel-map' : item.id)) : undefined
      migrateResourceDistributionLayout(localStorage, key, legacyKey, widgets.value, mapOnlyLegacyKey)
    } catch { /* 禁用浏览器存储时使用默认排布。 */ }
  }, { immediate: true, flush: 'sync' })
  // 无资源且有概览权限时返回概览，缓存页面停用时不触发跳转。
  const overviewGranted = computed(() => hasGrantedResourceMenu(menu.menuResultCache, 'project/Overview')
    && !!menu.getMenu('project/Overview'))
  watch([active, () => menu.initialized, () => menu.loading, hasContent, overviewGranted, capabilities.loading, capabilities.errors], ([visible, initialized, loading, content, overview, checking, errors]) => {
    if (visible && initialized && !loading && !checking && !errors.length && !content
      && overview) {
      void menu.jumpPage('project/Overview')
    }
  }, { immediate: true })
  return { capabilities, hasContent, catalog, dashboard, storageKey, ready: computed(() => layoutWidth.value > 0), fewNodes,
    isPrivate: computed(() => !access.value.saas), updatedText, dense: computed(() => getResourceSummaryKinds(access.value).length >= 5) }
}
