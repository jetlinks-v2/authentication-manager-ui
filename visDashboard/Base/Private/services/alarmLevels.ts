import { moduleRegistry } from '@jetlinks-web-core/utils/module-registry'

interface AlarmLevelOption { value: number; label: string; tone: 'high' | 'med' | 'low' }
interface AlarmLevelApi {
  queryAlarmLevelOptions?: (signal?: AbortSignal) => Promise<AlarmLevelOption[]>
  normalizeAlarmLevelValue?: (value: unknown) => number | undefined
}
const api = () => moduleRegistry.getResource('rule-engine-manager-ui', 'utils') as AlarmLevelApi | undefined

/** 可选规则模块通过公开能力提供动态字典，未安装或失败不使用猜测的等级。 */
export async function queryAlarmLevelOptions(signal: AbortSignal): Promise<AlarmLevelOption[]> {
  const query = api()?.queryAlarmLevelOptions
  if (!query) throw new Error('Alarm level service unavailable')
  return query(signal)
}

/** 与正式告警页共用枚举归一化规则，概览只消费对应等级的文案。 */
export function normalizeAlarmLevelValue(value: unknown): number | undefined {
  return api()?.normalizeAlarmLevelValue?.(value)
}
