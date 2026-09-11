import { defineAsyncComponent } from "vue"
import { config } from "./config"
const ProjectHomeAiCenter = {
  name: config.type,
  component: defineAsyncComponent(() => import("./ProjectHomeAiCenter.vue")),
}
const ProjectHomeAiCenterConfig = []
const ProjectHomeAiCenterConfigProps = config
export { ProjectHomeAiCenter, ProjectHomeAiCenterConfig, ProjectHomeAiCenterConfigProps }
