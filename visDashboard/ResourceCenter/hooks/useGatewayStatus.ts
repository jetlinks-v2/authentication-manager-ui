import { computed, onActivated, onDeactivated, onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import { useDocumentVisibility } from '@vueuse/core'
import { useGatewayRotation } from './useGatewayRotation'
import { getProjectCodeFromLocation } from '@jetlinks-web-core/utils/project-runtime'
import { settingsOf, type ResourceInfo } from '../shared'
import { gatewayMetrics, loadGatewayStatuses, loadGatewayHistory, type GatewayStatus, type GatewayMetric, type GatewayPoint } from '../services/gatewayStatus'

export function useGatewayStatus(info: Ref<ResourceInfo | undefined>, isEdit: Ref<boolean>) {
  const { t } = useI18n()
  const route = useRoute()
  const metric = ref<GatewayMetric>('queue')
  const selectedId = ref('')
  const gateways = shallowRef<GatewayStatus[]>([])
  const points = shallowRef<GatewayPoint[]>([])
  const trendEnd = ref(Date.now())
  const loading = ref(false), error = ref(false)
  const unit = ref('')
  const trendLoading = ref(false), trendError = ref(false)
  const active = ref(true)
  const preview = computed(() => isEdit.value || Boolean(info.value?.componentProps?.preview))
  const config = computed(() => settingsOf('VideoPlaybackTrend', info.value))
  const title = computed(() => config.value.title && !['视频播放趋势', 'Video playback trend'].includes(config.value.title)
    ? config.value.title : t('resourceDashboard.gatewayStatus.title'))
  const tabs = computed(() => gatewayMetrics.map(value => ({ value, label: t(`resourceDashboard.gatewayStatus.${value}`) })))
  const rankingTitle = computed(() => `${t(`resourceDashboard.gatewayStatus.${metric.value}Ranking`).replace(/\([^)]*\)$/, '').trim()}${unit.value ? `(${unit.value})` : ''}`)
  const rows = computed(() => {
    const sorted = gateways.value.filter(item => item.metrics[metric.value])
      .sort((a, b) => b.metrics[metric.value]!.value - a.metrics[metric.value]!.value || a.id.localeCompare(b.id)).slice(0, 10)
    const max = unit.value === '%' ? 100 : Math.max(1, ...sorted.map(item => item.metrics[metric.value]!.value))
    return sorted.map((item, index) => {
      const value = item.metrics[metric.value]!.value
      return { ...item, rank: index + 1, width: Math.min(100, value / max * 100),
        text: `${Number(value.toFixed(1))}${unit.value === '%' ? '%' : ''}`,
        color: value / max >= .8 ? '#ff4d57' : value / max >= .6 ? '#ffaa00' : '#1677ff' }
    })
  })
  const selected = computed(() => rows.value.find(item => item.id === selectedId.value))
  const visibility = useDocumentVisibility()
  const rotation = useGatewayRotation({
    ids: computed(() => rows.value.map(item => item.id)),
    selectedId,
    enabled: computed(() => active.value && !preview.value && visibility.value === 'visible'
      && !loading.value && !error.value && !trendLoading.value),
  })
  const trendTitle = computed(() => t('resourceDashboard.gatewayStatus.trendTitle', {
    name: selected.value?.name || '', metric: t(`resourceDashboard.gatewayStatus.${metric.value === 'queue' ? 'backlog' : metric.value === 'cpu' ? 'cpuUsage' : metric.value}`),
  }))
  const trendSummary = computed(() => ({
    name: selected.value?.name || '',
    description: t('resourceDashboard.gatewayStatus.trendDescription', {
      metric: t(`resourceDashboard.gatewayStatus.${metric.value === 'queue' ? 'backlog' : metric.value === 'cpu' ? 'cpuUsage' : metric.value}`),
    }),
  }))
  let generation = 0, trendGeneration = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  async function refresh() {
    if (!active.value) return
    const current = ++generation
    clearTimeout(timer)
    loading.value = !gateways.value.length
    error.value = false
    try {
      const result = preview.value ? { gateways: previewGateways(), unit: metric.value === 'queue' ? '条' : '%' } : await loadGatewayStatuses(metric.value)
      if (current !== generation) return
      unit.value = result.unit; gateways.value = result.gateways
    } catch {
      if (current === generation) { error.value = true; gateways.value = [] }
    } finally {
      if (current === generation) {
        loading.value = false
        if (!preview.value && config.value.refreshSeconds) timer = setTimeout(refresh, config.value.refreshSeconds * 1000)
      }
    }
  }
  async function refreshTrend() {
    const current = ++trendGeneration
    points.value = []; trendError.value = false; trendLoading.value = false
    const gateway = selected.value
    const property = gateway?.metrics[metric.value]?.property
    if (!active.value || !gateway || !property) return
    trendLoading.value = true
    try {
      const end = Date.now(), value = gateway.metrics[metric.value]!.value
      trendEnd.value = end
      const result = preview.value ? Array.from({ length: 25 }, (_, i) => ({
        time: end - (24 - i) * 3600000, value: Math.max(0, value * (0.2 + i / 30) + Math.sin(i) * value / 15),
      })) : await loadGatewayHistory(gateway.id, metric.value, end)
      if (current === trendGeneration) points.value = result
    } catch { if (current === trendGeneration) trendError.value = true }
    finally { if (current === trendGeneration) trendLoading.value = false }
  }
  watch(rows, value => {
    if (!value.some(item => item.id === selectedId.value)) selectedId.value = value[0]?.id || ''
  }, { immediate: true })
  watch([selected, metric, active], refreshTrend)
  watch([preview, active, metric, () => config.value.refreshSeconds,
    () => JSON.stringify([getProjectCodeFromLocation(), route.params.projectId, route.query.projectId])], () => {
    ++generation; ++trendGeneration; clearTimeout(timer)
    gateways.value = []; points.value = []; unit.value = ''
    if (active.value) void refresh()
  }, { immediate: true, flush: 'sync' })
  onActivated(() => { active.value = true })
  onDeactivated(() => { active.value = false; ++generation; ++trendGeneration; clearTimeout(timer) })
  onScopeDispose(() => { ++generation; ++trendGeneration; clearTimeout(timer) })
  const hasHistory = computed(() => points.value.some(point => point.value !== null))
  const option = computed(() => ({
    tooltip: { trigger: 'axis', renderMode: 'richText', valueFormatter: (value: number | null) => value === null ? '—' : `${Number(value.toFixed(1))}${unit.value}` },
    grid: { left: 0, right: 10, top: 8, bottom: 4, containLabel: true },
    xAxis: { type: 'time', min: trendEnd.value - 86400000, max: trendEnd.value,
      boundaryGap: false, splitNumber: 5, axisTick: { show: false }, axisLine: { show: false },
      axisLabel: { color: '#86909c', fontSize: 11, margin: 12, hideOverlap: true, formatter: (value: number) => dayjs(value).format('HH:mm') }, splitLine: { show: false } },
    yAxis: { type: 'value', min: 0, max: unit.value === '%' ? 100 : undefined, splitNumber: 4,
      interval: unit.value === '%' ? 25 : undefined,
      minInterval: unit.value === '%' ? undefined : 1, axisTick: { show: false }, axisLine: { show: false },
      axisLabel: { color: '#86909c', fontSize: 11, formatter: (value: number) => `${value}${unit.value === '%' ? '%' : ''}` },
      splitLine: { lineStyle: { color: '#edf0f4', type: 'dashed' } } },
    series: [{ type: 'line', name: t(`resourceDashboard.gatewayStatus.${metric.value}`), smooth: false, connectNulls: false, showSymbol: false,
      data: points.value.map(point => [point.time, point.value]), lineStyle: { color: '#1677ff', width: 2 },
      itemStyle: { color: '#1677ff' }, areaStyle: { color: {
        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: 'rgba(22,119,255,.16)' }, { offset: 1, color: 'rgba(22,119,255,.01)' }],
      } } }],
  }))
  return { title, metric, tabs, rankingTitle, rows, selectedId, trendTitle, trendSummary, option, points,
    loading, error, hasHistory, trendLoading, trendError, refresh, refreshTrend, rotation }
}

function previewGateways(): GatewayStatus[] {
  const names = ['徐家汇店', '南京西路店', '静安寺店', '中山公园', '虹桥天地店', '陆家嘴', '人民广场', '五角场', '天山路', '漕河泾']
  return [96, 82, 70, 65, 54, 47, 38, 26, 15, 8].map((value, index) => ({
    id: `preview-${index}`, name: `${names[index]}网关`, online: true,
    metrics: Object.fromEntries(gatewayMetrics.map((key, i) => [key, { property: key, value: Math.max(0, value - i * 7), unit: key === 'queue' ? '条' : '%' }])),
  }))
}
