import { request } from '@jetlinks-web/core'
import dayjs from 'dayjs'
import { recordOf, rowsOf, textOf } from './apiResult'
import { HOME_TARGETS } from './navigation'
import type { HomeRow } from './types'
/** 新旧通知都优先显示公告自身标题，损坏的内嵌 JSON 不影响列表。 */
const announcementTitle = (row: Record<string, unknown>) => {
  let detail = recordOf(row.detail)
  if (!Object.keys(detail).length && typeof row.detailJson === 'string') {
    try { detail = recordOf(JSON.parse(row.detailJson)) } catch { /* 保留通知字段回显。 */ }
  }
  return textOf(detail.title) || textOf(row.topicName === '系统公告' ? row.message || row.topicName : row.topicName || row.message)
}
export const loadAnnouncements = async (): Promise<HomeRow[]> => {
  const result = await request.post('/notifications/_query', {
    paging: true, pageSize: 4, pageIndex: 0,
    sorts: [{ name: 'notifyTime', order: 'desc' }],
    terms: [{ column: 'topicProvider', termType: 'eq', value: 'SystemBulletin' }],
  }, { hiddenError: true })
  return rowsOf(result).map(row => ({
    id: textOf(row.id), label: announcementTitle(row),
    description: textOf(row.message), notification: row,
    date: row.notifyTime != null && dayjs(row.notifyTime as string | number).isValid() ? dayjs(row.notifyTime as string | number).format('MM-DD') : '',
    target: HOME_TARGETS.messages,
  }))
}
