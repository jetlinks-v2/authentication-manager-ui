import { defineAsyncComponent } from "vue"
import { config } from "./config"
const ProjectHomeDeviceAccess = {
  name: config.type,
  component: defineAsyncComponent(() => import("./ProjectHomeDeviceAccess.vue")),
}
const ProjectHomeDeviceAccessConfig = []
const ProjectHomeDeviceAccessConfigProps = config
export { ProjectHomeDeviceAccess, ProjectHomeDeviceAccessConfig, ProjectHomeDeviceAccessConfigProps }
