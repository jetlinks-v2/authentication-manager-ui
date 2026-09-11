import { computed, onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue'
import { isSaaS } from '@jetlinks-web-core/utils/consts'
import { defaultSettings, emptyData, settingsOf, type DeviceKind, type ResourceInfo, type ResourceKind, type TimeRange } from '../shared'
import { loadSummary, loadVisualization, loadCollection, loadAlgorithmCoverage } from '../services/metrics'
import { loadMessageTrend, loadNetworkCards } from '../services/trends'
import { loadDistribution } from '../services/distribution'
import { previewData } from '../services/preview'

/** 每个组件持有独立取数生命周期；配置/筛选变化立即清空旧数据并废弃迟到响应。 */
export function useResourceWidget(kind: ResourceKind, info: Ref<ResourceInfo | undefined>, isEdit: Ref<boolean>) {
  const config = computed(() => settingsOf(kind, info.value))
  const deviceType = ref<DeviceKind>(defaultSettings.deviceType)
  const timeRange = ref<TimeRange>(defaultSettings.timeRange)
  const data = shallowRef(emptyData())
  const loading = ref(false), error = ref(false)
  const isPreview = computed(() => isEdit.value || Boolean(info.value?.componentProps?.preview))
  const unavailable = computed(() => !isPreview.value && isSaaS && ['Collection', 'NetworkCards'].includes(kind))
  let epoch = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  watch(() => config.value.deviceType, value => { deviceType.value = value }, { immediate: true })
  watch(() => config.value.timeRange, value => { timeRange.value = value }, { immediate: true })

  /** 自动刷新在上次请求结束后安排，避免慢请求叠加；手动重试独立推进版本。 */
  async function refresh() {
    const current = ++epoch
    clearTimeout(timer)
    error.value = false
    if (unavailable.value || kind === 'QuickStart') { data.value = emptyData(); loading.value = false; return }
    if (isEdit.value) { data.value = previewData(kind, deviceType.value, timeRange.value); loading.value = false; return }
    loading.value = true
    try {
      const result = emptyData()
      if (['EdgeNodes', 'IotDevices', 'VideoDevices'].includes(kind)) result.metrics = await loadSummary(kind)
      else if (kind === 'Visualization') result.metrics = await loadVisualization()
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
      else if (kind === 'AlgorithmCoverage') {
        const videoSummary = await loadSummary('VideoDevices').catch(() => [])
        const videoTotal = videoSummary.find(m => m.key === 'total')?.value || 0
        result.algorithms = await loadAlgorithmCoverage(videoTotal)
      }
      else if (kind === 'VideoPlaybackTrend') {
        const videoSummary = await loadSummary('VideoDevices').catch(() => [])
        const videoTotal = videoSummary.find(m => m.key === 'total')?.value || 0
        result.series = videoTotal > 0 ? previewData('VideoPlaybackTrend', deviceType.value, timeRange.value).series : []
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
  watch([deviceType, timeRange, () => config.value.refreshSeconds, isEdit, unavailable], () => {
    data.value = emptyData()
    void refresh()
  }, { immediate: true })
  onScopeDispose(() => { ++epoch; clearTimeout(timer) })
  return { config, deviceType, timeRange, data, loading, error, unavailable, refresh }
}
