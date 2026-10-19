import dayjs from 'dayjs'
import type { ConditionFilterField } from '@jetlinks-web-core/components/ConditionFilter'

export interface CallbackColumn {
  key: string
  title: string
  dataIndex?: string
  timestamp?: boolean
}

export const callbackTime = ({ text }: { text: unknown }) => typeof text === 'number'
  ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '—'
export const callbackColumn = (key: string, title: string, time = false): CallbackColumn => ({
  key, title, dataIndex: key, timestamp: time,
})
export const callbackSearchField = (dataIndex: string, title: string): ConditionFilterField => ({
  dataIndex, title, search: { type: 'string', defaultTermType: 'like' },
})
export const callbackStateField = (dataIndex: string, title: string, values: string[], text: (value: string) => string): ConditionFilterField => ({
  dataIndex, title, search: { type: 'select', defaultTermType: 'eq', options: values.map(value => ({ value, label: text(value) })) },
})
export const callbackCellText = (column: CallbackColumn, text: unknown) => column.timestamp
  ? callbackTime({ text }) : text == null ? '—' : String(text)
export const callbackStateTone = (state: string): 'success' | 'error' | 'processing' | 'default' => {
  if (state === 'succeeded' || state === 'enabled') return 'success'
  if (state === 'dead' || state === 'locked') return 'error'
  if (state === 'pending' || state === 'delivering') return 'processing'
  return 'default'
}
