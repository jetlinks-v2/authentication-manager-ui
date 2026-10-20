import { computed, inject, onActivated, onDeactivated, onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { getProjectCodeFromLocation } from '@jetlinks-web-core/utils/project-runtime'
import { createVideoSummaryPolling, videoSummaryKey } from './videoSummaryContext'
import { isSaaS } from '@jetlinks-web-core/utils/consts'
import { defaultSettings, emptyData, settingsOf, type DeviceKind, type ResourceInfo, type ResourceKind, type TimeRange } from '../shared'
import { loadSummary, loadVisualization, loadCollection, loadAlgorithmCoverage } from '../services/metrics'
import { loadMessageTrend, loadNetworkCards } from '../services/trends'
import { loadDistribution } from '../services/distribution'
import { previewData } from '../services/preview'
import { useDashboardModules } from '../../useDashboardModules'

/** 每个组件持有独立取数生命周期；配置/筛选变化立即清空旧数据并废弃迟到响应。 */
export function useResourceWidget(kind: ResourceKind, info: Ref<ResourceInfo | undefined>, isEdit: Ref<boolean>) {
  const config = computed(() => settingsOf(kind, info.value))
  const deviceType = ref<DeviceKind>(defaultSettings.deviceType)
  const timeRange = ref<TimeRange>(defaultSettings.timeRange)
  const data = shallowRef(emptyData())
  const loading = ref(false), error = ref(false)
  const isPreview = computed(() => isEdit.value || Boolean(info.value?.componentProps?.preview))
  const modules = useDashboardModules(isPreview)
  const deviceKinds = computed<DeviceKind[]>(() => modules.value.edge ? ['edge', 'iot', 'video'] : ['iot', 'video'])
  const unavailable = computed(() => !isPreview.value && (
    (isSaaS && ['Collection', 'NetworkCards'].includes(kind)) || (kind === 'EdgeNodes' && !modules.value.edge)
  ))
  let epoch = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  const active = ref(true)
  const route = useRoute()
  const scope = () => JSON.stringify([getProjectCodeFromLocation(), route.params.projectId, route.query.projectId])
  const videoPolling = kind === 'VideoDevices'
    ? inject(videoSummaryKey, undefined) ?? createVideoSummaryPolling()
    : undefined
  let unsubscribe = () => {}
  // 先修正旧配置中的 edge，再运行统计 watcher，避免隐藏 Tab 后仍发出一次边缘查询。
  watch(() => config.value.deviceType, value => {
    deviceType.value = deviceKinds.value.includes(value) ? value : 'iot'
  }, { immediate: true, flush: 'sync' })
  watch(deviceKinds, available => {
    if (!available.includes(deviceType.value)) deviceType.value = 'iot'
  }, { flush: 'sync' })
  watch(() => config.value.timeRange, value => { timeRange.value = value }, { immediate: true })

  /** 自动刷新在上次请求结束后安排，避免慢请求叠加；手动重试独立推进版本。 */
  async function refresh() {
    if (videoPolling && !isPreview.value) {
      videoPolling.refresh(['DeviceAccess'], scope())
      return
    }
    const current = ++epoch
    clearTimeout(timer)
    error.value = false
    if (unavailable.value || kind === 'QuickStart') { data.value = emptyData(); loading.value = false; return }
    if (isPreview.value) { data.value = previewData(kind, deviceType.value, timeRange.value); loading.value = false; return }
    loading.value = true
    try {
      const result = emptyData()
      if (['EdgeNodes', 'IotDevices', 'VideoDevices'].includes(kind)) result.metrics = await loadSummary(kind)
      else if (kind === 'Visualization') result.metrics = await loadVisualization()
      else if (kind === 'AlgorithmCoverage') result.algorithms = await loadAlgorithmCoverage()
      else if (kind === 'Collection') {
        try {
          result.metrics = await loadCollection()
        } catch {
          result.metrics = []
        }
      }
      else if (kind === 'MessageTrend') result.series = await loadMessageTrend(timeRange.value)
      else if (kind === 'DeviceDistribution') result.distribution = await loadDistribution(deviceType.value)
      else if (kind === 'NetworkCards') {
        const flow = await loadNetworkCards()
        Object.assign(result, flow)
      }
      if (current === epoch) data.value = result
    } catch {
      if (current === epoch) { error.value = true; data.value = emptyData() }
    } finally {
      if (current === epoch) {
        loading.value = false
        if (config.value.refreshSeconds) timer = setTimeout(refresh, config.value.refreshSeconds * 1000)
      }
    }
  }
  watch([deviceType, timeRange, () => config.value.refreshSeconds, isPreview, unavailable, modules, active, scope], () => {
    unsubscribe(); ++epoch; clearTimeout(timer)
    data.value = emptyData()
    if (!active.value) return
    if (videoPolling && !isPreview.value) {
      loading.value = true; error.value = false
      unsubscribe = videoPolling.subscribe('DeviceAccess', config.value.refreshSeconds, (rows, failed) => {
        const summary = rows?.[0]
        if (failed || !summary) { error.value = true; loading.value = false; data.value = emptyData(); return }
        const total = summary.value ?? 0, online = summary.online ?? 0
        data.value = { ...emptyData(), metrics: [{ key: 'total', value: total }, { key: 'online', value: online }, { key: 'offline', value: Math.max(0, total - online) }] }
        error.value = false; loading.value = false
      }, scope())
      return
    }
    void refresh()
  }, { immediate: true })
  onActivated(() => { active.value = true })
  onDeactivated(() => { active.value = false; ++epoch; unsubscribe(); clearTimeout(timer) })
  onScopeDispose(() => { ++epoch; unsubscribe(); clearTimeout(timer) })
  return { config, deviceType, deviceKinds, timeRange, data, loading, error, unavailable, refresh }
}
