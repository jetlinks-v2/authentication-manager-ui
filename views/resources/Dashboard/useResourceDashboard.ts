import { computed, ref, watch, type Ref } from 'vue'
import { isSaaS } from '@jetlinks-web-core/utils/consts'
import { dashboardSources } from '@jetlinks-web-core/components/DashBoardCanvas/dashboard-sources'
import { useDashboardCatalog } from '@jetlinks-web-core/components/DashBoardCanvas/discovery'
import type { DashboardValue } from '@jetlinks-web-core/components/DashBoardCanvas'
import { kinds,typeOf,type ResourceKind } from '../../../visDashboard/ResourceCenter/shared'
import { provideResourceCapabilities, useResourceCapabilities } from '../../../visDashboard/ResourceCenter/hooks/useResourceCapabilities'
import { buildPrivateResourceLayout, resourceLayoutMode, saasResourceLayout } from './resourceDashboardLayout'
import { migrateResourceLayout, resourceLayoutStorageKey } from './resourceLayoutStorage'
import { getQuickStartActions } from '../../../visDashboard/ResourceCenter/services/quickStart'

const thumbnails = import.meta.glob('../../../visDashboard/ResourceCenter/*/thumbnail.svg', { eager: true,query: '?url',import: 'default' }) as Record<string,string>

/** 资源中心页面的组件发现范围与默认布局。 */
export function useResourceDashboard(preview: Ref<boolean> = ref(false), width: Ref<number> = ref(0)) {
  const capabilities = useResourceCapabilities(preview)
  provideResourceCapabilities(capabilities)
  const privateMode = computed(() => preview.value || !isSaaS)
  const allowed = computed(() => kinds.filter(kind => (
    kind === 'Collection' ? capabilities.capabilities.value.collection
      : kind === 'NetworkCards' ? capabilities.capabilities.value.networkCards
        : ['EdgeNodes', 'VideoPlaybackTrend'].includes(kind) ? capabilities.modules.value.edge : true
  )))
  const actionCount = computed(() => getQuickStartActions({
    ...capabilities.capabilities.value, edge: capabilities.modules.value.edge,
  }, isSaaS, preview.value).length)
  const discovery = useDashboardCatalog(dashboardSources,computed(() => ({
    modules: ['authentication-manager-ui'],directories: ['visDashboard'],
    groups: ['authentication-manager-ui/visDashboard/ResourceCenter'],
    entries: allowed.value.map(kind => `authentication-manager-ui/visDashboard/ResourceCenter/${kind}`),
  })))
  const catalog = computed(() => ({ ...discovery.catalog.value,components: Object.fromEntries(Object.entries(discovery.catalog.value.components)
    .map(([type,definition]) => {
      const kind = type.replace('resourceCenter','') as ResourceKind
      return [type,{ ...definition,thumbnail: thumbnails[`../../../visDashboard/ResourceCenter/${kind}/thumbnail.svg`] }]
    })) }))
  const dashboard = computed<DashboardValue>(() => ({
    canvas: { backgroundColor: 'transparent', gridLayout: { colNum: preview.value || !isSaaS ? 24 : 12, rowHeight: 16, marginHorizontal: 18, marginVertical: 18 } },
    components: (privateMode.value
      ? buildPrivateResourceLayout(allowed.value, width.value, actionCount.value)
      : saasResourceLayout).flatMap(([kind,x,y,w,h]) => {
      const type = typeOf(kind),definition = catalog.value.components[type]
      if (!definition) return []
      return [{ ...definition.defaultConfig,id: type,type,componentProps: { ...definition.defaultConfig.componentProps,
        gridItem: { ...definition.defaultGridItem,x,y,w,h } } }]
    }),
  }))
  const profile = computed(() => ({
    scope: capabilities.scope.value,
    saas: !privateMode.value,
    mode: privateMode.value ? resourceLayoutMode(width.value) : 'wide' as const,
    capabilities: capabilities.capabilities.value,
    widgets: allowed.value,
  }))
  const storageKey = computed(() => preview.value ? undefined : resourceLayoutStorageKey(profile.value))
  const errors = computed(() => [...capabilities.errors.value, ...discovery.errors.value])
  const layoutReady = ref(false)

  // 完整组件集合和作用域确定后先迁移缓存，再挂载画布，避免中间态删除个人布局。
  watch([storageKey, dashboard, capabilities.loading, discovery.loading, errors], () => {
    layoutReady.value = false
    if (capabilities.loading.value || discovery.loading.value || errors.value.length) return
    if (!allowed.value.every(kind => !!catalog.value.components[typeOf(kind)])) return
    try {
      if (storageKey.value && typeof localStorage !== 'undefined') {
        migrateResourceLayout(localStorage, storageKey.value, dashboard.value.components.map(item => item.id), profile.value)
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
