import i18n from '@jetlinks-web-core/locales'
import { defaultSettings } from '../shared'
export const config = {
  name: i18n.global.t('resourceDashboard.NetworkCards'), type: 'resourceCenterNetworkCards',
  componentProps: {
    style: { width: '100%', height: '100%' },
    gridItem: { x: 0, y: 0, w: 6, h: 16, minW: 4, minH: 14 },
    resourceCenterNetworkCards: { ...defaultSettings },
  },
}
