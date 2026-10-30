import { computed, defineAsyncComponent, markRaw, ref, watch, type Component, type Ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import type { DashboardCatalog, DashboardComponentDefinition, DashboardValue } from '@jetlinks-web-core/components/DashBoardCanvas'
import { useResourceCapabilities } from '../../../visDashboard/ResourceCenter/hooks/useResourceCapabilities'
import { getSaasGrantedMenus, getSaasOverviewAccess, hasSaasTarget } from '../../../visDashboard/Base/Saas/services/access'
import { HOME_TARGETS } from '../../../visDashboard/Base/shared/navigation'
import { createDefaults } from '../../../visDashboard/Base/shared/config'
import type { HomeFeature } from '../../../visDashboard/Base/shared/types'
import { buildSaasOverviewLayout, migrateSaasOverviewLayout, saasOverviewGrid, saasOverviewLayoutStorageKey, type SaasOverviewFeature } from './saasOverviewLayout'

const componentLoaders = {
  SaasSummary: () => import('./SaasSummary.vue'),
  SaasResources: () => import('../../../visDashboard/Base/Saas/SaasResources.vue'),
  SaasToday: () => import('../../../visDashboard/Base/Saas/SaasToday.vue'),
  SaasQuotas: () => import('../../../visDashboard/Base/Saas/SaasQuotas.vue'),
  Applications: () => import('../../../visDashboard/Base/Applications/ProjectHomeApplications.vue'),
  SaasRecent: () => import('../../../visDashboard/Base/Saas/SaasRecent.vue'),
  Announcements: () => import('../../../visDashboard/Base/Announcements/ProjectHomeAnnouncements.vue'),
  SaasHelp: () => import('../../../visDashboard/Base/Saas/SaasUtilityWidget.vue'),
}

/** 按授权装配实时卡片；欢迎信息和业务卡片统一由画布承接个人布局。 */
export function useSaasOverviewDashboard(host: Ref<HTMLElement | undefined>) {
  const { width } = useElementSize(host)
  const layoutWidth = ref(0)
  // 首次拿到实际宽度后再挂载；页面暂时隐藏时保留上一宽度，不切换错误的布局缓存。
  watch(width, value => { if (value > 0) layoutWidth.value = Math.round(value) }, { immediate: true })
  const capabilities = useResourceCapabilities(ref(false))
  const access = computed(() => getSaasOverviewAccess())
  const menus = computed(() => getSaasGrantedMenus())
  const showQuotas = computed(() => hasSaasTarget(menus.value, HOME_TARGETS.usage))
  const showApplications = computed(() => hasSaasTarget(menus.value, HOME_TARGETS.applications))
  const catalog: DashboardCatalog = { groups: [], components: Object.fromEntries(
    Object.entries(componentLoaders).map(([feature, loader]) => {
      const type = `projectHome${feature}`
      if (feature === 'SaasSummary') {
        return [type, {
          component: markRaw(defineAsyncComponent<Component>(loader)), configs: [], groupId: 'saas-overview',
          defaultConfig: { type, componentProps: {} },
        } satisfies DashboardComponentDefinition]
      }
      const defaults = createDefaults((['SaasHelp', 'SaasRecent'].includes(feature) ? 'QuickActions' : feature) as HomeFeature)
      const definition: DashboardComponentDefinition = {
        component: markRaw(defineAsyncComponent<Component>(loader)), configs: [], groupId: 'saas-overview',
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
  const features = computed<SaasOverviewFeature[]>(() => [
      'SaasSummary', 'SaasRecent',
      ...(access.value.showResources ? ['SaasResources' as const] : []),
      ...(access.value.showToday ? ['SaasToday' as const] : []),
      ...(showQuotas.value ? ['SaasQuotas' as const] : []),
      ...(showApplications.value ? ['Applications' as const] : []),
      'Announcements', 'SaasHelp',
  ])
  const storageKey = computed(() => saasOverviewLayoutStorageKey(capabilities.scope.value, layoutWidth.value, features.value))
  const layout = computed(() => buildSaasOverviewLayout(features.value, layoutWidth.value, {
    resources: access.value.resourceIds.length, today: access.value.todayIds.length,
  }))
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
  watch([storageKey, layoutWidth], () => {
    if (!layoutWidth.value || typeof localStorage === 'undefined') return
    const summary = layout.value.find(item => item.feature === 'SaasSummary')
    if (!summary) return
    try {
      migrateSaasOverviewLayout(localStorage, capabilities.scope.value, layoutWidth.value, features.value, summary.gridItem)
    } catch { /* 浏览器禁用存储时仍使用可拖拽的默认布局。 */ }
  }, { immediate: true, flush: 'sync' })
  const loading = computed(() => capabilities.loading.value || !layoutWidth.value)
  return { catalog, dashboard, storageKey, loading,
    errors: capabilities.errors, reload: capabilities.reload }
}
