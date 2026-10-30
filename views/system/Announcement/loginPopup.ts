import { h, type AppContext } from 'vue'
import { Modal } from 'ant-design-vue'
import i18n from '@jetlinks-web-core/locales'
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
  appContext?: AppContext,
) => new Promise<void>((resolve) => {
  let closed = false
  const finish = () => {
    if (closed) return
    closed = true
    resolve()
  }
  Modal.info({
    class: 'announcement-notification-modal',
    content: h(NotificationDetail, { data: notification }),
    width: 900,
    icon: null,
    okText: i18n.global.t('Announcement.action.confirm'),
    keyboard: false,
    maskClosable: false,
    onOk: finish,
    afterClose: finish,
    appContext,
  })
})

/**
 * 登录后展示尚未确认的弹窗公告。
 *
 * 已读状态作为当前用户的一次性回执；普通公告不改状态，仍保留在铃铛未读列表。
 */
export const handleSystemBulletinLogin: NoticeLoginHandler = async ({
  appContext,
  refresh,
}) => {
  const response = await queryAnnouncementInboxNoPaging({
    paging: false,
    sorts: [{ name: 'notifyTime', order: 'asc' }],
    terms: [{
      column: 'topicProvider',
      termType: 'eq',
      value: SYSTEM_BULLETIN_PROVIDER,
    }, {
      column: 'state',
      termType: 'eq',
      value: 'unread',
    }],
  })
  const records = responseData(response)
    .filter(record => String(record.id || '').trim())
    .sort((left, right) => Number(left.notifyTime || 0) - Number(right.notifyTime || 0))

  let changed = false
  for (const record of records) {
    const detail = parseSystemBulletinDetail(record)
    if (detail?.others?.popup !== true) continue

    await showLoginPopup(record, appContext)
    // 用户关闭弹窗后确认当前发布批次；重发后的新版本仍会再次展示。
    await changeAnnouncementReadState('_read', [record.id])
    changed = true
  }

  if (changed) await refresh()
}
