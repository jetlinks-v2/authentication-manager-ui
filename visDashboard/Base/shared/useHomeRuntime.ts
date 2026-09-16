import { inject, onActivated, onDeactivated, onUnmounted, ref, watch, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { getProjectCodeFromLocation } from '@jetlinks-web-core/utils/project-runtime'
import { loadHomeRows } from './api'
import { createHomePolling } from './homePolling'
import { homePollingKey } from './homePollingContext'
import { QUICK_ACTIONS } from './navigation'
import { RESOURCE_ROWS } from './resources'
import type { HomeFeature, HomeRow } from './types'

/** 卡片订阅所需数据；运维与设备卡片共享健康统计，离页停止订阅。 */
export function useHomeRuntime(feature: HomeFeature, isEdit: Ref<boolean>, refreshTime: Ref<number>, refreshKey: Ref<number> = ref(0)) {
  const polling = inject(homePollingKey, undefined) ?? createHomePolling(loadHomeRows)
  const route = useRoute()
  const rows = ref<HomeRow[]>([]), loading = ref(false), error = ref(false)
  const active = ref(true)
  const scope = () => JSON.stringify([getProjectCodeFromLocation(), route.params.projectId, route.query.projectId])
  const keys: HomeFeature[] = feature === 'Operations' ? ['DeviceAccess', 'Operations']
    : feature === 'Resources' ? ['DeviceAccess', 'Collection', 'Visualization', 'AiCenter', 'RuleEngine'] : [feature]
  let stop = () => {}
  watch([isEdit, refreshTime, active, scope], () => {
    stop()
    rows.value = []; error.value = false; loading.value = false
    if (!active.value) return
    if (feature === 'QuickActions') {
      rows.value = QUICK_ACTIONS.map(({ id, target }) => ({ id, labelKey: `action_${id}`, descriptionKey: `action_${id}Desc`, icon: id, target }))
      return
    }
    if (isEdit.value) return
    const results = new Map<HomeFeature, HomeRow[]>()
    const failures = new Set<HomeFeature>()
    loading.value = true
    const stops = keys.map(key => polling.subscribe(key, Number(refreshTime.value), (data, failed) => {
      results.set(key, data ?? [])
      if (failed) failures.add(key); else failures.delete(key)
      const combined = keys.flatMap(item => results.get(item) ?? [])
      rows.value = feature === 'Resources' || feature === 'DeviceAccess'
        ? RESOURCE_ROWS.flatMap(template => {
          const value = combined.find(row => row.id === template.id)
          return value ? [{ ...template, ...value, group: template.group, subgroup: template.subgroup }] : []
        }) : combined
      loading.value = results.size < keys.length
      error.value = !loading.value && (failures.size > 0 || (rows.value.length > 0 && rows.value.every(row => row.failed)))
    }, scope()))
    stop = () => stops.forEach(dispose => dispose())
  }, { immediate: true })
  const retry = () => polling.refresh(keys, scope())
  watch(refreshKey, retry)
  onActivated(() => { active.value = true })
  onDeactivated(() => { active.value = false; stop() })
  onUnmounted(() => stop())
  return { rows, loading, error, retry }
}
