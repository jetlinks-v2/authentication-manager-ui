import { defineAsyncComponent } from 'vue'
import { SYSTEM_BULLETIN_PROVIDER } from './api'
import { loadSystemBulletinNoticeList, resolveSystemBulletinNoticeTexts } from './noticeListLoader'
import { handleSystemBulletinNotice } from './realtimeNotification'
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
    props: { listHandler: loadSystemBulletinNoticeList },
  },
  {
    targetPage: 'notification-realtime',
    targetModule: 'handlers',
    code: SYSTEM_BULLETIN_PROVIDER,
    props: { handler: handleSystemBulletinNotice },
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
