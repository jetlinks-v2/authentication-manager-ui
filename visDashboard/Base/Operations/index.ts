import { defineAsyncComponent } from 'vue'
import { config } from './config'
const ProjectHomeOperations = {
  name: config.type,
  component: defineAsyncComponent(() => import('./ProjectHomeOperations.vue')),
}
// 本期只提供默认展示，配置目录刻意为空。
const ProjectHomeOperationsConfig = []
const ProjectHomeOperationsConfigProps = config
export { ProjectHomeOperations, ProjectHomeOperationsConfig, ProjectHomeOperationsConfigProps }
