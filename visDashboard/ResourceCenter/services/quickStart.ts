import { HOME_TARGETS } from '../../Base/shared/navigation'
import type { ResourceCapabilities } from './capabilities'

export interface QuickStartAction {
  key: string
  icon: string
  menu: string
  query?: Record<string, string>
  capability?: keyof ResourceCapabilities | 'edge'
}

const actions: QuickStartAction[] = [
  { key: 'edge', icon: 'ApiOutlined', menu: 'iot-user-device-list', query: { type: 'gateway' }, capability: 'edge' },
  { key: 'iot', icon: 'DatabaseOutlined', menu: HOME_TARGETS.addDevice.menus[0], query: HOME_TARGETS.addDevice.query },
  { key: 'video', icon: 'VideoCameraAddOutlined', menu: HOME_TARGETS.addVideo.menus[0], query: HOME_TARGETS.addVideo.query },
  { key: 'screen', icon: 'DashboardOutlined', menu: 'visualization/project', query: { action: 'create', kind: 'screen' } },
  { key: 'collector', icon: 'FundOutlined', menu: 'data-collect', capability: 'collection' },
  { key: 'card', icon: 'WifiOutlined', menu: 'iot-card/CardManagement', capability: 'networkCards' },
]

/** 卡片与布局按同一最终入口集合计算，不能再把基础入口数固定为四个。 */
export function getQuickStartActions(available: ResourceCapabilities & { edge: boolean }, saas: boolean, preview = false) {
  return actions.filter(action => {
    if (preview || !action.capability) return true
    if (saas) return action.capability === 'edge'
    return available[action.capability]
  })
}
