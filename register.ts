import { getTreeData_api } from '@authentication-manager-ui/api/system/department'

export default {
  apis: {
    getTreeData_api
  },
  components: {
    Calendar: defineAsyncComponent(() => import("./views/system/Calendar/FullCalendar/index.vue")),
  }
}
