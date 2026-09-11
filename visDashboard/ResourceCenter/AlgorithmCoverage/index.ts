import { defineAsyncComponent } from 'vue'
import { config } from './config'
export const ResourceAlgorithmCoverage = { name: config.type, component: defineAsyncComponent(() => import('./AlgorithmCoverage.vue')) }
export const ResourceAlgorithmCoverageConfig = [{ name: config.type, direct: true, component: defineAsyncComponent(() => import('./Config.vue')) }]
export const ResourceAlgorithmCoverageConfigProps = config
