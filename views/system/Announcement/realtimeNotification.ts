import { h, type AppContext } from 'vue'
import { Modal } from 'ant-design-vue'
import i18n from '@jetlinks-web-core/locales'
import type { NoticeRealtimeHandlerContext } from '@jetlinks-web-core/layout/components/noticeRealtimeHandler'
// 程序式弹窗必须同步拿到内容组件，异步组件会让静态 Modal 只渲染空壳。
import NotificationDetail from './components/NotificationDetail.vue'
import { parseSystemBulletinDetail } from './api'
import { resolveAnnouncementText } from './announcementI18n'
import { createBulletinTypeIconNode } from './bulletinTypeIcon'

interface RealtimeAnnouncementContext {
  payload: Record<string, any>
  markRead: () => Promise<void>
  appContext?: AppContext
}

const text = (value: unknown) => String(value ?? '').trim()

/** 标题缺省时回退摘要，保证轻提示和公告弹窗都有可读标题。 */
const resolveNoticeTitle = (payload: Record<string, any>) => {
  const detail = parseSystemBulletinDetail(payload)
  return text(resolveAnnouncementText(detail, 'title'))
    || text(payload.topicName)
    || text(payload.title)
    || text(payload.message)
}

/** 打开公告专属详情弹窗，点击“我知道了”代表确认已读并刷新未读数。 */
export const openAnnouncementDetail = ({
  payload,
  markRead,
  appContext,
}: RealtimeAnnouncementContext) => {
  Modal.info({
    class: 'announcement-notification-modal',
    title: resolveNoticeTitle(payload) || i18n.global.t('Announcement.inbox.detailTitle'),
    content: h(NotificationDetail, { data: payload }),
    width: 820,
    icon: null,
    okText: i18n.global.t('Announcement.action.confirm'),
    onOk: () => markRead(),
    appContext,
  })
  return true
}

/** 实时到达只显示一次轻提示，点击提示后再打开公告详情；铃铛列表点击仍直接打开详情。 */
export const handleSystemBulletinNotice = (context: NoticeRealtimeHandlerContext) => {
  const { payload, source, showTip } = context
  if (source !== 'realtime' || !showTip) {
    return openAnnouncementDetail(context)
  }
  const detail = parseSystemBulletinDetail(payload)
  const title = resolveNoticeTitle(payload)
  const summary = text(resolveAnnouncementText(detail, 'summary')) || text(payload.message)
  showTip({
    icon: createBulletinTypeIconNode(parseSystemBulletinDetail(payload)?.type),
    title,
    description: summary && summary !== title ? summary : undefined,
    onClick: () => openAnnouncementDetail(context),
  })
  return true
}
