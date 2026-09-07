import { defineAsyncComponent } from 'vue'
import i18n from '@jetlinks-web-core/locales'
import { SYSTEM_BULLETIN_PROVIDER } from './api'

const inboxRegistration = (targetPage: string) => ({
  targetPage,
  targetModule: 'segments',
  code: 'announcement',
  component: defineAsyncComponent(
    () => import('./components/AnnouncementInbox.vue'),
  ),
  extraOptions: {
    label: i18n.global.t('Announcement.inbox.title'),
    value: 'announcement:append',
    providers: [SYSTEM_BULLETIN_PROVIDER],
  },
})

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
  },
  inboxRegistration('account/center'),
  inboxRegistration('systemConfig/personCenter'),
]
