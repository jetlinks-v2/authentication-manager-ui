import { HOME_TARGETS } from '../../../../visDashboard/Base/shared/navigation'
import type { ResourcePageAccess } from '../resourcePage.types'

interface GrantedMenu { code?: string; children?: GrantedMenu[] }
interface ResourceAccessSource {
  saas: boolean
  menus: readonly GrantedMenu[]
  installed: (module: string) => boolean
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
  const available = (module: string, menus: readonly string[]) => granted(menus) && (source.saas || source.installed(module))
  const iot = available('device-manager-ui', HOME_TARGETS.devices.menus)
  const video = available('jetlinks-media-ui', HOME_TARGETS.video.menus)
  const edge = available('edge-master-ui', HOME_TARGETS.gateway.menus)
  return {
    saas: source.saas, iot, video, edge,
    vision: edge && video && available('jetlinks-ai-ui', ['algorithm-center', 'project/algorithm-center']),
    aiEvents: available('jetlinks-ai-ui', ['video/event']),
    visualization: available('visualization-manager-ui', HOME_TARGETS.screen.menus),
    product: !source.saas && available('device-manager-ui', ['device/Product']),
    collection: !source.saas && available('data-collector-ui', HOME_TARGETS.collector.menus),
    networkCards: !source.saas && available('network-card-manager-ui', HOME_TARGETS.card.menus),
    map: iot,
  }
}
