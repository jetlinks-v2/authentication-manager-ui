import { defineAsyncComponent } from 'vue'
import { subscribeAnnouncementReadChanges } from './localReadStore'
import { subscribeAnnouncementRealtime } from './realtimeSubscription'
import i18n from '@jetlinks-web-core/locales'
import {
  SYSTEM_BULLETIN_PROVIDER,
  queryAnnouncementInbox,
  queryAnnouncementInboxNoPaging,
  countAnnouncementInbox,
  countAnnouncementUnread,
  changeAnnouncementReadState,
  markAllAnnouncementsRead,
} from './api'
import { loadSystemBulletinNoticeList, resolveSystemBulletinNoticeTexts } from './noticeListLoader'
import { handleSystemBulletinNotice } from './realtimeNotification'
import { handleSystemBulletinLogin } from './loginPopup'
import type { NoticeTextResolverContext } from '@jetlinks-web-core/layout/components/noticeTextResolver'

export const getRegisterComponents = () => [
  {
    targetPage: 'notification-detail',
    code: SYSTEM_BULLETIN_PROVIDER,
    component: defineAsyncComponent(
      () => import('./components/NotificationDetail.vue'),
    ),
  },
  {
    targetPage: 'notification-provider',
    code: SYSTEM_BULLETIN_PROVIDER,
    props: {
      listHandler: loadSystemBulletinNoticeList,
      messageCategory: 'announcement',
      metadata: () => ({
        provider: SYSTEM_BULLETIN_PROVIDER,
        name: i18n.global.t('Announcement.inbox.title'),
        type: {
          id: SYSTEM_BULLETIN_PROVIDER,
          name: i18n.global.t('Announcement.inbox.title'),
        },
      }),
      dataSource: {
        subscribe: subscribeAnnouncementReadChanges,
        subscribeRealtime: subscribeAnnouncementRealtime,
        confirmOnDetail: true,
        query: queryAnnouncementInbox,
        queryNoPaging: queryAnnouncementInboxNoPaging,
        count: countAnnouncementInbox,
        unreadCount: countAnnouncementUnread,
        changeState: changeAnnouncementReadState,
        readAll: markAllAnnouncementsRead,
      },
    },
  },
  {
    targetPage: 'notification-realtime',
    targetModule: 'handlers',
    code: SYSTEM_BULLETIN_PROVIDER,
    props: { handler: handleSystemBulletinNotice },
  },
  {
    targetPage: 'notification-login',
    targetModule: 'handlers',
    code: SYSTEM_BULLETIN_PROVIDER,
    props: { handler: handleSystemBulletinLogin },
  },
  {
    targetPage: 'notification-text',
    targetModule: 'handlers',
    code: SYSTEM_BULLETIN_PROVIDER,
    // 注册表以 { records } 上下文调用，这里适配为公告解析器需要的数组入参。
    props: {
      resolver: (context: NoticeTextResolverContext) => resolveSystemBulletinNoticeTexts(context.records),
    },
  },
]
