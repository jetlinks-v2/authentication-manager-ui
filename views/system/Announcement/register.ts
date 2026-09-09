import { defineAsyncComponent } from 'vue'
import { SYSTEM_BULLETIN_PROVIDER } from './api'
import { loadSystemBulletinNoticeList } from './noticeListLoader'
import { openRealtimeAnnouncement } from './realtimeNotification'

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
    props: { listHandler: loadSystemBulletinNoticeList },
  },
  {
    targetPage: 'notification-realtime',
    targetModule: 'handlers',
    code: SYSTEM_BULLETIN_PROVIDER,
    props: { handler: openRealtimeAnnouncement },
  },
]
