import { defineAsyncComponent } from 'vue'
import { config } from './config'
const ProjectHomeQuotas = {
  name: config.type,
  component: defineAsyncComponent(() => import('./ProjectHomeQuotas.vue')),
}
// 本期只提供默认展示，配置目录刻意为空。
const ProjectHomeQuotasConfig = []
const ProjectHomeQuotasConfigProps = config
export { ProjectHomeQuotas, ProjectHomeQuotasConfig, ProjectHomeQuotasConfigProps }
