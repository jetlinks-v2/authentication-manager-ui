import { defineAsyncComponent } from "vue"
import { config } from "./config"
const ProjectHomeVisualization = {
  name: config.type,
  component: defineAsyncComponent(() => import("./ProjectHomeVisualization.vue")),
}
const ProjectHomeVisualizationConfig = []
const ProjectHomeVisualizationConfigProps = config
export { ProjectHomeVisualization, ProjectHomeVisualizationConfig, ProjectHomeVisualizationConfigProps }
