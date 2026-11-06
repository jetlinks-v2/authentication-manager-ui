import { HOME_TARGETS } from '../../../../visDashboard/Base/shared/navigation'
import type { ResourcePageAccess } from '../resourcePage.types'

interface GrantedMenu { code?: string; children?: GrantedMenu[] }
interface ResourceAccessSource {
  saas: boolean
  menus: readonly GrantedMenu[]
  installed: (module: string) => boolean
}

/** 仅在服务端授权树中查找入口，避免隐藏详情路由被当成菜单授权。 */
export function hasGrantedResourceMenu(menus: readonly GrantedMenu[], code: string): boolean {
  return menus.some(menu => menu.code === code || !!menu.children && hasGrantedResourceMenu(menu.children, code))
}

/** 只使用授权菜单树判断能力，详情路由和已注册组件不能当作授权。 */
export function resolveResourcePageAccess(source: ResourceAccessSource): ResourcePageAccess {
  const codes = new Set<string>()
  const collect = (menus: readonly GrantedMenu[]) => {
    for (const menu of menus) {
      if (menu.code) codes.add(menu.code)
      if (menu.children) collect(menu.children)
    }
  }
  collect(source.menus)
  const granted = (menus: readonly string[]) => menus.some(code => codes.has(code))
  // 边端虽沿用 saas 构建标识，资源页仍按已安装的 edge-basic-ui 判定本机能力。
  const local = source.installed('edge-basic-ui')
  const saas = source.saas && !local
  const available = (module: string, menus: readonly string[]) => granted(menus)
    && (saas || source.installed(module) || local && module === 'data-collector-ui')
  const iot = available('device-manager-ui', HOME_TARGETS.devices.menus)
  const video = available('jetlinks-media-ui', HOME_TARGETS.video.menus)
  const edge = available('edge-master-ui', HOME_TARGETS.gateway.menus)
  const visionMenus = ['algorithm-center', 'project/algorithm-center', ...(local ? ['machine-vision/Task'] : [])]
  return {
    saas, iot, video, edge,
    vision: video && (edge || local) && available('jetlinks-ai-ui', visionMenus),
    aiEvents: (saas || video) && available('jetlinks-ai-ui', ['video/event']),
    visualization: available('visualization-manager-ui', HOME_TARGETS.screen.menus),
    product: !saas && available('device-manager-ui', ['device/Product']),
    collection: !saas && available('data-collector-ui', HOME_TARGETS.collector.menus),
    networkCards: !saas && available('network-card-manager-ui', HOME_TARGETS.card.menus),
    networkPools: !saas && available('network-card-manager-ui', ['iot-card/TrafficPoolManagement']),
    // 边端资源看板不展示设备分布；云端仍沿用设备、视频及网关的地图准入。
    map: !local && (iot || video || edge),
  }
}
