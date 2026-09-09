import { h, type AppContext } from 'vue'
import { Modal } from 'ant-design-vue'
import i18n from '@jetlinks-web-core/locales'
// 程序式弹窗必须同步拿到内容组件，异步组件会让静态 Modal 只渲染空壳。
import NotificationDetail from './components/NotificationDetail.vue'

interface RealtimeAnnouncementContext {
  payload: Record<string, any>
  markRead: () => Promise<void>
  appContext?: AppContext
}

/** 系统公告实时到达时直接展示完整公告弹窗，普通通知仍由通用壳轻提示。 */
export const openRealtimeAnnouncement = ({
  payload,
  markRead,
  appContext,
}: RealtimeAnnouncementContext) => {
  Modal.info({
    class: 'announcement-notification-modal',
    title: String(payload.topicName || payload.title || payload.message || '').trim()
      || i18n.global.t('Announcement.inbox.detailTitle'),
    content: h(NotificationDetail, { data: payload }),
    width: 820,
    icon: null,
    okText: i18n.global.t('Announcement.action.confirm'),
    onOk: () => markRead(),
    appContext,
  })
  return true
}
