import { defineAsyncComponent } from 'vue'
import { config } from './config'
export const ResourceVideoPlaybackTrend = { name: config.type, component: defineAsyncComponent(() => import('./VideoPlaybackTrend.vue')) }
export const ResourceVideoPlaybackTrendConfig = [{ name: config.type, direct: true, component: defineAsyncComponent(() => import('./Config.vue')) }]
export const ResourceVideoPlaybackTrendConfigProps = config
