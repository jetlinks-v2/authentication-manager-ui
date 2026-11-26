import { h, type AppContext } from 'vue'
import { Button, Modal } from 'ant-design-vue'
import i18n from '@jetlinks-web-core/locales'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { useUserStore } from '@jetlinks-web-core/store/user'
import type { NoticeLoginHandler } from '@jetlinks-web-core/layout/components/noticeLoginHandler'
import NotificationDetail from './components/NotificationDetail.vue'
import {
  changeAnnouncementReadState,
  parseSystemBulletinDetail,
  queryAnnouncementInboxNoPaging,
  SYSTEM_BULLETIN_PROVIDER,
} from './api'

const responseData = (response: any): Record<string, any>[] => {
  if (Array.isArray(response?.result)) return response.result
  return Array.isArray(response?.result?.data) ? response.result.data : []
}

const showLoginPopup = (
  notification: Record<string, any>,
  historyUnreadCount: number,
  appContext?: AppContext,
) => new Promise<boolean>((resolve) => {
  let closed = false
  const finish = (openInbox = false) => {
    if (closed) return
    closed = true
    resolve(openInbox)
  }
  const modal = Modal.info({
    class: 'announcement-notification-modal',
    content: h(NotificationDetail, { data: notification }),
    width: 900,
    icon: null,
    okText: i18n.global.t('Announcement.action.confirm'),
    footer: () => h('div', { class: 'ant-modal-confirm-btns announcement-login-footer' }, [
      historyUnreadCount > 0
        ? h(Button, { onClick: () => { finish(true); modal.destroy() } }, {
          default: () => i18n.global.t('Announcement.notification.historyUnread', { count: historyUnreadCount }),
        })
        : null,
      h(Button, { type: 'primary', onClick: () => { finish(); modal.destroy() } }, {
        default: () => i18n.global.t('Announcement.action.confirm'),
      }),
    ]),
    keyboard: false,
    maskClosable: false,
    onOk: () => finish(),
    afterClose: () => finish(),
    appContext,
  })
})

/**
 * 先选择最新的已发布弹窗批次，再判断已读；确认后不能回退到历史未读批次。
 *
 * 其他未读公告通过数量按钮进入消息中心，确认当前批次不会自动确认历史公告。
 */
export const handleSystemBulletinLogin: NoticeLoginHandler = async ({
  appContext,
  refresh,
}) => {
  const response = await queryAnnouncementInboxNoPaging({
    paging: false,
    sorts: [{ name: 'notifyTime', order: 'desc' }],
    terms: [{
      column: 'topicProvider',
      termType: 'eq',
      value: SYSTEM_BULLETIN_PROVIDER,
    }],
  })
  const records = responseData(response)
    .filter(record => String(record.id || '').trim())
    .sort((left, right) => Number(right.notifyTime || 0) - Number(left.notifyTime || 0))

  const record = records.find(record => {
    const detail = parseSystemBulletinDetail(record)
    return detail?.others?.popup === true
  })
  const stateOf = (row: Record<string, any>) => typeof row.state === 'object' ? row.state?.value : row.state
  if (!record || stateOf(record) !== 'unread') return

  // 数量包含普通未读公告；只确认展示批次，历史公告继续留在未读列表。
  const unreadCount = records.filter(row => stateOf(row) === 'unread').length
  const openInbox = await showLoginPopup(record, unreadCount - 1, appContext)
  await changeAnnouncementReadState('_read', [record.id])
  await refresh()
  if (openInbox) {
    // 沿用铃铛的消息中心入口；同步 Store 也覆盖已停留在个人中心的情况。
    const user = useUserStore()
    user.tabKey = 'StationMessage'
    user.other.tabKey = 'announcement'
    user.messageInfo = {}
    useMenuStore().routerPush('account/center', {
      params: { tabKey: 'StationMessage', other: { tabKey: 'announcement' } },
    })
  }
}
