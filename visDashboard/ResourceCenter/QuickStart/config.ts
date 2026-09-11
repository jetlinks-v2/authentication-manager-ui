import i18n from '@jetlinks-web-core/locales'
import { defaultSettings } from '../shared'
export const config = {
  name: i18n.global.t('resourceDashboard.QuickStart'), type: 'resourceCenterQuickStart',
  componentProps: {
    style: { width: '100%', height: '100%' },
    gridItem: { x: 0, y: 0, w: 6, h: 6, minW: 4, minH: 5 },
    resourceCenterQuickStart: { ...defaultSettings },
  },
}
