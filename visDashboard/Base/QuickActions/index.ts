import { defineAsyncComponent } from 'vue'
import { config } from './config'
const ProjectHomeQuickActions = {
  name: config.type,
  component: defineAsyncComponent(() => import('./ProjectHomeQuickActions.vue')),
}
// 本期只提供默认展示，配置目录刻意为空。
const ProjectHomeQuickActionsConfig = []
const ProjectHomeQuickActionsConfigProps = config
export { ProjectHomeQuickActions, ProjectHomeQuickActionsConfig, ProjectHomeQuickActionsConfigProps }
