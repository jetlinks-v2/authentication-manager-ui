import { defineAsyncComponent } from 'vue'
import { config } from './config'
const ProjectHomeApplications = {
  name: config.type,
  component: defineAsyncComponent(() => import('./ProjectHomeApplications.vue')),
}
// 本期只提供默认展示，配置目录刻意为空。
const ProjectHomeApplicationsConfig = []
const ProjectHomeApplicationsConfigProps = config
export { ProjectHomeApplications, ProjectHomeApplicationsConfig, ProjectHomeApplicationsConfigProps }
