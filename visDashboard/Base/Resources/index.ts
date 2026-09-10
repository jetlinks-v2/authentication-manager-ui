import { defineAsyncComponent } from 'vue'
import { config } from './config'
const ProjectHomeResources = {
  name: config.type,
  component: defineAsyncComponent(() => import('./ProjectHomeResources.vue')),
}
// 本期只提供默认展示，配置目录刻意为空。
const ProjectHomeResourcesConfig = []
const ProjectHomeResourcesConfigProps = config
export { ProjectHomeResources, ProjectHomeResourcesConfig, ProjectHomeResourcesConfigProps }
