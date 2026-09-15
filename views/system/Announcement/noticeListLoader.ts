import {
  getList_api,
  getUnreadNoPagingList_api,
} from '@jetlinks-web-core/api/account/notificationRecord'
import type { NoticeListHandler } from '@jetlinks-web-core/layout/components/noticeListHandler'
import {
  getSystemBulletinNotificationDetail,
  parseSystemBulletinDetail,
  resolveSystemBulletinReference,
  SYSTEM_BULLETIN_PROVIDER,
  type SystemBulletinNotificationDetail,
} from './api'
import {
  getAnnouncementI18n,
  resolveAnnouncementText,
  resolveLocalizedText,
} from './announcementI18n'
import { resolveBulletinTypeColor, resolveBulletinTypeIcon } from './bulletinTypeIcon'

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

  return resolveSystemBulletinNoticeTexts(mergeNoticeGroups(unread, read))
}

/** 个人中心和铃铛共用的通用通知文本补齐入口。 */
export const resolveSystemBulletinNoticeTexts = async (
  records: Record<string, any>[],
) => {
  const detailCache = new Map<string, Promise<SystemBulletinNotificationDetail | undefined>>()
  const loadDetail = (record: Record<string, any>) => {
    const reference = resolveSystemBulletinReference(record)
    if (!reference) return Promise.resolve(undefined)
    const key = `${reference.bulletinId}:${reference.publishVersion ?? 'legacy'}`
    if (!detailCache.has(key)) {
      detailCache.set(
        key,
        getSystemBulletinNotificationDetail(reference).catch(() => undefined),
      )
    }
    return detailCache.get(key)!
  }

  // 旧通知快照可能只有单语字段；缺失当前语言时按公告引用回查正文详情。
  return Promise.all(records.map(async record => {
    if (record.topicProvider !== SYSTEM_BULLETIN_PROVIDER) return record
    const snapshot = parseSystemBulletinDetail(record)
    const snapshotI18n = getAnnouncementI18n(snapshot?.i18nMessages)
    const hasCurrentText = (field: 'title' | 'summary') =>
      Boolean(resolveLocalizedText(snapshotI18n[field]))
    const shouldLoadDetail = !hasCurrentText('title') || !hasCurrentText('summary')
    const loadedDetail = shouldLoadDetail ? await loadDetail(record) : undefined
    const title = loadedDetail?.title
      || resolveAnnouncementText(snapshot, 'title')
      || String(record.topicName || '').trim()
    const summary = loadedDetail?.summary
      || resolveAnnouncementText(snapshot, 'summary')
      || String(record.message || '').trim()
    const type = loadedDetail?.type || snapshot?.type
    const localizedDetail = loadedDetail
      ? {
          ...(snapshot || {}),
          ...loadedDetail,
          i18nMessages: loadedDetail.i18nMessages || snapshot?.i18nMessages,
        }
      : snapshot

    return {
      ...record,
      ...(localizedDetail ? { detail: localizedDetail, detailJson: JSON.stringify(localizedDetail) } : {}),
      topicName: title,
      message: summary,
      noticeIcon: resolveBulletinTypeIcon(type),
      noticeIconColor: resolveBulletinTypeColor(type),
    }
  }))
}
