import { defineAsyncComponent } from 'vue'
import { config } from './config'
export const ResourceDeviceDistribution = { name: config.type, component: defineAsyncComponent(() => import('./DeviceDistribution.vue')) }
export const ResourceDeviceDistributionConfig = [{ name: config.type, direct: true, component: defineAsyncComponent(() => import('./Config.vue')) }]
export const ResourceDeviceDistributionConfigProps = config
