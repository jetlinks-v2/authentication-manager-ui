import { defineAsyncComponent } from 'vue'
import { config } from './config'

const ProjectHomeQuickGuide = {
  name: config.type,
  component: defineAsyncComponent(() => import('./ProjectHomeQuickGuide.vue')),
}

const ProjectHomeQuickGuideConfig = []
const ProjectHomeQuickGuideConfigProps = config

export { ProjectHomeQuickGuide, ProjectHomeQuickGuideConfig, ProjectHomeQuickGuideConfigProps }
