import dayjs from 'dayjs'
import { request } from '@jetlinks-web/core'
import { rangeOf, numberOf } from '../../../ResourceCenter/services/trends'
import { countOf, recordOf, rowsOf } from '../../shared/apiResult'
import { ALARM_TARGETS } from '../../shared/alarmQuery'
import type { HomeRow, HomeTarget } from '../../shared/types'
import { getSaasOverviewAccess, SAAS_TODAY_TARGETS, type SaasTodayId } from './access'

interface TimeWindow { from: number; to: number; time: string; format: string; limit: number }
interface TodayDefinition {
  id: SaasTodayId
  labelKey: string
  icon: string
  target: HomeTarget
  load: (window: TimeWindow) => Promise<number>
}

/** 今日数量按告警发生时间统计，显式区分物联和视联，不附加待处理条件。 */
async function loadAlarmCount(target: string, window: TimeWindow): Promise<number> {
  return countOf(await request.post(`/alarm/record/${target}/_count`, { terms: [
    { column: 'targetType', termType: 'eq', value: target },
    { column: 'alarmTime', termType: 'btw', value: [window.from, window.to] },
  ] }, { hiddenError: true }))
}

/** 识别事件沿用告警仪表盘的设备资产权限，并排除复判记录防止同一事件重复计数。 */
async function loadEventCount(window: TimeWindow): Promise<number> {
  return countOf(await request.post('/ai/task/history/_count', { terms: [
    { column: 'timestamp', termType: 'btw', value: [window.from, window.to] },
    { column: 'taskType', termType: 'not', value: 'reviewHandle' },
  ] }, { hiddenError: true, params: { assetType: 'device' } }))
}

/** 消息量与资源仪表盘使用同一聚合指标；只有合法的空集合代表该时段零条消息。 */
async function loadMessageCount(window: TimeWindow): Promise<number> {
  const rows = rowsOf(await request.post('/dashboard/_multi', [{
    dashboard: 'device', object: 'message', measurement: 'quantity', dimension: 'agg',
    group: 'saasOverviewMessage', params: window,
  }], { hiddenError: true }))
  return rows.reduce((sum, row) => {
    const value = recordOf(row.data).value
    if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !value.trim())) {
      throw new Error('Invalid message count')
    }
    return sum + numberOf(value)
  }, 0)
}

/** 同一刷新批次固定自然日边界；昨天为全天，今天截止本次刷新时间。 */
export async function loadSaasTodayRows(): Promise<HomeRow[]> {
  const now = dayjs()
  const today = rangeOf('today', now)
  const yesterday = rangeOf('yesterday', now)
  const access = getSaasOverviewAccess()
  const targets = SAAS_TODAY_TARGETS
  // 每项提供对应业务页入口；目标页沿用自己的筛选，不传入尚无消费契约的日期参数。
  const definitions: TodayDefinition[] = [
    { id: 'deviceAlarm', labelKey: 'saasIotAlarm', icon: 'deviceAlarm', target: targets.deviceAlarm,
      load: window => loadAlarmCount(ALARM_TARGETS.deviceAlarm, window) },
    { id: 'visionAlarm', labelKey: 'saasVideoAlarm', icon: 'visionAlarm', target: targets.visionAlarm,
      load: window => loadAlarmCount(ALARM_TARGETS.visionAlarm, window) },
    { id: 'message', labelKey: 'saasMessage', icon: 'devices', target: targets.message, load: loadMessageCount },
    { id: 'aiEvent', labelKey: 'saasAiEvent', icon: 'algorithm', target: targets.aiEvent,
      load: loadEventCount },
  ]
  return Promise.all(definitions.filter(item => access.todayIds.includes(item.id))
    .map(async ({ load, ...row }) => {
      const unitKey = row.id === 'message' ? 'saasUnitMessages' : 'saasUnitEvents'
      try {
        const [value, previous] = await Promise.all([load(today), load(yesterday)])
        return { ...row, unitKey, value, yesterday: previous, date: now.toISOString() }
      } catch { return { ...row, unitKey, failed: true } }
    }))
}
