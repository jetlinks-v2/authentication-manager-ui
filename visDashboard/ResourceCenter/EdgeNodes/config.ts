import i18n from '@jetlinks-web-core/locales'
import { defaultSettings } from '../shared'
export const config = {
  name: i18n.global.t('resourceDashboard.EdgeNodes'), type: 'resourceCenterEdgeNodes',
  componentProps: {
    style: { width: '100%', height: '100%' },
    gridItem: { x: 0, y: 0, w: 3, h: 4, minW: 3, minH: 4 },
    resourceCenterEdgeNodes: { ...defaultSettings },
  },
}
