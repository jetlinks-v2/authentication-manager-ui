import { computed, markRaw, provide, ref, watch, type Ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import type { DashboardCatalog, DashboardValue } from '@jetlinks-web-core/components/DashBoardCanvas'
import { privateOverviewContextKey, usePrivateOverview } from '../../../../visDashboard/Base/Private/usePrivateOverview'
import PrivateOverviewWidget from './PrivateOverviewWidget.vue'
import { buildPrivateOverviewLayout, privateOverviewGrid, privateOverviewLayoutStorageKey } from './layout'
import { migratePrivateOverviewHeights } from './layoutStorage'

/** 复用现有私有化查询，只将组件身份及几何交给共享画布保存。 */
export function usePrivateOverviewDashboard(host: Ref<HTMLElement | undefined>) {
  const runtime = usePrivateOverview()
  provide(privateOverviewContextKey, runtime)
  const { width } = useElementSize(host)
  const layoutWidth = ref(0)
  // KeepAlive 隐藏页面时宽度可能归零，保留上次断点与布局缓存。
  watch(width, value => { if (value > 0) layoutWidth.value = Math.round(value) }, { immediate: true })
  const catalog: DashboardCatalog = { groups: [], components: {
    privateOverview: { component: markRaw(PrivateOverviewWidget), configs: [], groupId: 'private-overview',
      defaultConfig: { type: 'privateOverview', componentProps: {} } },
  } }
  const widgets = computed(() => buildPrivateOverviewLayout(runtime.access.value, runtime.showAccess.value, layoutWidth.value))
  const storageKey = computed(() => privateOverviewLayoutStorageKey(runtime.capabilities.scope.value, layoutWidth.value, widgets.value))
  // 先迁移已保存的默认高度，再挂载画布；不会清空用户的拖拽记录。
  watch([storageKey, layoutWidth], () => {
    if (!layoutWidth.value || typeof localStorage === 'undefined') return
    try {
      migratePrivateOverviewHeights(localStorage, storageKey.value, layoutWidth.value, runtime.access.value, widgets.value)
    } catch { /* 存储不可用时仍渲染紧凑默认布局。 */ }
  }, { immediate: true, flush: 'sync' })
  const dashboard = computed<DashboardValue>(() => ({
    canvas: { backgroundColor: 'transparent', gridLayout: privateOverviewGrid },
    components: widgets.value.map(({ id, panel, metricId, gridItem }) => ({
      id, type: 'privateOverview', componentProps: { privateOverview: { panel, metricId }, gridItem },
    })),
  }))
  const loading = computed(() => runtime.capabilities.loading.value || !layoutWidth.value)
  return { catalog, dashboard, storageKey, loading, errors: runtime.capabilities.errors, reload: runtime.capabilities.reload }
}
