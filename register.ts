export default {
  components: {
    Calendar: defineAsyncComponent(() => import("./views/system/Calendar/FullCalendar/index.vue")),
    CalendarPage: defineAsyncComponent(() => import("./views/system/Calendar/index.vue")),
  }
}
