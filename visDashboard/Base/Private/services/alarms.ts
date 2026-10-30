import { request } from '@jetlinks-web/core'
import dayjs from 'dayjs'
import { queryAlarmLevelOptions, normalizeAlarmLevelValue } from './alarmLevels'
import { queryQuickAlarms } from '../../Operations/alarmService'
import { ALARM_TARGETS, buildAlarmTerms, buildPendingAlarmTerms, type AlarmCategory } from '../../shared/alarmQuery'
import { countOf, rowsOf, recordOf } from '../../shared/apiResult'
import { getPrivateOverviewAccess, PRIVATE_TARGETS } from './access'
import { mapPrivateTrend, privateWindow } from './query'
import type { PrivateAlarmLevel, PrivateAlarms, PrivateAlarmSource, PrivateSource } from '../types'

/** 告警记录聚合沿用告警仪表盘的范围与桶结构，明确区分设备和视觉目标。 */
async function alarmTrend(category: AlarmCategory, now: number) {
  const window = privateWindow('7d', now)
  const response = await request.post(`/alarm/record/${ALARM_TARGETS[category]}/_aggregation`, {
    columns: [{ column: 'id', alias: 'count', aggregation: 'COUNT' }],
    groupByTime: { column: 'alarmTime', alias: 'time', interval: '1d', format: 'yyyy-MM-dd',
      from: dayjs(window.from).format('YYYY-MM-DD HH:mm:ss'), to: dayjs(window.to).format('YYYY-MM-DD HH:mm:ss') },
    filter: { terms: [
      ...buildAlarmTerms(category, []),
      { column: 'alarmTime', termType: 'btw', value: [window.from, window.to] },
    ] },
    limit: 1000,
  }, { hiddenError: true })
  return mapPrivateTrend(response, window)
}

/** 等级数量按真实动态字典展示，不能把部署自定义等级强行合并为原型的两档。 */
async function alarmLevels(category: AlarmCategory, options: Awaited<ReturnType<typeof queryAlarmLevelOptions>>): Promise<PrivateAlarmLevel[]> {
  const response = await request.post(`/alarm/record/${ALARM_TARGETS[category]}/_aggregation`, {
    columns: [{ column: 'id', alias: 'count', aggregation: 'COUNT' }],
    groupBy: [{ column: 'level', alias: 'level' }],
    filter: { terms: buildPendingAlarmTerms(category) }, limit: 1000,
  }, { hiddenError: true })
  const values = new Map<number, number>()
  for (const item of rowsOf(response)) {
    const row = Object.keys(recordOf(item.value)).length ? recordOf(item.value) : item
    const level = normalizeAlarmLevelValue(row.level)
    if (level === undefined) throw new Error('Missing alarm level')
    values.set(level, (values.get(level) ?? 0) + countOf(row.count))
  }
  return options.filter(option => option.label).map(option => ({
    id: String(option.value), label: option.label, value: values.get(option.value) ?? 0, tone: option.tone,
  }))
}

async function loadSource(id: PrivateSource, now: number, levels: Promise<Awaited<ReturnType<typeof queryAlarmLevelOptions>>>): Promise<PrivateAlarmSource> {
  const category: AlarmCategory = id === 'iot' ? 'deviceAlarm' : 'visionAlarm'
  const target = id === 'iot' ? PRIVATE_TARGETS.iotAlarm : PRIVATE_TARGETS.videoAlarm
  const window = privateWindow('today', now)
  const base = `/alarm/record/${ALARM_TARGETS[category]}`
  const result = await Promise.allSettled([
    request.post(`${base}/_count`, { terms: buildPendingAlarmTerms(category) }, { hiddenError: true }).then(countOf),
    request.post(`${base}/_count`, { terms: [...buildAlarmTerms(category, []), { column: 'alarmTime', termType: 'btw', value: [window.from, window.to] }] }, { hiddenError: true }).then(countOf),
    levels.then(options => alarmLevels(category, options)),
    alarmTrend(category, now),
    queryQuickAlarms(category),
    levels,
  ] as const)
  const [pending, today, severity, trend, latest, levelOptions] = result
  const options = levelOptions.status === 'fulfilled' ? levelOptions.value : []
  return {
    id, target,
    pending: pending.status === 'fulfilled' ? pending.value : undefined,
    today: today.status === 'fulfilled' ? today.value : undefined,
    yesterday: trend.status === 'fulfilled' ? trend.value.find(point => point.timestamp === dayjs(now).subtract(1, 'day').startOf('day').valueOf())?.value : undefined,
    failed: pending.status === 'rejected' || today.status === 'rejected',
    levels: severity.status === 'fulfilled' ? severity.value : [], levelsFailed: severity.status === 'rejected',
    trend: trend.status === 'fulfilled' ? trend.value : [], trendFailed: trend.status === 'rejected',
    latest: latest.status === 'fulfilled' ? latest.value.rows.map(row => {
      const level = options.find(option => option.value === normalizeAlarmLevelValue(row.level))
      return {
        id: row.id, title: row.title, object: row.location || row.object,
        time: row.shortTime, timestamp: row.alarmTime ? dayjs(row.alarmTime).valueOf() : undefined, source: id, target,
        level: level?.label || undefined, tone: level?.label ? level.tone : undefined,
      }
    }) : [], latestFailed: latest.status === 'rejected',
  }
}

/** 每个来源和查询面独立失败；完整来源均成功时才返回聚合总量，最近记录按真实时间取前三。 */
export async function loadPrivateAlarms(): Promise<PrivateAlarms> {
  const access = getPrivateOverviewAccess()
  const now = Date.now()
  const sourceIds = (['iot', 'video'] as const).filter(id => access[id === 'iot' ? 'iotAlarm' : 'videoAlarm'])
  if (!sourceIds.length) return { sources: [], levels: [], latest: [], updatedAt: now }
  // 传入独立 signal，避免复用跨账号的字典缓存。
  const levelOptions = queryAlarmLevelOptions(new AbortController().signal)
  const sources = await Promise.all(sourceIds.map(id => loadSource(id, now, levelOptions)))
  const levels = new Map<string, PrivateAlarmLevel>()
  if (sources.every(source => !source.levelsFailed)) {
    for (const level of sources.flatMap(source => source.levels)) {
      levels.set(level.id, { ...level, value: (levels.get(level.id)?.value ?? 0) + level.value })
    }
  }
  return {
    sources,
    pending: sources.every(source => source.pending !== undefined) ? sources.reduce((sum, source) => sum + source.pending!, 0) : undefined,
    today: sources.every(source => source.today !== undefined) ? sources.reduce((sum, source) => sum + source.today!, 0) : undefined,
    levels: [...levels.values()],
    latest: sources.flatMap(source => source.latest).sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)).slice(0, 3),
    updatedAt: now,
  }
}
