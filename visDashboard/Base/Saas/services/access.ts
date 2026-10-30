import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { getDashboardModules } from '../../../useDashboardModules'
import { HOME_TARGETS } from '../../shared/navigation'
import type { HomeTarget } from '../../shared/types'

interface GrantedMenu { code?: string; children?: GrantedMenu[] }

/** 仅使用服务端授权菜单，路由表中的隐藏详情页不能作为统计查询权限。 */
export function getSaasGrantedMenus(): ReadonlySet<string> {
  const menu = useMenuStore()
  const codes = new Set<string>()
  const collect = (items: readonly GrantedMenu[]) => {
    for (const item of items) {
      if (item.code) codes.add(item.code)
      if (item.children) collect(item.children)
    }
  }
  if (menu.initialized && !menu.loading) collect(menu.menuResultCache)
  return codes
}

/** 查询与下钻使用同一菜单准入范围，先过滤再创建异步请求。 */
export const hasSaasTarget = (codes: ReadonlySet<string>, target: HomeTarget): boolean => (
  target.menus.some(code => codes.has(code))
)

export const SAAS_TARGETS = {
  messages: { menus: ['resources/Dashboard'] },
  events: { menus: ['video/event'] },
} satisfies Record<string, HomeTarget>

// 管理员资源概况仅承载设备、通道、边缘节点和数据看板；业务配置由最近访问进入。
export const SAAS_RESOURCE_TARGETS = {
  devices: HOME_TARGETS.devices, video: HOME_TARGETS.video, gateway: HOME_TARGETS.gateway,
  screen: HOME_TARGETS.screen,
} satisfies Record<string, HomeTarget>
export const SAAS_TODAY_TARGETS = {
  deviceAlarm: HOME_TARGETS.deviceAlarm, visionAlarm: HOME_TARGETS.visionAlarm,
  message: SAAS_TARGETS.messages, aiEvent: SAAS_TARGETS.events,
} satisfies Record<string, HomeTarget>
export type SaasResourceId = keyof typeof SAAS_RESOURCE_TARGETS
export type SaasTodayId = keyof typeof SAAS_TODAY_TARGETS

/** 布局与加载器共用授权维度；业务零值、失败和加载中的结果都不改变区块可用性。 */
export function getSaasOverviewAccess() {
  const menus = getSaasGrantedMenus()
  const modules = getDashboardModules()
  const resourceIds = (Object.keys(SAAS_RESOURCE_TARGETS) as SaasResourceId[]).filter(id => (
    hasSaasTarget(menus, SAAS_RESOURCE_TARGETS[id])
    && (id !== 'gateway' || modules.edge)
  ))
  const todayIds = (Object.keys(SAAS_TODAY_TARGETS) as SaasTodayId[])
    .filter(id => hasSaasTarget(menus, SAAS_TODAY_TARGETS[id]))
  return { resourceIds, todayIds, showResources: resourceIds.length > 0, showToday: todayIds.length > 0 }
}
