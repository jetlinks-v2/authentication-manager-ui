import { defineAsyncComponent } from 'vue'
import { config } from './config'
export const ResourceIotDevices = { name: config.type, component: defineAsyncComponent(() => import('./IotDevices.vue')) }
export const ResourceIotDevicesConfig = [{ name: config.type, direct: true, component: defineAsyncComponent(() => import('./Config.vue')) }]
export const ResourceIotDevicesConfigProps = config
