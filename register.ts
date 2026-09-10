import { defineAsyncComponent } from 'vue'
import { getTreeData_api } from '@authentication-manager-ui/api/system/department'
import {exportPermission_api} from "@authentication-manager-ui/api/system/permission";

export default {
  apis: {
    getTreeData_api,
    exportPermission_api
  },
  components: {
    SystemBulletinNotificationDetail: defineAsyncComponent(() => import("./views/system/Announcement/components/NotificationDetail.vue")),
    Calendar: defineAsyncComponent(() => import("./views/system/Calendar/FullCalendar/index.vue")),
    CalendarPage: defineAsyncComponent(() => import("./views/system/Calendar/index.vue")),
  }
}
