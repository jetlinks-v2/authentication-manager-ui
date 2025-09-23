import * as systemHooks from '@authentication-manager-ui/hooks'


export default {
  components: {
    Calendar: defineAsyncComponent(() => import("./views/system/Calendar/FullCalendar/index.vue")),
  },
  hooks: {
    ...systemHooks
  }
}
