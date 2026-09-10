import { defineAsyncComponent } from 'vue'
import { config } from './config'
export const ResourceMessageTrend = { name: config.type, component: defineAsyncComponent(() => import('./MessageTrend.vue')) }
export const ResourceMessageTrendConfig = [{ name: config.type, direct: true, component: defineAsyncComponent(() => import('./Config.vue')) }]
export const ResourceMessageTrendConfigProps = config
