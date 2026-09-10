import i18n from '@jetlinks-web-core/locales'
import { defaultSettings } from '../shared'
export const config = {
  name: i18n.global.t('resourceDashboard.DeviceDistribution'), type: 'resourceCenterDeviceDistribution',
  componentProps: {
    style: { width: '100%', height: '100%' },
    gridItem: { x: 0, y: 0, w: 6, h: 11, minW: 4, minH: 9 },
    resourceCenterDeviceDistribution: { ...defaultSettings },
  },
}
