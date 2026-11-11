import { defineAsyncComponent } from 'vue'
import * as runtimeMonitor from './runtimeMonitor'
import { getTreeData_api } from '@authentication-manager-ui/api/system/department'
import {exportPermission_api} from "@authentication-manager-ui/api/system/permission";
import { ownershipDimensionFilters } from './views/application-center/ProjectApplication/ownershipSelectors'
import objectPresentations from './objectPresentations'
import { assetRelationMaintainer } from '@jetlinks-web-core/components/AssetRelationEditor'

export default {
  objectPresentations,
  assetDimensionFilters: ownershipDimensionFilters,
  objectRelationMaintainers: { 'asset:org': assetRelationMaintainer },
  apis: {
    runtimeMonitor,
    getTreeData_api,
    exportPermission_api
  },
  components: {
    // 概览与告警仪表盘共用同一处理流程，通过公开注册入口复用。
    QuickAlarmEntry: defineAsyncComponent(() => import('./visDashboard/Base/Operations/components/AlarmQuickEntry.vue')),
    ThirdPartyAccountBindingRows: defineAsyncComponent(() => import('./components/ThirdPartyAccountBindingRows/index.vue')),
    SystemBulletinNotificationDetail: defineAsyncComponent(() => import("./views/system/Announcement/components/NotificationDetail.vue")),
    Calendar: defineAsyncComponent(() => import("./views/system/Calendar/FullCalendar/index.vue")),
    CalendarPage: defineAsyncComponent(() => import("./views/system/Calendar/index.vue")),
  }
}
