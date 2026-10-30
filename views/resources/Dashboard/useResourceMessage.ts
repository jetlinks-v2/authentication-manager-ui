import { computed, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { theme } from 'ant-design-vue'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { usePrivateQuery } from '../../../visDashboard/Base/Private/usePrivateQuery'
import { loadMessageTrend } from '../../../visDashboard/ResourceCenter/services/trends'
import type { TimeRange } from '../../../visDashboard/ResourceCenter/shared'
import { HOME_TARGETS } from '../../../visDashboard/Base/shared/navigation'

/** 消息图表沿用已有聚合服务；时间筛选、项目切换和离页均受查询生命周期保护。 */
export function useResourceMessage(scope: Ref<string>, initialRange: TimeRange = 'today') {
  const { t } = useI18n()
  const { token } = theme.useToken()
  const menu = useMenuStore()
  const range = ref<TimeRange>(initialRange)
  const query = usePrivateQuery(() => loadMessageTrend(range.value), computed(() => JSON.stringify([scope.value, range.value])), ref(true))
  const ranges = computed(() => ['today', 'yesterday', '3d', '7d', '30d'].map(value => ({ value, label: t(`resourceDashboard.range.${value}`) })))
  const total = computed(() => query.data?.reduce((sum, point) => sum + point.value, 0).toLocaleString() ?? '—')
  const hourly = computed(() => ['today', 'yesterday', '3d'].includes(range.value))
  const target = computed(() => HOME_TARGETS.devices.menus.find(code => menu.getMenu(code)))
  const option = computed(() => ({
    animationDuration: 250,
    tooltip: { trigger: 'axis', confine: true, valueFormatter: (value: number) => `${value.toLocaleString()} ${t('resourcePage.messagesUnit')}` },
    grid: { top: 20, right: 16, bottom: 12, left: 12, containLabel: true },
    xAxis: { type: 'category', data: (query.data ?? []).map(item => item.time), axisTick: { show: false },
      axisLine: { lineStyle: { color: token.value.colorBorderSecondary } },
      axisLabel: { color: token.value.colorTextSecondary, hideOverlap: true,
        formatter: (value: string) => hourly.value ? (range.value === '3d' && value.slice(11, 16) === '00:00' ? value.slice(5, 10) : value.slice(11, 16)) : value.slice(5, 10) } },
    yAxis: { type: 'value', minInterval: 1, axisLabel: { color: token.value.colorTextSecondary },
      splitLine: { lineStyle: { color: token.value.colorBorderSecondary, type: 'dashed' } } },
    series: [{ name: t('resourceDashboard.messages'), type: 'bar', barMaxWidth: 26,
      itemStyle: { color: token.value.colorPrimary, borderRadius: [3, 3, 0, 0] },
      data: (query.data ?? []).map(point => point.value) }],
  }))
  function openDevices() {
    if (target.value) menu.jumpPage(target.value, { query: { type: 'device' } })
  }
  return { query, range, ranges, total, hourly, option, target, openDevices }
}
