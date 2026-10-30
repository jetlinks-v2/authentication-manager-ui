import { computed, inject, onActivated, onDeactivated, onUnmounted, ref, watch, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { getProjectCodeFromLocation, getApplicationRuntimeEntry } from '@jetlinks-web-core/utils/project-runtime'
import { useUserStore } from '@jetlinks-web-core/store/user'
import { getSaasGrantedMenus } from '../Saas/services/access'
import { loadHomeRows } from './api'
import { createHomePolling } from './homePolling'
import { homePollingKey } from './homePollingContext'
import { QUICK_ACTIONS } from './navigation'
import { RESOURCE_ROWS, resourceRowAvailable, homeFeatureAvailable, homeTitleKey } from './resources'
import { useDashboardModules } from '../../useDashboardModules'
import type { HomeFeature, HomeRow } from './types'

/** 卡片订阅所需数据；运维与设备卡片共享健康统计，离页停止订阅。 */
export function useHomeRuntime(feature: HomeFeature, isEdit: Ref<boolean>, refreshTime: Ref<number>, refreshKey: Ref<number> = ref(0), sharedPolling?: ReturnType<typeof createHomePolling>, enabled: Readonly<Ref<boolean>> = ref(true), source: Readonly<Ref<HomeFeature>> = ref(feature)) {
  const polling = sharedPolling ?? inject(homePollingKey, undefined) ?? createHomePolling(loadHomeRows)
  const route = useRoute()
  const modules = useDashboardModules(isEdit)
  const user = useUserStore()
  const available = computed(() => enabled.value && (isEdit.value || homeFeatureAvailable(feature, modules.value)))
  const titleKey = computed(() => homeTitleKey(feature, modules.value))
  const rows = ref<HomeRow[]>([]), loading = ref(false), error = ref(false), updatedAt = ref<number>()
  const active = ref(true)
  // 账号、应用或任一能力变化都切换订阅范围，旧缓存和迟到响应不得重新带回已隐藏的信息。
  const scope = () => JSON.stringify([user.userInfo.id, getProjectCodeFromLocation(), route.params.projectId,
    route.query.projectId, getApplicationRuntimeEntry().applicationId, modules.value, [...getSaasGrantedMenus()].sort()])
  const keys = computed<HomeFeature[]>(() => feature === 'Operations' ? ['DeviceAccess', 'Operations']
    : feature === 'Resources' ? ['DeviceAccess', 'Collection', 'Visualization', 'AiCenter', 'RuleEngine'] : [source.value])
  let stop = () => {}
  watch([isEdit, refreshTime, active, scope, available, source], () => {
    stop()
    rows.value = []; error.value = false; loading.value = false; updatedAt.value = undefined
    if (!active.value || !available.value) return
    if (feature === 'QuickActions') {
      rows.value = QUICK_ACTIONS.filter(row => isEdit.value || resourceRowAvailable(row))
        .map(({ id, target }) => ({ id, labelKey: `action_${id}`, descriptionKey: `action_${id}Desc`, icon: id, target }))
      return
    }
    if (isEdit.value) return
    const results = new Map<HomeFeature, HomeRow[]>()
    const completed = new Map<HomeFeature, number>()
    const failures = new Set<HomeFeature>()
    loading.value = true
    const activeKeys = keys.value.filter(key => homeFeatureAvailable(key, modules.value))
    const stops = activeKeys.map(key => polling.subscribe(key, Number(refreshTime.value), (data, failed, completedAt) => {
      results.set(key, data ?? [])
      completed.set(key, completedAt)
      if (failed) failures.add(key); else failures.delete(key)
      const combined = activeKeys.flatMap(item => results.get(item) ?? [])
      rows.value = feature === 'Resources' || feature === 'DeviceAccess'
        ? RESOURCE_ROWS.flatMap(template => {
          const value = combined.find(row => row.id === template.id)
          return value ? [{ ...template, ...value, group: template.group, subgroup: template.subgroup }] : []
        }).filter(row => resourceRowAvailable(row)) : feature.startsWith('Saas') ? combined : combined.filter(row => resourceRowAvailable(row))
      loading.value = results.size < activeKeys.length
      error.value = !loading.value && (failures.size > 0 || (rows.value.length > 0 && rows.value.every(row => row.failed)))
      // 缓存回放沿用实际完成时间；部分失败和无数据时不宣称统计已更新。
      updatedAt.value = !loading.value && !error.value && rows.value.length && !rows.value.some(row => row.failed)
        ? Math.min(...completed.values()) : undefined
    }, scope()))
    stop = () => stops.forEach(dispose => dispose())
  }, { immediate: true })
  const retry = () => polling.refresh(keys.value, scope())
  watch(refreshKey, retry)
  onActivated(() => { active.value = true })
  onDeactivated(() => { active.value = false; stop() })
  onUnmounted(() => stop())
  return { rows, loading, error, retry, available, titleKey, updatedAt }
}
