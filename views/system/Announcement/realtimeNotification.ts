import { h, type AppContext } from 'vue'
import { Modal } from 'ant-design-vue'
import i18n from '@jetlinks-web-core/locales'
import type { NoticeRealtimeHandlerContext } from '@jetlinks-web-core/layout/components/noticeRealtimeHandler'
// 程序式弹窗必须同步拿到内容组件，异步组件会让静态 Modal 只渲染空壳。
import NotificationDetail from './components/NotificationDetail.vue'
import { parseSystemBulletinDetail } from './api'
import { resolveAnnouncementText } from './announcementI18n'
import { getAnnouncementReadIds, getAnnouncementReadScope } from './localReadStore'

interface RealtimeAnnouncementContext {
  payload: Record<string, any>
  markRead: () => Promise<void>
  appContext?: AppContext
  realtime?: boolean
}

const shown = new Set<string>()
const dialogs = new Set<() => void>()

/** 身份或项目切换后销毁旧实时弹窗，同时使其确认回调失效。 */
export const disposeAnnouncementRealtimeDialogs = () => {
  dialogs.forEach(dispose => dispose())
  dialogs.clear()
  shown.clear()
}

const text = (value: unknown) => String(value ?? '').trim()

/** 标题仅用于弹窗头部，正文组件独立渲染公告内容。 */
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
  realtime = false,
}: RealtimeAnnouncementContext) => {
  const scope = getAnnouncementReadScope()
  let active = true
  const dispose = () => {
    active = false
    modal.destroy()
  }
  const modal = Modal.info({
    class: 'announcement-notification-modal',
    title: resolveNoticeTitle(payload) || i18n.global.t('Announcement.inbox.detailTitle'),
    content: h(NotificationDetail, { data: payload }),
    width: 820,
    centered: true,
    closable: true,
    icon: null,
    okText: i18n.global.t('Announcement.action.confirm'),
    onOk: () => active && scope === getAnnouncementReadScope() ? markRead() : undefined,
    afterClose: () => {
      active = false
      dialogs.delete(dispose)
    },
    appContext,
  })
  if (realtime) dialogs.add(dispose)
  return true
}

/** 收到公告即打开详情并接管通知，避免继续显示通用站内信轻提示。 */
export const handleSystemBulletinNotice = (context: NoticeRealtimeHandlerContext) => {
  const realtime = context.source === 'realtime'
  if (realtime) {
    const scope = getAnnouncementReadScope()
    const id = text(context.payload.id)
    const key = `${scope}:${id}`
    if (!scope || !id || getAnnouncementReadIds(scope).includes(id) || shown.has(key)) return true
    shown.add(key)
  }
  return openAnnouncementDetail({ ...context, realtime })
}
