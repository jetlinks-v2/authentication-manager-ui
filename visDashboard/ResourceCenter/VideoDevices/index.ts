import { defineAsyncComponent } from 'vue'
import { config } from './config'
export const ResourceVideoDevices = { name: config.type, component: defineAsyncComponent(() => import('./VideoDevices.vue')) }
export const ResourceVideoDevicesConfig = [{ name: config.type, direct: true, component: defineAsyncComponent(() => import('./Config.vue')) }]
export const ResourceVideoDevicesConfigProps = config
