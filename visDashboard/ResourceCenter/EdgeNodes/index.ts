import { defineAsyncComponent } from 'vue'
import { config } from './config'
export const ResourceEdgeNodes = { name: config.type, component: defineAsyncComponent(() => import('./EdgeNodes.vue')) }
export const ResourceEdgeNodesConfig = [{ name: config.type, direct: true, component: defineAsyncComponent(() => import('./Config.vue')) }]
export const ResourceEdgeNodesConfigProps = config
