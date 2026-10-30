import { computed, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { theme } from 'ant-design-vue'
import dayjs from 'dayjs'
import type { EChartsOption } from 'echarts'
import type { PrivateAlarms, PrivateTrend } from './types'

/** 按服务返回的自然日时间轴对齐曲线；未来小时留空，未知请求不画零线。 */
export function usePrivateCharts(trend: Ref<PrivateTrend | undefined>, alarms: Ref<PrivateAlarms | undefined>) {
  const { t } = useI18n()
  const { token } = theme.useToken()
  const base = (): EChartsOption => ({
    animation: false,
    tooltip: { trigger: 'axis', confine: true },
    grid: { top: 12, right: 12, bottom: 24, left: 42 },
    yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: token.value.colorBorderSecondary } },
      axisLabel: { color: token.value.colorTextSecondary, fontSize: 11 } },
  })
  const trendOption = computed<EChartsOption>(() => {
    const data = trend.value
    if (!data) return {}
    const daily = data.range === 'today'
    const now = dayjs(data.updatedAt)
    const labels = daily ? Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`)
      : Array.from({ length: 7 }, (_, i) => now.subtract(6 - i, 'day').format('MM-DD'))
    return {
      ...base(),
      xAxis: { type: 'category', data: labels, boundaryGap: !daily, axisTick: { show: false },
        axisLine: { lineStyle: { color: token.value.colorBorderSecondary } },
        axisLabel: { color: token.value.colorTextSecondary, fontSize: 11, interval: daily ? 2 : 0 } },
      series: data.series.filter(series => !series.failed).map(series => {
        const values = new Map(series.points.map(point => [dayjs(point.timestamp).format(daily ? 'HH:00' : 'MM-DD'), point.value]))
        return {
          name: t(series.labelKey), type: daily ? 'line' : 'bar',
          data: labels.map((label, hour) => daily && series.id === 'today' && hour >= now.hour() ? null : values.get(label) ?? 0),
          showSymbol: false, connectNulls: false, barMaxWidth: 36,
          lineStyle: { width: 2 }, itemStyle: { color: series.id === 'yesterday' ? token.value.colorTextQuaternary : token.value.colorPrimary },
          areaStyle: daily && series.id === 'today' ? { opacity: .07 } : undefined,
        }
      }),
    }
  })
  const alarmOption = computed<EChartsOption>(() => {
    const data = alarms.value
    if (!data) return {}
    const now = dayjs(data.updatedAt)
    const labels = Array.from({ length: 7 }, (_, i) => now.subtract(6 - i, 'day').format('MM-DD'))
    return {
      ...base(), grid: { top: 8, right: 4, bottom: 22, left: 4 },
      yAxis: { type: 'value', show: false },
      xAxis: { type: 'category', data: labels, axisTick: { show: false }, axisLabel: { fontSize: 10, color: token.value.colorTextSecondary } },
      series: data.sources.filter(source => !source.trendFailed).map(source => {
        const values = new Map(source.trend.map(point => [dayjs(point.timestamp).format('MM-DD'), point.value]))
        return { type: 'bar', stack: 'alarms', name: t(`privateOverview.${source.id}`), barMaxWidth: 18,
          data: labels.map(label => values.get(label) ?? 0), itemStyle: { color: source.id === 'video' ? '#91caff' : token.value.colorPrimary } }
      }),
    }
  })
  return { trendOption, alarmOption }
}
