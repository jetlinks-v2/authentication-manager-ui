import { defineAsyncComponent } from 'vue'
import { SYSTEM_BULLETIN_PROVIDER } from './api'

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
]
