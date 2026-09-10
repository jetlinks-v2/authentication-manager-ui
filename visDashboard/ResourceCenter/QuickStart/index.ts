import { defineAsyncComponent } from 'vue'
import { config } from './config'
export const ResourceQuickStart = { name: config.type, component: defineAsyncComponent(() => import('./QuickStart.vue')) }
export const ResourceQuickStartConfig = [{ name: config.type, direct: true, component: defineAsyncComponent(() => import('./Config.vue')) }]
export const ResourceQuickStartConfigProps = config
