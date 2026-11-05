import { computed, markRaw, provide, ref, watch, type Ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import type { DashboardCatalog, DashboardValue } from '@jetlinks-web-core/components/DashBoardCanvas'
import { privateOverviewContextKey, usePrivateOverview } from '../../../../visDashboard/Base/Private/usePrivateOverview'
import PrivateOverviewWidget from './PrivateOverviewWidget.vue'
import { buildPrivateApplicationLayout, buildPrivateOverviewLayout, privateOverviewGrid, privateOverviewLayoutStorageKey } from './layout'
import { migratePrivateAssetHeight, migratePrivateOverviewRecent } from './layoutStorage'

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
  const widgets = computed(() => runtime.onlyApplications.mode.value === 'applications'
    ? buildPrivateApplicationLayout(layoutWidth.value)
    : buildPrivateOverviewLayout(runtime.access.value, runtime.showAccess.value, layoutWidth.value,
      true, true, true, runtime.guide.data?.show || false))
  const storageKey = computed(() => privateOverviewLayoutStorageKey(runtime.capabilities.scope.value, layoutWidth.value, widgets.value))
  // 在挂载画布前迁移已有布局，避免新增最近访问时丢失个人拖拽记录。
  watch([storageKey, layoutWidth, runtime.capabilities.loading], () => {
    if (runtime.capabilities.loading.value || runtime.capabilities.errors.value.length || !layoutWidth.value
      || typeof localStorage === 'undefined' || runtime.onlyApplications.mode.value === 'applications') return
    try {
      migratePrivateOverviewRecent(localStorage, runtime.capabilities.scope.value, layoutWidth.value,
        runtime.access.value, runtime.showAccess.value, widgets.value)
      migratePrivateAssetHeight(localStorage, runtime.capabilities.scope.value, layoutWidth.value,
        runtime.access.value, runtime.showAccess.value, widgets.value)
    } catch { /* 存储不可用时仍渲染紧凑默认布局。 */ }
  }, { immediate: true, flush: 'sync' })
  const dashboard = computed<DashboardValue>(() => ({
    canvas: { backgroundColor: 'transparent', gridLayout: privateOverviewGrid },
    components: widgets.value.map(({ id, panel, metricId, gridItem }) => ({
      id, type: 'privateOverview', componentProps: { privateOverview: { panel, metricId }, gridItem },
    })),
  }))
  const loading = computed(() => runtime.capabilities.loading.value || !layoutWidth.value
    || (!runtime.capabilities.errors.value.length && runtime.onlyApplications.mode.value === 'checking'))
  const errors = computed(() => runtime.onlyApplications.mode.value === 'error'
    ? [new Error('Application authorization unavailable')] : runtime.capabilities.errors.value)
  const reload = () => runtime.onlyApplications.mode.value === 'error'
    ? runtime.onlyApplications.retry() : runtime.capabilities.reload()
  return { catalog, dashboard, storageKey, loading, errors, reload }
}
