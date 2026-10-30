import { computed, onActivated, onDeactivated, onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue'
import { theme } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { loadResourceSupplemental } from './services/resourceSupplemental'
import { emptySupplementalData, type ResourceSupplementalKind, type ResourceSupplementalRange, type ResourceSupplementalTone } from './resourceSupplemental.types'

const prefix = 'resourceDashboard.supplemental'

/** Own polling, scope invalidation and navigation so the panel only binds prepared presentation state. */
export function useResourceSupplemental(kind: Ref<ResourceSupplementalKind>, enabled: Readonly<Ref<boolean>>, scope: Readonly<Ref<string>>) {
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
  const title = computed(() => t(`${prefix}.${kind.value}`))
  const target = computed(() => {
    if (kind.value === 'traffic') return { code: 'iot-card/CardManagement' }
    if (kind.value === 'pools') return { code: 'iot-card/TrafficPoolManagement' }
    if (kind.value === 'points' || kind.value === 'protocols') return { code: 'data-collect' }
    return { code: 'iot-user-device-list', query: kind.value === 'offline' ? { type: 'device', status: 'offline' } : { type: 'all' } }
  })
  const canOpen = computed(() => enabled.value && !!menu.getMenu(target.value.code))
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
  const distributionRows = computed(() => data.value.rows.map(row => ({
    ...row, color: colors.value[row.tone || 'primary'],
    percent: data.value.total ? Math.min(100, row.value / data.value.total * 100) : 0,
    valueText: number(row.value),
  })))
  const pools = computed(() => data.value.pools.map(pool => ({
    ...pool, usedText: flowText(pool.used), totalText: flowText(pool.total),
    cardText: t(`${prefix}.cards`, { count: number(pool.cards) }),
    percent: pool.total ? Math.min(100, pool.used / pool.total * 100) : 0,
    percentText: pool.total ? `${number(pool.used / pool.total * 100)}%` : '—',
    color: pool.total > 0 && pool.used / pool.total >= 0.8 ? token.value.colorWarning : token.value.colorPrimary,
  })))
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
        axisLabel: { color: token.value.colorTextSecondary, hideOverlap: true,
          formatter: (value: string) => dayjs(value).isValid() ? dayjs(value).format(range.value === 'today' ? 'HH:mm' : 'MM-DD') : value },
      },
      yAxis: { type: 'value', name: unit, min: 0, ...(traffic ? {} : { max: 100 }),
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
      const result = await loadResourceSupplemental(kind.value, range.value, controller.signal)
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

  watch([kind, enabled, scope, range, active], () => { data.value = emptySupplementalData(); void refresh() }, { immediate: true })
  onActivated(() => { active.value = true })
  onDeactivated(() => { active.value = false })
  onScopeDispose(() => { ++epoch; controller?.abort(); clearTimeout(timer) })
  return { title, isTrend, range, options, data, loading, error, empty, summary,
    distributionRows, pools, devices, chartOption, canOpen, open, refresh }
}
