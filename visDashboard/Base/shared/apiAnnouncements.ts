import { BADGE_OVERFLOW_COUNT, toBadgeCount } from '@jetlinks-web-core/layout/components/noticeUtils'
import dayjs from 'dayjs'
import { recordOf, resultOf, rowsOf, textOf } from './apiResult'
import { HOME_TARGETS } from './navigation'
import type { HomeRow } from './types'
import { resolveAnnouncementText, resolveAnnouncementTypeLabel } from '../../../views/system/Announcement/announcementI18n'
import { normalizeBulletinType, parseSystemBulletinDetail, SYSTEM_BULLETIN_PROVIDER } from '../../../views/system/Announcement/api'
import { resolveBulletinTypeColor } from '../../../views/system/Announcement/bulletinTypeIcon'
import { countAnnouncementUnread, queryAnnouncementInbox } from '../../../views/system/Announcement/receivedDataSource'

/** 通知状态兼容对象与字符串枚举；缺失状态不推断成已读或未读。 */
const readStateOf = (row: Record<string, unknown>): HomeRow['readState'] => {
  const value = typeof row.state === 'object' ? recordOf(row.state).value : row.state
  return value === 'read' || value === 'unread' ? value : undefined
}

/** 固定类型使用本地语言包，自定义字符串保留后端名称，不能丢掉标签。 */
const announcementTypeOf = (type: unknown): HomeRow['announcementType'] => {
  const source = recordOf(type)
  const value = normalizeBulletinType(source.value || type)
  const text = textOf(source.text).trim() || resolveAnnouncementTypeLabel(value, value)
  return value && text ? { value, text, color: resolveBulletinTypeColor(value) } : undefined
}

/** 首页仅查询当前可见公告批次，阅读状态由公告接收数据源按本机确认记录补齐。 */
export const loadAnnouncements = async (): Promise<HomeRow[]> => {
  const result = await queryAnnouncementInbox({
    paging: true, pageSize: 5, pageIndex: 0,
    sorts: [{ name: 'deployTime', order: 'desc' }],
  })
  return rowsOf(result).map(row => {
    const detail = parseSystemBulletinDetail(row)
    const texts = {
      title: detail?.title || row.topicName,
      summary: detail?.summary || row.message,
      i18nMessages: detail?.i18nMessages || row.i18nMessages
        || recordOf(detail?.others).i18n || recordOf(row.others).i18n,
    }
    const readState = readStateOf(row)
    const timeVal = Number(row.notifyTime) || (row.notifyTime as string)
    return {
      id: textOf(row.id),
      label: resolveAnnouncementText(texts, 'title') || textOf(row.message),
      description: resolveAnnouncementText(texts, 'summary'),
      notification: { ...row, topicProvider: SYSTEM_BULLETIN_PROVIDER,
        detail: { ...detail, ...texts, type: row.type ?? detail?.type } },
      readState,
      isNew: readState === 'unread',
      announcementType: announcementTypeOf(row.type ?? detail?.type),
      date: timeVal != null && dayjs(timeVal).isValid() ? dayjs(timeVal).format('YYYY.MM.DD') : '',
      target: HOME_TARGETS.messages,
    }
  })
}

/** 未读角标统计全部公告，不用首页截取的几条记录推算；沿用铃铛的 99+ 口径。 */
export const loadAnnouncementUnread = async (): Promise<HomeRow[]> => {
  const response = await countAnnouncementUnread({ pageSize: BADGE_OVERFLOW_COUNT })
  const result = recordOf(resultOf(response))
  if (typeof result.count !== 'number' || !Number.isInteger(result.count) || result.count < 0) {
    throw new Error('Invalid announcement unread count')
  }
  return [{ id: 'announcementUnread', value: toBadgeCount({ count: result.count, overflow: result.overflow === true }) }]
}
