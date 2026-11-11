import { computed, markRaw, provide, ref, watch, type Ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import type { DashboardCatalog, DashboardComponentDefinition, DashboardValue } from '@jetlinks-web-core/components/DashBoardCanvas'
import { useResourceCapabilities } from '../../../visDashboard/ResourceCenter/hooks/useResourceCapabilities'
import { useUserStore } from '@jetlinks-web-core/store/user'
import { getSaasGrantedMenus, getSaasOverviewAccess, getSaasProjectEntries, hasSaasTarget } from '../../../visDashboard/Base/Saas/services/access'
import { HOME_TARGETS } from '../../../visDashboard/Base/shared/navigation'
import { createDefaults } from '../../../visDashboard/Base/shared/config'
import type { createHomePolling } from '../../../visDashboard/Base/shared/homePolling'
import type { HomeFeature } from '../../../visDashboard/Base/shared/types'
import { useQuickGuideSteps } from '../../../visDashboard/Base/QuickGuide/useQuickGuideSteps'
import { quickGuideContextKey } from '../../../visDashboard/Base/QuickGuide/quickGuideContext'
import { usePrivateApplicationEntry } from '../../../visDashboard/Base/Private/usePrivateApplicationEntry'
import { saasApplicationEntryKey } from '../../../visDashboard/Base/Saas/useSaasUtilities'
import { buildSaasOverviewLayout, migrateSaasAccountLayout, migrateSaasOverviewLayout, saasOverviewGrid, saasOverviewLayoutStorageKey, type SaasOverviewFeature } from './saasOverviewLayout'
import OverviewCardLoading from './OverviewCardLoading.vue'
import { createOverviewAsyncComponent } from './useOverviewAsync'

const componentLoaders = {
  SaasSummary: () => import('./SaasSummary.vue'),
  QuickGuide: () => import('../../../visDashboard/Base/QuickGuide/ProjectHomeQuickGuide.vue'),
  SaasResources: () => import('../../../visDashboard/Base/Saas/SaasResources.vue'),
  SaasToday: () => import('../../../visDashboard/Base/Saas/SaasToday.vue'),
  SaasQuotas: () => import('../../../visDashboard/Base/Saas/SaasQuotas.vue'),
  Applications: () => import('../../../visDashboard/Base/Applications/ProjectHomeApplications.vue'),
  SaasRecent: () => import('../../../visDashboard/Base/Saas/SaasRecent.vue'),
  Announcements: () => import('../../../visDashboard/Base/Announcements/ProjectHomeAnnouncements.vue'),
  SaasHelp: () => import('../../../visDashboard/Base/Saas/SaasUtilityWidget.vue'),
  SaasAccount: () => import('../../../visDashboard/Base/Saas/SaasUtilityWidget.vue'),
  SaasMyApplications: () => import('../../../visDashboard/Base/Saas/SaasUtilityWidget.vue'),
}

/** 按授权装配实时卡片；欢迎信息和业务卡片统一由画布承接个人布局。 */
export function useSaasOverviewDashboard(host: Ref<HTMLElement | undefined>, polling?: ReturnType<typeof createHomePolling>) {
  const { width } = useElementSize(host)
  const layoutWidth = ref(0)
  // 首次拿到实际宽度后再挂载；页面暂时隐藏时保留上一宽度，不切换错误的布局缓存。
  watch(width, value => { if (value > 0) layoutWidth.value = Math.round(value) }, { immediate: true })
  const capabilities = useResourceCapabilities(ref(false))
  const user = useUserStore()
  const ready = computed(() => !capabilities.loading.value && !capabilities.errors.value.length)
  const projectAccess = computed(() => getSaasProjectEntries().length > 0)
  const onlyApplications = usePrivateApplicationEntry(projectAccess, ready, capabilities.scope, { refreshOnEntry: true })
  provide(saasApplicationEntryKey, onlyApplications)
  // 当前组件无法 inject 自己 provide 的值，显式传入页面轮询以共享资源和应用请求。
  const guide = useQuickGuideSteps(() => false, polling)
  provide(quickGuideContextKey, guide)
  const access = computed(() => getSaasOverviewAccess())
  const menus = computed(() => getSaasGrantedMenus())
  const showQuotas = computed(() => hasSaasTarget(menus.value, HOME_TARGETS.usage))
  const showApplications = computed(() => hasSaasTarget(menus.value, HOME_TARGETS.applications))
  const catalog: DashboardCatalog = { groups: [], components: Object.fromEntries(
    Object.entries(componentLoaders).map(([feature, loader]) => {
      const type = `projectHome${feature}`
      const component = markRaw(createOverviewAsyncComponent(loader, OverviewCardLoading))
      if (feature === 'SaasSummary') {
        return [type, {
          component, configs: [], groupId: 'saas-overview',
          defaultConfig: { type, componentProps: {} },
        } satisfies DashboardComponentDefinition]
      }
      const defaults = createDefaults((['SaasHelp', 'SaasRecent', 'SaasAccount', 'SaasMyApplications'].includes(feature) ? 'Applications' : feature) as HomeFeature)
      const definition: DashboardComponentDefinition = {
        component, configs: [], groupId: 'saas-overview',
        defaultConfig: { type, componentProps: { [type]: { ...defaults, chart: {
          ...defaults.chart, displayStyle: 'saas',
          titleKey: feature === 'SaasQuotas' ? 'saasQuotas' : feature,
          maxItems: feature === 'Announcements' ? 4 : feature === 'Applications' ? 3 : feature === 'SaasQuotas' ? 5 : undefined,
          showDescription: feature === 'Applications' || feature === 'Announcements', showDate: feature === 'Announcements',
        } } } },
      }
      return [type, definition]
    }),
  ) }
  const features = computed<SaasOverviewFeature[]>(() => onlyApplications.mode.value === 'applications'
    ? ['SaasSummary', 'SaasMyApplications', 'SaasAccount', 'Announcements', 'SaasHelp'] : [
      'SaasSummary',
      ...(guide.showGuide.value ? ['QuickGuide' as const] : []),
      'SaasRecent',
      ...(access.value.showResources ? ['SaasResources' as const] : []),
      ...(access.value.showToday ? ['SaasToday' as const] : []),
      ...(showQuotas.value ? ['SaasQuotas' as const] : []),
      ...(showApplications.value ? ['Applications' as const] : []),
      ...(!user.isAdmin && !showQuotas.value && !showApplications.value
        && (access.value.showResources || access.value.showToday) ? ['SaasAccount' as const] : []),
      'Announcements', 'SaasHelp',
  ])
  const storageKey = computed(() => saasOverviewLayoutStorageKey(capabilities.scope.value, layoutWidth.value, features.value))
  const counts = computed(() => ({
    resources: access.value.resourceIds.length, today: access.value.todayIds.length,
    singleDevice: access.value.resourceIds.length === 1 && access.value.resourceIds[0] === 'devices',
    singleVideo: access.value.resourceIds.length === 1 && access.value.resourceIds[0] === 'video',
  }))
  const layout = computed(() => buildSaasOverviewLayout(features.value, layoutWidth.value, counts.value))
  const dashboard = computed<DashboardValue>(() => {
    return {
      canvas: { backgroundColor: 'transparent', gridLayout: saasOverviewGrid },
      components: layout.value.map(({ feature, gridItem }) => {
        const type = `projectHome${feature}`
        return { id: type, type, componentProps: { ...catalog.components[type].defaultConfig.componentProps, gridItem } }
      }),
    }
  })
  // 在画布按新键挂载前完成迁移，业务数据刷新不重置已保存的位置。
  watch([storageKey, layoutWidth, capabilities.loading], () => {
    if (capabilities.loading.value || capabilities.errors.value.length || !layoutWidth.value || typeof localStorage === 'undefined') return
    const summary = layout.value.find(item => item.feature === 'SaasSummary')
    if (!summary) return
    try {
      migrateSaasOverviewLayout(localStorage, capabilities.scope.value, layoutWidth.value, features.value, summary.gridItem)
      migrateSaasAccountLayout(localStorage, capabilities.scope.value, layoutWidth.value, features.value, counts.value)
    } catch { /* 浏览器禁用存储时仍使用可拖拽的默认布局。 */ }
  }, { immediate: true, flush: 'sync' })
  const loading = computed(() => capabilities.loading.value || !layoutWidth.value
    || (!capabilities.errors.value.length && onlyApplications.mode.value === 'checking'))
  const errors = computed(() => onlyApplications.mode.value === 'error'
    ? [new Error('Application authorization unavailable')] : capabilities.errors.value)
  const reload = () => onlyApplications.mode.value === 'error' ? onlyApplications.retry() : capabilities.reload()
  return { catalog, dashboard, storageKey, loading,
    errors, reload }
}
