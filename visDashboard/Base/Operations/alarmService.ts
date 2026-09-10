import dayjs from 'dayjs'
import { request } from '@jetlinks-web/core'
import { countOf, recordOf, resultOf, rowsOf, textOf } from '../shared/apiResult'

export const ALARM_TARGETS = { deviceAlarm: 'device', visionAlarm: 'aiTaskMediaTarget' } as const
export type AlarmCategory = keyof typeof ALARM_TARGETS
export interface QuickAlarm {
  id: string
  title: string
  object: string
  imageUrl: string
  recognition: string
  location: string
  channel: string
  rule: string
  actual: string
  state: string
  stateText: string
  time: string
  shortTime: string
  alarmTime?: string | number
  alarmConfigId: string
}
export interface QuickAlarmPage { rows: QuickAlarm[]; total: number }
export const ALARM_PAGE_SIZE = 5

/** 沿用视觉告警记录的 latestHistory/fileResults 契约，抓拍不替换为演示图。 */
function snapshotUrl(...records: Record<string, unknown>[]): string {
  for (const record of records) {
    const direct = textOf(record.imageUrl || record.snapshotUrl || record.pictureUrl || record.fileUrl)
    if (direct) return direct
    const files = Array.isArray(record.fileResults) ? record.fileResults : []
    for (const value of files) {
      const file = recordOf(value)
      const url = textOf(file.url || file.fileUrl)
      if (url) return url
    }
  }
  return ''
}

/** 列表和详情使用同一记录模型，枚举文案来自后端，不编造设备实时状态。 */
function mapAlarm(row: Record<string, unknown>): QuickAlarm {
  const latest = recordOf(row.latestHistory)
  const channel = textOf(latest.mediaChannelName || row.mediaChannelName || latest.sourceName || row.sourceName)
  const space = textOf(latest.spaceName || row.spaceName)
  const state = recordOf(row.state)
  const time = row.alarmTime
  const alarmTime = typeof time === 'number' || typeof time === 'string' ? time : undefined
  const date = alarmTime !== undefined && alarmTime !== '' ? dayjs(alarmTime) : undefined
  return {
    id: textOf(row.id), title: textOf(row.alarmName || row.targetName),
    imageUrl: snapshotUrl(latest, row),
    recognition: textOf(row.actualDesc || latest.actualDesc || row.triggerDesc || row.description),
    channel, location: [space, channel].filter((value, index, values) => value && values.indexOf(value) === index).join(' · '),
    object: textOf(row.targetName || latest.sourceName || row.sourceName),
    rule: textOf(row.triggerDesc || row.alarmConfigName),
    actual: textOf(row.actualDesc || latest.actualDesc),
    state: textOf(state.value || row.state), stateText: textOf(state.text),
    time: date?.isValid() ? date.format('YYYY-MM-DD HH:mm:ss') : '—',
    shortTime: date?.isValid() ? date.format('MM-DD HH:mm') : '—',
    alarmTime, alarmConfigId: textOf(row.alarmConfigId),
  }
}

/** 分类与概览数量口径一致，只展示未处理记录；详情查询不限制状态。 */
export async function queryQuickAlarms(category: AlarmCategory, page = 1): Promise<QuickAlarmPage> {
  const response = await request.post(`/alarm/record/${ALARM_TARGETS[category]}/_query`, {
    paging: true, pageIndex: page - 1, pageSize: ALARM_PAGE_SIZE,
    sorts: [{ name: 'alarmTime', order: 'desc' }],
    terms: [{ column: 'state', termType: 'eq', value: 'warning' }],
  }, { hiddenError: true })
  return { rows: rowsOf(response).map(mapAlarm), total: countOf(response) }
}

/** 打开处理弹窗时重新读取记录，已处理或已删除的记录不会继续提交。 */
export async function queryQuickAlarm(category: AlarmCategory, id: string): Promise<QuickAlarm> {
  const response = await request.post(`/alarm/record/${ALARM_TARGETS[category]}/_query`, {
    paging: true, pageIndex: 0, pageSize: 1,
    terms: [{ column: 'id', termType: 'eq', value: id }],
  }, { hiddenError: true })
  const row = rowsOf(response).find(item => textOf(item.id) === id)
  if (!row) throw new Error('Alarm record unavailable')
  return mapAlarm(row)
}

/** 视觉告警走聚合告警处理，物联告警沿用通用记录处理；禁止把失败响应视为成功。 */
export async function handleQuickAlarm(category: AlarmCategory, alarm: QuickAlarm, describe: string): Promise<void> {
  if (!alarm.id || alarm.state !== 'warning' || !describe.trim() || describe.trim().length > 200) {
    throw new Error('Invalid alarm handling request')
  }
  const payload = category === 'visionAlarm'
    ? { alarmRecordId: alarm.id, describe: describe.trim(), type: 'user', handleTime: Date.now() }
    : { alarmRecordId: alarm.id, alarmConfigId: alarm.alarmConfigId, alarmTime: alarm.alarmTime,
      describe: describe.trim(), type: 'user', state: 'normal' }
  resultOf(await request.post(category === 'visionAlarm' ? '/ai/aggregate/task/alarm/_handle' : '/alarm/record/_handle', payload, { hiddenError: true }))
}
