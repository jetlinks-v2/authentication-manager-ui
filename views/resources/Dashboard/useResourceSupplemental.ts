import { computed, onActivated, onDeactivated, onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue'
import { theme } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { loadResourceSupplemental } from './services/resourceSupplemental'
import { emptySupplementalData, type ResourceSupplementalKind, type ResourceSupplementalRange, type ResourceSupplementalTone } from './resourceSupplemental.types'
import type { ResourceDeviceScope } from './services/resourceDeviceScope'
import { buildDistributionBars } from './services/resourceDistribution'
import { HOME_TARGETS } from '../../../visDashboard/Base/shared/navigation'
import { hasGrantedResourceMenu } from './services/resourcePageAccess'

const prefix = 'resourceDashboard.supplemental'

/** Own polling, scope invalidation and navigation so the panel only binds prepared presentation state. */
export function useResourceSupplemental(kind: Ref<ResourceSupplementalKind>, enabled: Readonly<Ref<boolean>>, scope: Readonly<Ref<string>>,
  deviceScope: Readonly<Ref<ResourceDeviceScope | undefined>> = ref()) {
  const { t } = useI18n()
  const { token } = theme.useToken()
  const menu = useMenuStore()
  const active = ref(true)
  const range = ref<ResourceSupplementalRange>('today')
  const data = shallowRef(emptySupplementalData())
  const loading = ref(false)
  const error = ref(false)
  let epoch = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let controller: AbortController | undefined
  const isTrend = computed(() => kind.value === 'online' || kind.value === 'traffic')
  const options = computed(() => (kind.value === 'traffic' ? ['today', '7d', 'month'] : ['today', '7d', '30d'])
    .map(value => ({ value, label: t(value === 'month' ? `${prefix}.month` : `resourceDashboard.range.${value}`) })))
  const title = computed(() => t(`${prefix}.${kind.value === 'offline' && deviceScope.value ? 'offlineDevices' : kind.value}`))
  const emptyTitle = computed(() => t(`${prefix}.empty.${kind.value === 'offline' && deviceScope.value ? 'offlineDevices' : kind.value}`))
  const target = computed(() => {
    if (kind.value === 'traffic') return { code: 'iot-card/CardManagement' }
    if (kind.value === 'pools') return { code: 'iot-card/TrafficPoolManagement' }
    if (kind.value === 'points' || kind.value === 'protocols') return { code: 'data-collect' }
    if (kind.value === 'offline') {
      // 视频账号可能只有视频列表授权；该页只支持设备视角，不伪造离线筛选参数。
      const candidates = [...HOME_TARGETS.devices.menus,
        ...(deviceScope.value?.listType === 'video' ? ['video/resources'] : [])]
      const code = menu.initialized && !menu.loading ? candidates.find(item =>
        hasGrantedResourceMenu(menu.menuResultCache, item) && !!menu.getMenu(item)) || '' : ''
      const deviceList = HOME_TARGETS.devices.menus.includes(code)
      // 普通设备只附加离线条件，边缘节点和视频保留各自已有分类。
      const listType = deviceScope.value?.listType
      const type = listType && listType !== 'device' ? listType : undefined
      return { code, query: deviceList ? { ...(type ? { type } : {}), status: 'offline' }
        : code === 'video/resources' ? { perspective: 'edge-node' } : undefined }
    }
    return { code: 'iot-user-device-list' }
  })
  const linkText = computed(() => t(kind.value === 'offline' && HOME_TARGETS.video.menus.includes(target.value.code)
    ? `${prefix}.videoLink` : `${prefix}.more`))
  const canOpen = computed(() => kind.value !== 'pools' && enabled.value && !!target.value.code && !!menu.getMenu(target.value.code))
  const empty = computed(() => isTrend.value ? !data.value.series.length
    : kind.value === 'pools' ? !data.value.pools.length
      : kind.value === 'offline' ? !data.value.devices.length
        : data.value.total === 0 || !data.value.rows.length)
  const number = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  const flowText = (value: number) => value >= 1024 ? `${number(value / 1024)} GB` : `${number(value)} MB`
  const colors = computed<Record<ResourceSupplementalTone, string>>(() => ({
    primary: token.value.colorPrimary, success: token.value.colorSuccess,
    error: token.value.colorError, default: token.value.colorTextQuaternary,
  }))
  const distributionRows = computed(() => buildDistributionBars(
    data.value.rows.map(row => ({ ...row, color: colors.value[row.tone || 'primary'] })), data.value.total,
    value => t(`${prefix}.itemCount`, { count: number(value) }), value => `${value.toFixed(1)}%`,
  ))
  const pools = computed(() => data.value.pools.map(pool => ({
    ...pool, name: pool.name || t(`${prefix}.unknownOperator`), usedText: flowText(pool.used), totalText: flowText(pool.total),
    cardText: t(`${prefix}.cards`, { count: number(pool.cards) }),
    percent: pool.total ? Math.min(100, pool.used / pool.total * 100) : 0,
    percentText: pool.total ? `${number(pool.used / pool.total * 100)}%` : '—',
    color: pool.total > 0 && pool.used / pool.total >= 0.8 ? token.value.colorWarning : token.value.colorPrimary,
  })))
  // 合计以各流量池的真实已用量和总量求和，再计算整体使用率。
  const poolSummary = computed(() => {
    const totals = data.value.pools.reduce((result, pool) => ({ used: result.used + pool.used, total: result.total + pool.total }), { used: 0, total: 0 })
    const divisor = totals.total >= 1024 ? 1024 : 1
    const unit = divisor === 1024 ? 'GB' : 'MB'
    return t(`${prefix}.poolTotal`, { used: number(totals.used / divisor), total: number(totals.total / divisor), unit,
      percent: totals.total ? `${number(totals.used / totals.total * 100)}%` : '—' })
  })
  const devices = computed(() => data.value.devices.map(device => ({
    ...device, offlineText: dayjs(device.offlineTime).format('MM-DD HH:mm'),
    fullTime: dayjs(device.offlineTime).format('YYYY-MM-DD HH:mm:ss'),
  })))
  const summary = computed(() => kind.value === 'traffic' ? t(`${prefix}.flowTotal`, { value: flowText(data.value.total) })
    : kind.value === 'points' ? t(`${prefix}.pointTotal`, { count: number(data.value.total) })
      : kind.value === 'protocols' ? t(`${prefix}.channelTotal`, { count: number(data.value.total) })
        : kind.value === 'offline' ? t(`${prefix}.offlineTotal`, { count: number(data.value.total) }) : '')
  const chartOption = computed(() => {
    const traffic = kind.value === 'traffic'
    const divisor = traffic && range.value !== 'today' ? 1024 : 1
    const unit = traffic ? (divisor === 1 ? 'MB' : 'GB') : '%'
    return {
      tooltip: { trigger: 'axis', appendToBody: true, valueFormatter: (value: number) => `${number(value)} ${unit}` },
      grid: { top: 28, left: 10, right: 18, bottom: 12, containLabel: true },
      xAxis: {
        type: 'category', boundaryGap: traffic, data: data.value.series.map(row => row.time),
        axisTick: { show: false }, axisLine: { lineStyle: { color: token.value.colorBorderSecondary } },
        // 流量时间轴最多显示约 8 个标签，完整数据仍保留在图表与提示中。
        axisLabel: { color: token.value.colorTextSecondary, hideOverlap: true,
          ...(traffic ? { interval: Math.max(0, Math.ceil(data.value.series.length / 8) - 1) } : {}),
          formatter: (value: string) => dayjs(value).isValid() ? dayjs(value).format(range.value === 'today' ? 'HH:mm' : 'MM-DD') : value },
      },
      // 流量图使用较少的刻度，GB 下允许小数，避免小流量被强制放大到整 GB。
      yAxis: { type: 'value', name: unit, min: 0,
        ...(traffic ? { splitNumber: 2, minInterval: divisor === 1 ? 1 : 0.01 } : { max: 100 }),
        axisLabel: { color: token.value.colorTextSecondary },
        splitLine: { lineStyle: { color: token.value.colorBorderSecondary, type: 'dashed' } } },
      series: [{ name: title.value, type: traffic ? 'bar' : 'line', barMaxWidth: 24,
        showSymbol: false, connectNulls: false,
        itemStyle: { color: token.value.colorPrimary },
        data: data.value.series.map(row => Number((row.value / divisor).toFixed(2))) }],
    }
  })

  /** Manual retries and automatic polling share one generation, preventing stale responses after navigation. */
  async function refresh() {
    const current = ++epoch
    clearTimeout(timer)
    controller?.abort()
    error.value = false
    if (!enabled.value || !active.value) { loading.value = false; data.value = emptySupplementalData(); return }
    controller = new AbortController()
    loading.value = true
    try {
      const result = await loadResourceSupplemental(kind.value, range.value, controller.signal, deviceScope.value)
      if (current === epoch) data.value = result
    } catch {
      if (current === epoch) { error.value = true; data.value = emptySupplementalData() }
    } finally {
      if (current === epoch) {
        loading.value = false
        // Offline ranking scans detailed rows, so its background refresh is intentionally less frequent.
        if (enabled.value && active.value) timer = setTimeout(refresh, kind.value === 'offline' ? 300_000 : 60_000)
      }
    }
  }

  /** Only verified destination menus are navigated; point and protocol views share the existing collector workspace. */
  function open() {
    if (!canOpen.value) return
    menu.jumpPage(target.value.code, { query: target.value.query })
  }

  watch([kind, enabled, scope, range, active, deviceScope], () => { data.value = emptySupplementalData(); void refresh() }, { immediate: true })
  onActivated(() => { active.value = true })
  onDeactivated(() => { active.value = false })
  onScopeDispose(() => { ++epoch; controller?.abort(); clearTimeout(timer) })
  return { title, emptyTitle, isTrend, range, options, data, loading, error, empty, summary,
    distributionRows, pools, poolSummary, devices, chartOption, canOpen, linkText, open, refresh }
}
