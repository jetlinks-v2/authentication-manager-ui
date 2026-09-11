import { defineAsyncComponent } from "vue"
import { config } from "./config"
const ProjectHomeRuleEngine = {
  name: config.type,
  component: defineAsyncComponent(() => import("./ProjectHomeRuleEngine.vue")),
}
const ProjectHomeRuleEngineConfig = []
const ProjectHomeRuleEngineConfigProps = config
export { ProjectHomeRuleEngine, ProjectHomeRuleEngineConfig, ProjectHomeRuleEngineConfigProps }
