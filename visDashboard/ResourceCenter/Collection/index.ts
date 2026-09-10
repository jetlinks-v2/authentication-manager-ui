import { defineAsyncComponent } from 'vue'
import { config } from './config'
export const ResourceCollection = { name: config.type, component: defineAsyncComponent(() => import('./Collection.vue')) }
export const ResourceCollectionConfig = [{ name: config.type, direct: true, component: defineAsyncComponent(() => import('./Config.vue')) }]
export const ResourceCollectionConfigProps = config
