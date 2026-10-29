import { computed, onActivated, onDeactivated, onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDocumentVisibility } from '@vueuse/core'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { useDashboardModules } from '../../useDashboardModules'
import { getProjectCodeFromLocation } from '@jetlinks-web-core/utils/project-runtime'
import { settingsOf, type ResourceInfo } from '../shared'
import type { ResourceRankRow } from '../components/resourceRank'
import { gatewayMetrics, loadGatewayStatuses, type GatewayStatus, type GatewayMetric } from '../services/gatewayStatus'

export interface GatewayRankRow extends GatewayStatus, ResourceRankRow {}

export function useGatewayStatus(info: Ref<ResourceInfo | undefined>, isEdit: Ref<boolean>) {
  const { t } = useI18n()
  const route = useRoute(), menu = useMenuStore()
  const metric = ref<GatewayMetric>('queue')
  const gateways = shallowRef<GatewayStatus[]>([])
  const loading = ref(false), error = ref(false), unit = ref('')
  const active = ref(true), visibility = useDocumentVisibility()
  const preview = computed(() => isEdit.value || Boolean(info.value?.componentProps?.preview))
  const modules = useDashboardModules(preview)
  const config = computed(() => settingsOf('VideoPlaybackTrend', info.value))
  const title = computed(() => config.value.title && !['视频播放趋势', 'Video playback trend'].includes(config.value.title)
    ? config.value.title : t('resourceDashboard.gatewayStatus.title'))
  const availableMetrics = computed(() => gatewayMetrics.filter(value => value !== 'queue' || modules.value.vision))
  const tabs = computed(() => availableMetrics.value.map(value => ({ value, label: t(`resourceDashboard.gatewayStatus.${value}`) })))
  const available = computed(() => modules.value.edge)
  const canOpenList = computed(() => available.value && !preview.value && !!menu.getMenu('iot-user-device-list'))
  const canOpenGateway = computed(() => available.value && !preview.value && !!menu.getMenu('iot-user-device-list/GatewayDetail'))
  const emptyDescription = computed(() => t(modules.value.vision
    ? 'resourceDashboard.gatewayStatus.emptyDescription'
    : 'resourceDashboard.gatewayStatus.loadEmptyDescription'))
  // 撤销视觉能力后先切换选项，不能继续请求复判队列。
  watch(availableMetrics, values => {
    if (!values.includes(metric.value)) metric.value = values[0]
  }, { immediate: true, flush: 'sync' })
  const rows = computed<GatewayRankRow[]>(() => {
    const sorted = gateways.value.filter(item => item.metrics[metric.value])
      .sort((a, b) => b.metrics[metric.value]!.value - a.metrics[metric.value]!.value || a.id.localeCompare(b.id)).slice(0, 10)
    const max = unit.value === '%' ? 100 : Math.max(1, ...sorted.map(item => item.metrics[metric.value]!.value))
    return sorted.map((item, index) => {
      const value = item.metrics[metric.value]!.value
      return { ...item, rank: index + 1, width: Math.min(100, value / max * 100),
        label: item.name, caption: item.productName || '', tooltip: [item.productName, item.name].filter(Boolean).join(' · '),
        detailAvailable: true, text: `${Number(value.toFixed(1))}${unit.value === '%' ? '%' : ''}`,
        color: value / max >= .8 ? '#ff4d57' : value / max >= .6 ? '#ffaa00' : '#1677ff' }
    })
  })
  let generation = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  const enabled = () => active.value && available.value && (preview.value || visibility.value === 'visible')

  async function refresh() {
    const current = ++generation
    clearTimeout(timer)
    if (!enabled()) return
    loading.value = !gateways.value.length
    error.value = false
    try {
      const result = preview.value ? { gateways: previewGateways(), unit: metric.value === 'queue' ? '条' : '%' } : await loadGatewayStatuses(metric.value)
      if (current !== generation || !enabled()) return
      unit.value = result.unit; gateways.value = result.gateways
    } catch {
      if (current === generation) { error.value = true; gateways.value = [] }
    } finally {
      if (current === generation) {
        loading.value = false
        if (enabled() && !preview.value && config.value.refreshSeconds) timer = setTimeout(refresh, config.value.refreshSeconds * 1000)
      }
    }
  }
  watch([preview, modules, active, visibility, metric, () => config.value.refreshSeconds,
    () => JSON.stringify([getProjectCodeFromLocation(), route.params.projectId, route.query.projectId])], () => {
    ++generation; clearTimeout(timer)
    gateways.value = []; unit.value = ''; loading.value = false
    if (enabled()) void refresh()
  }, { immediate: true, flush: 'sync' })
  onActivated(() => { active.value = true })
  onDeactivated(() => { active.value = false; ++generation; clearTimeout(timer) })
  onScopeDispose(() => { ++generation; clearTimeout(timer) })

  function openList() {
    if (canOpenList.value) menu.jumpPage('iot-user-device-list', { query: { type: 'gateway' } })
  }
  function openGateway(row: GatewayRankRow) {
    if (!canOpenGateway.value || !rows.value.some(item => item.id === row.id)) return
    menu.jumpPage('iot-user-device-list/GatewayDetail', { params: { gatewayId: row.id }, query: { type: 'gateway' } })
  }
  return { title, metric, tabs, rows, loading, error, refresh, available, emptyDescription, canOpenList, canOpenGateway, openList, openGateway }
}

function previewGateways(): GatewayStatus[] {
  const names = ['徐家汇店', '南京西路店', '静安寺店', '中山公园', '虹桥天地店', '陆家嘴', '人民广场', '五角场', '天山路', '漕河泾']
  return [96, 82, 70, 65, 54, 47, 38, 26, 15, 8].map((value, index) => ({
    id: `preview-${index}`, name: `${names[index]}网关`, online: true,
    metrics: Object.fromEntries(gatewayMetrics.map((key, i) => [key, { property: key, value: Math.max(0, value - i * 7), unit: key === 'queue' ? '条' : '%' }])),
  }))
}
