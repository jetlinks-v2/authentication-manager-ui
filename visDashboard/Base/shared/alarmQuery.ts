export const ALARM_TARGETS = { deviceAlarm: 'device', visionAlarm: 'aiTaskMediaTarget' } as const
export type AlarmCategory = keyof typeof ALARM_TARGETS

interface AlarmQueryTerm {
  column: string
  termType: 'eq'
  value: string
}

/** 显式限定类型，避免运行服务仅凭分类 URL 返回其他类型的记录。 */
export function buildAlarmTerms(category: AlarmCategory, terms: AlarmQueryTerm[]): AlarmQueryTerm[] {
  return [{ column: 'targetType', termType: 'eq', value: ALARM_TARGETS[category] }, ...terms]
}

/** 概览数量与快捷列表统一使用未处理口径。 */
export function buildPendingAlarmTerms(category: AlarmCategory): AlarmQueryTerm[] {
  return buildAlarmTerms(category, [{ column: 'state', termType: 'eq', value: 'warning' }])
}
