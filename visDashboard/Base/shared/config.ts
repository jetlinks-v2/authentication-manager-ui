import type { HomeConfig, HomeFeature, HomeInfo } from './types'
export const homeType = (feature: HomeFeature) => `projectHome${feature}`
export const createDefaults = (feature: HomeFeature): HomeConfig => ({
  chart: { displayStyle: 'default', fontSize: 14, showIcon: true, showDescription: true,
    showProgress: feature !== 'Operations', showDate: true, navigation: true },
  refreshTime: 60,
})
export function getHomeConfig(feature: HomeFeature, info?: HomeInfo): HomeConfig {
  const defaults = createDefaults(feature)
  const value = info?.componentProps?.[homeType(feature)] as Partial<HomeConfig> | undefined
  return { ...defaults, ...value, chart: { ...defaults.chart, ...value?.chart } }
}
