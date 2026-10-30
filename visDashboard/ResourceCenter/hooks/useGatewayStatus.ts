import { computed, onActivated, onDeactivated, onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDocumentVisibility } from '@vueuse/core'
import dayjs from 'dayjs'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { useDashboardModules } from '../../useDashboardModules'
import { getProjectCodeFromLocation } from '@jetlinks-web-core/utils/project-runtime'
import { settingsOf, type ResourceInfo } from '../shared'
import type { ResourceRankRow } from '../components/resourceRank'
import { gatewayMetrics, loadGatewayDirectory, loadGatewayNodeStatuses, loadGatewayStatuses, type GatewayStatus, type GatewayMetric } from '../services/gatewayStatus'

export interface GatewayRankRow extends GatewayStatus, ResourceRankRow {}
export interface GatewayTableRow extends GatewayStatus {
  stateText: string
  stateBadge: 'success' | 'error' | 'default'
  lastReportText: string
  values: Partial<Record<GatewayMetric, string>>
}
export interface GatewayTableColumn {
  title: string
  key: string
  width?: number
  customCell?: (row: GatewayTableRow) => { colSpan?: number }
}

/** 完整目录决定表格/排行模式，所有后续请求与count回调均归属同一代生命周期。 */
export function useGatewayStatus(info: Ref<ResourceInfo | undefined>, isEdit: Ref<boolean>, onCount?: (count: number) => void) {
  const { t } = useI18n()
  const route = useRoute(), menu = useMenuStore()
  const metric = ref<GatewayMetric>('queue')
  const gateways = shallowRef<GatewayStatus[]>([])
  const loading = ref(false), error = ref(false), unit = ref(''), partialError = ref(false)
  const nodeCount = ref<number | null>(null)
  const tableMode = computed(() => nodeCount.value !== null && nodeCount.value > 0 && nodeCount.value <= 3)
  const active = ref(true), visibility = useDocumentVisibility()
  const preview = computed(() => isEdit.value || Boolean(info.value?.componentProps?.preview))
  const modules = useDashboardModules(preview)
  const config = computed(() => settingsOf('VideoPlaybackTrend', info.value))
  const title = computed(() => config.value.title && !['视频播放趋势', 'Video playback trend'].includes(config.value.title)
    ? config.value.title : t(tableMode.value ? 'resourceDashboard.EdgeNodes' : 'resourceDashboard.gatewayStatus.title'))
  const visionEnabled = computed(() => modules.value.vision && info.value?.componentProps?.visionEnabled !== false)
  const availableMetrics = computed(() => gatewayMetrics.filter(value => value !== 'queue' || visionEnabled.value))
  const tabs = computed(() => availableMetrics.value.map(value => ({ value, label: t(`resourceDashboard.gatewayStatus.${value}`) })))
  const available = computed(() => modules.value.edge)
  const canOpenList = computed(() => available.value && !preview.value && !!menu.getMenu('iot-user-device-list'))
  const canOpenGateway = computed(() => available.value && !preview.value && !!menu.getMenu('iot-user-device-list/GatewayDetail'))
  const emptyDescription = computed(() => t(visionEnabled.value
    ? 'resourceDashboard.gatewayStatus.emptyDescription'
    : 'resourceDashboard.gatewayStatus.loadEmptyDescription'))
  /** 表格和排行优先展示服务端枚举文案；字符串状态使用同一国际化兜底。 */
  function stateTextOf(item: GatewayStatus) {
    return item.connectionStatusText || t(`resourceDashboard.${item.connectionStatus}`)
  }
  // 撤销视觉能力后先切换选项，不能继续请求复判队列。
  watch(availableMetrics, values => {
    if (!values.includes(metric.value)) metric.value = values[0]
  }, { immediate: true, flush: 'sync' })
  const rows = computed<GatewayRankRow[]>(() => {
    // 缺样本仍展示设备身份；离线、禁用节点均不参与当前值排名，也不使用窗口内的旧值。
    const valueOf = (item: GatewayStatus) => item.online ? item.metrics[metric.value]?.value : undefined
    const sorted = [...gateways.value].sort((a, b) => Number(b.online) - Number(a.online)
      || Number(valueOf(b) !== undefined) - Number(valueOf(a) !== undefined)
      || (valueOf(b) ?? 0) - (valueOf(a) ?? 0) || a.id.localeCompare(b.id)).slice(0, config.value.limit)
    const max = unit.value === '%' ? 100 : Math.max(1, ...sorted.map(item => valueOf(item) ?? 0))
    let rank = 0
    return sorted.map(item => {
      const value = valueOf(item)
      return { ...item, rank: value === undefined ? 0 : ++rank, width: value === undefined ? 0 : Math.min(100, value / max * 100),
        label: item.name, caption: item.productName || '', tooltip: [item.productName, item.name].filter(Boolean).join(' · '),
        detailAvailable: true, text: !item.online ? stateTextOf(item)
          : value === undefined ? t(item.failedMetrics?.includes(metric.value) ? 'resourceDashboard.gatewayStatus.metricFailed' : 'resourceDashboard.gatewayStatus.metricMissing')
            : `${Number(value.toFixed(1))}${unit.value === '%' ? '%' : ''}`,
        color: item.connectionStatus === 'offline' ? '#ff4d4f' : value === undefined || value === 0 ? '#bfbfbf' : '#1d2939' }
    })
  })
  const tableMetrics = computed<GatewayMetric[]>(() => ['cpu', 'memory', 'disk', ...(visionEnabled.value ? ['queue'] : [])] as GatewayMetric[])
  const tableRows = computed<GatewayTableRow[]>(() => [...gateways.value]
    .sort((a, b) => Number(b.online) - Number(a.online) || a.id.localeCompare(b.id))
    .map<GatewayTableRow>(item => ({ ...item, stateText: stateTextOf(item),
      stateBadge: item.connectionStatus === 'online' ? 'success' : item.connectionStatus === 'offline' ? 'error' : 'default',
      lastReportText: item.lastReportTime ? t('resourceDashboard.gatewayStatus.lastReport', { time: dayjs(item.lastReportTime).format('YYYY-MM-DD HH:mm') }) : '',
      values: Object.fromEntries(tableMetrics.value.map(key => {
        const metricValue = item.metrics[key]
        const value = metricValue ? `${Number(metricValue.value.toFixed(1))}${key === 'queue' ? '' : '%'}`
          : t(item.failedMetrics?.includes(key) ? 'resourceDashboard.gatewayStatus.metricFailed' : 'resourceDashboard.gatewayStatus.metricMissing')
        return [key, value]
      })),
    })))
  const tableColumns = computed<GatewayTableColumn[]>(() => [
    { title: t('resourceDashboard.gatewayStatus.state'), key: 'state', width: 64 },
    { title: t('resourceDashboard.gatewayStatus.nameModel'), key: 'name' },
    ...tableMetrics.value.map((key, index) => ({ title: t(`resourceDashboard.gatewayStatus.${key}`), key, width: key === 'queue' ? 82 : 72,
      customCell: (row: GatewayTableRow) => row.online ? {} : { colSpan: index === 0 ? tableMetrics.value.length : 0 } })),
  ])
  const nodeSummary = computed(() => t('resourceDashboard.gatewayStatus.nodeSummary', {
    count: nodeCount.value ?? 0, online: gateways.value.filter(item => item.online).length,
  }))
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
      const isCurrent = () => current === generation && enabled()
      let result
      if (preview.value) {
        const items = previewGateways()
        result = { gateways: items, unit: metric.value === 'queue' ? '条' : '%', partialError: false }
        nodeCount.value = items.length
        onCount?.(items.length)
      } else {
        const directory = await loadGatewayDirectory(isCurrent)
        if (!isCurrent()) return
        nodeCount.value = directory.length
        onCount?.(directory.length)
        result = directory.length <= 3
          ? await loadGatewayNodeStatuses(directory, tableMetrics.value, Date.now(), isCurrent)
          : await loadGatewayStatuses(metric.value, Date.now(), directory, isCurrent)
      }
      if (current !== generation || !enabled()) return
      unit.value = result.unit; gateways.value = result.gateways; partialError.value = Boolean(result.partialError)
    } catch {
      if (current === generation) { error.value = true; gateways.value = [] }
    } finally {
      if (current === generation) {
        loading.value = false
        if (enabled() && !preview.value && config.value.refreshSeconds) timer = setTimeout(refresh, config.value.refreshSeconds * 1000)
      }
    }
  }
  watch([preview, modules, visionEnabled, active, visibility, metric, () => config.value.refreshSeconds,
    () => JSON.stringify([getProjectCodeFromLocation(), route.params.projectId, route.query.projectId])], () => {
    ++generation; clearTimeout(timer)
    gateways.value = []; unit.value = ''; loading.value = false; partialError.value = false; nodeCount.value = null
    if (enabled()) void refresh()
  }, { immediate: true, flush: 'sync' })
  onActivated(() => { active.value = true })
  onDeactivated(() => { active.value = false; ++generation; clearTimeout(timer) })
  onScopeDispose(() => { ++generation; clearTimeout(timer) })

  function openList() {
    if (canOpenList.value) menu.jumpPage('iot-user-device-list', { query: { type: 'gateway' } })
  }
  /** 表格与排行共用真实目录身份校验，指标缺失不阻止查看节点详情。 */
  function openGateway(row: GatewayStatus) {
    if (!canOpenGateway.value || !gateways.value.some(item => item.id === row.id)) return
    menu.jumpPage('iot-user-device-list/GatewayDetail', { params: { gatewayId: row.id }, query: { type: 'gateway' } })
  }
  return { title, metric, tabs, rows, loading, error, partialError, refresh, available, emptyDescription,
    nodeCount, tableMode, tableRows, tableColumns, nodeSummary, canOpenList, canOpenGateway, openList, openGateway }
}

function previewGateways(): GatewayStatus[] {
  const names = ['徐家汇店', '南京西路店', '静安寺店', '中山公园', '虹桥天地店', '陆家嘴', '人民广场', '五角场', '天山路', '漕河泾']
  return [96, 82, 70, 65, 54, 47, 38, 26, 15, 8].map<GatewayStatus>((value, index) => ({
    id: `preview-${index}`, name: `${names[index]}网关`, connectionStatus: 'online', online: true,
    metrics: Object.fromEntries(gatewayMetrics.map((key, i) => [key, { property: key, value: Math.max(0, value - i * 7), unit: key === 'queue' ? '条' : '%' }])),
  }))
}
