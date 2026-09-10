import { defineAsyncComponent } from 'vue'
import { config } from './config'
const ProjectHomeAnnouncements = {
  name: config.type,
  component: defineAsyncComponent(() => import('./ProjectHomeAnnouncements.vue')),
}
// 本期只提供默认展示，配置目录刻意为空。
const ProjectHomeAnnouncementsConfig = []
const ProjectHomeAnnouncementsConfigProps = config
export { ProjectHomeAnnouncements, ProjectHomeAnnouncementsConfig, ProjectHomeAnnouncementsConfigProps }
