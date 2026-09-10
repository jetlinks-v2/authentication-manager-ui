import { defineAsyncComponent } from 'vue'
import { config } from './config'
export const ResourceVisualization = { name: config.type, component: defineAsyncComponent(() => import('./Visualization.vue')) }
export const ResourceVisualizationConfig = [{ name: config.type, direct: true, component: defineAsyncComponent(() => import('./Config.vue')) }]
export const ResourceVisualizationConfigProps = config
