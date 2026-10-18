import dayjs from 'dayjs'
import type { RuntimeLogEntry } from '@authentication-manager-ui/api/runtimeLog'

export interface RuntimeLiveLogEntry {
  id: number
  text: string
}

/** 完整保留一条 Java 日志事件的多行消息和异常栈。 */
export const formatRuntimeLogEvent = (entry: RuntimeLogEntry): Omit<RuntimeLiveLogEntry, 'id'> => {
  const header = [
    entry.timestamp == null ? '' : dayjs(entry.timestamp).format('YYYY-MM-DD HH:mm:ss.SSS'),
    entry.level || '',
  ].filter(Boolean).join(' ')
  return {
    text: [header, entry.message ?? '', entry.exceptionStack || ''].filter(Boolean).join('\n'),
  }
}
