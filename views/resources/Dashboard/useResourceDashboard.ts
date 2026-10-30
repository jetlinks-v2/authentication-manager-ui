import { computed, ref, watch, type Ref } from 'vue'
import { isSaaS } from '@jetlinks-web-core/utils/consts'
import { dashboardSources } from '@jetlinks-web-core/components/DashBoardCanvas/dashboard-sources'
import { useDashboardCatalog } from '@jetlinks-web-core/components/DashBoardCanvas/discovery'
import type { DashboardValue, DashboardWidget } from '@jetlinks-web-core/components/DashBoardCanvas'
import { kinds, typeOf } from '../../../visDashboard/ResourceCenter/shared'
import { provideResourceCapabilities, useResourceCapabilities } from '../../../visDashboard/ResourceCenter/hooks/useResourceCapabilities'
import { buildPrivateResourceLayout, buildSaasResourceLayout, resourceDeviceMapType, resourceVisionRankingType, resourceLayoutMode } from './resourceDashboardLayout'
import { migrateResourceLayout, resourceLayoutStorageKey } from './resourceLayoutStorage'
import { getQuickStartActions } from '../../../visDashboard/ResourceCenter/services/quickStart'
import { resourceKindAvailable } from '../../../visDashboard/ResourceCenter/services/capabilities'

const thumbnails = import.meta.glob('../../../visDashboard/ResourceCenter/*/thumbnail.svg', { eager: true,query: '?url',import: 'default' }) as Record<string,string>
const deviceMapGroup = 'device-manager-ui/visDashboard/DeviceManagement'
const deviceMapEntry = `${deviceMapGroup}/DeviceMapCard`
const hasDeviceMap = !!dashboardSources.get('device-manager-ui')?.['visDashboard/DeviceManagement']?.entries[deviceMapEntry]

/** 资源中心页面的组件发现范围与默认布局。 */
export function useResourceDashboard(preview: Ref<boolean> = ref(false), width: Ref<number> = ref(0)) {
  const capabilities = useResourceCapabilities(preview)
  provideResourceCapabilities(capabilities)
  const privateMode = computed(() => preview.value || !isSaaS)
  const allowed = computed(() => kinds.filter(kind => resourceKindAvailable(kind, capabilities.modules.value)))
  const actionCount = computed(() => getQuickStartActions({
    ...capabilities.capabilities.value, edge: capabilities.modules.value.edge,
  }, preview.value).length)
  const discovery = useDashboardCatalog(dashboardSources,computed(() => ({
    modules: ['authentication-manager-ui', ...(hasDeviceMap ? ['device-manager-ui'] : [])], directories: ['visDashboard'],
    groups: ['authentication-manager-ui/visDashboard/ResourceCenter', ...(hasDeviceMap ? [deviceMapGroup] : [])],
    entries: [...allowed.value.map(kind => `authentication-manager-ui/visDashboard/ResourceCenter/${kind}`),
      ...(hasDeviceMap ? [deviceMapEntry] : [])],
  })))
  const catalog = computed(() => ({ ...discovery.catalog.value,components: Object.fromEntries(Object.entries(discovery.catalog.value.components)
    .map(([type,definition]) => {
      const kind = type.replace('resourceCenter','')
      return [type,{ ...definition,thumbnail: thumbnails[`../../../visDashboard/ResourceCenter/${kind}/thumbnail.svg`] ?? definition.thumbnail }]
    })) }))
  const dashboard = computed<DashboardValue>(() => {
    const columns = privateMode.value ? 24 : 12
    const components: DashboardWidget[] = (privateMode.value
      ? buildPrivateResourceLayout(allowed.value, width.value, actionCount.value)
      : buildSaasResourceLayout(allowed.value, width.value, actionCount.value)).flatMap(([kind,x,y,w,h]) => {
      const type = typeOf(kind),definition = catalog.value.components[type]
      if (!definition) return []
      return [{ ...definition.defaultConfig,id: type,type,componentProps: { ...definition.defaultConfig.componentProps,
        gridItem: { ...definition.defaultGridItem,x,y,w,h } } }]
    })
    const mapDefinition = catalog.value.components[resourceDeviceMapType]
    if (hasDeviceMap && mapDefinition) {
      const bottom = Math.max(0, ...components.map(item => (item.componentProps.gridItem?.y ?? 0) + (item.componentProps.gridItem?.h ?? 0)))
      components.push({
        ...mapDefinition.defaultConfig, id: resourceDeviceMapType, type: resourceDeviceMapType,
        componentProps: { ...mapDefinition.defaultConfig.componentProps,
          // 此页每行及间距均为16px；14行下限覆盖地图320px正文及标题、内边距。
          gridItem: { ...mapDefinition.defaultGridItem, x: 0, y: bottom, w: columns, h: 16, minH: 14 } },
      })
    }
    return {
      canvas: { backgroundColor: 'transparent', gridLayout: { colNum: columns, rowHeight: 16, marginHorizontal: 16, marginVertical: 16 } },
      components,
    }
  })
  const profile = computed(() => ({
    scope: capabilities.scope.value,
    saas: !privateMode.value,
    mode: resourceLayoutMode(width.value),
    capabilities: capabilities.capabilities.value,
    widgets: allowed.value,
    deviceMap: hasDeviceMap,
  }))
  const storageKey = computed(() => preview.value ? undefined : resourceLayoutStorageKey(profile.value))
  const errors = computed(() => [...capabilities.errors.value, ...discovery.errors.value])
  const layoutReady = ref(false)

  // 完整组件集合和作用域确定后先迁移缓存，再挂载画布，避免中间态删除个人布局。
  watch([storageKey, dashboard, capabilities.loading, discovery.loading, errors], () => {
    layoutReady.value = false
    if (capabilities.loading.value || discovery.loading.value || errors.value.length) return
    if (!allowed.value.every(kind => !!catalog.value.components[typeOf(kind)])) return
    if (hasDeviceMap && !catalog.value.components[resourceDeviceMapType]) return
    try {
      if (storageKey.value && typeof localStorage !== 'undefined') {
        const mapGrid = dashboard.value.components.find(item => item.type === resourceDeviceMapType)?.componentProps.gridItem
        const rankingGrid = dashboard.value.components.find(item => item.type === resourceVisionRankingType)?.componentProps.gridItem
        migrateResourceLayout(localStorage, storageKey.value, dashboard.value.components.map(item => item.id), profile.value, mapGrid, rankingGrid)
      }
    } catch { /* 本地存储不可用时使用当前能力组合的默认坐标。 */ }
    layoutReady.value = true
  }, { immediate: true, deep: true, flush: 'sync' })

  const loading = computed(() => capabilities.loading.value || discovery.loading.value || (!layoutReady.value && !errors.value.length))
  async function reload() {
    await capabilities.reload()
    await discovery.reload()
  }
  return { ...discovery, catalog, dashboard, storageKey, loading, errors, reload }
}
