import { defineAsyncComponent } from 'vue'
import { config } from './config'
export const ResourceNetworkCards = { name: config.type, component: defineAsyncComponent(() => import('./NetworkCards.vue')) }
export const ResourceNetworkCardsConfig = [{ name: config.type, direct: true, component: defineAsyncComponent(() => import('./Config.vue')) }]
export const ResourceNetworkCardsConfigProps = config
