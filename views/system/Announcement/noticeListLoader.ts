import {
  getList_api,
  getUnreadNoPagingList_api,
} from '@jetlinks-web-core/api/account/notificationRecord'
import type { NoticeListHandler } from '@jetlinks-web-core/layout/components/noticeListHandler'
import { SYSTEM_BULLETIN_PROVIDER } from './api'

const READ_NOTICE_LIMIT = 5

const providerTerm = {
  column: 'topicProvider',
  termType: 'eq',
  value: SYSTEM_BULLETIN_PROVIDER,
}

const notifyTimeDesc = [{ name: 'notifyTime', order: 'desc' }]

const responseData = (response: any): Record<string, any>[] => {
  if (Array.isArray(response?.result)) return response.result
  return Array.isArray(response?.result?.data) ? response.result.data : []
}

const stateValue = (record: Record<string, any>) => {
  return typeof record.state === 'object' ? record.state?.value : record.state
}

const byNotifyTimeDesc = (left: Record<string, any>, right: Record<string, any>) => {
  return Number(right.notifyTime || 0) - Number(left.notifyTime || 0)
}

const mergeNoticeGroups = (
  unread: Record<string, any>[],
  read: Record<string, any>[],
) => {
  const seen = new Set<string>()
  return [...unread, ...read].filter((record) => {
    const id = String(record.id || '')
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

/** 铃铛中的系统公告：全部未读置顶，并追加最近五条已读。 */
export const loadSystemBulletinNoticeList: NoticeListHandler = async ({
  topicProviders,
}) => {
  if (topicProviders.length !== 1 || topicProviders[0] !== SYSTEM_BULLETIN_PROVIDER) {
    return undefined
  }

  const [unreadResponse, readResponse] = await Promise.all([
    getUnreadNoPagingList_api({
      paging: false,
      sorts: notifyTimeDesc,
      terms: [providerTerm],
    }),
    getList_api({
      pageIndex: 0,
      pageSize: READ_NOTICE_LIMIT,
      sorts: notifyTimeDesc,
      terms: [
        providerTerm,
        { column: 'state', termType: 'eq', value: 'read' },
      ],
    }),
  ])

  const unread = responseData(unreadResponse)
    .filter(record => stateValue(record) === 'unread')
    .sort(byNotifyTimeDesc)
  const read = responseData(readResponse)
    .filter(record => stateValue(record) === 'read')
    .sort(byNotifyTimeDesc)
    .slice(0, READ_NOTICE_LIMIT)

  return mergeNoticeGroups(unread, read)
}
