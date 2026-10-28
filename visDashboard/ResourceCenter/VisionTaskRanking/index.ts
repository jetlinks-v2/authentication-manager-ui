import { defineAsyncComponent } from 'vue'
import { config } from './config'
export const ResourceVisionTaskRanking = { name: config.type, component: defineAsyncComponent(() => import('./VisionTaskRanking.vue')) }
export const ResourceVisionTaskRankingConfig = [{ name: config.type, direct: true, component: defineAsyncComponent(() => import('./Config.vue')) }]
export const ResourceVisionTaskRankingConfigProps = config
