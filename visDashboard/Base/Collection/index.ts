import { defineAsyncComponent } from "vue"
import { config } from "./config"
const ProjectHomeCollection = {
  name: config.type,
  component: defineAsyncComponent(() => import("./ProjectHomeCollection.vue")),
}
const ProjectHomeCollectionConfig = []
const ProjectHomeCollectionConfigProps = config
export { ProjectHomeCollection, ProjectHomeCollectionConfig, ProjectHomeCollectionConfigProps }
