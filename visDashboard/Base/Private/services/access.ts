import { moduleRegistry } from '@jetlinks-web-core/utils/module-registry'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { useAuthStore } from '@jetlinks-web-core/store/auth'
import { HOME_TARGETS } from '../../shared/navigation'
import type { HomeTarget } from '../../shared/types'

export const PRIVATE_TARGETS = {
  devices: { ...HOME_TARGETS.devices, query: { type: 'device' } },
  video: HOME_TARGETS.video,
  product: { menus: ['device/Product'] },
  screen: HOME_TARGETS.screen,
  message: { menus: ['resources/Dashboard'] },
  ai: { menus: ['video/event'] },
  iotAlarm: HOME_TARGETS.deviceAlarm,
  videoAlarm: HOME_TARGETS.visionAlarm,
  protocol: { menus: ['link/Protocol'] },
  network: { menus: ['link/Type'] },
  certificate: { menus: ['link/Certificate'] },
  gateway: { menus: ['link/AccessConfig'] },
  media: { menus: ['media/Stream'] },
  runtime: { menus: ['link/RuntimeMonitor'] },
  applications: HOME_TARGETS.applications,
  scene: HOME_TARGETS.scene,
  task: { menus: ['machine-vision/Task'] },
} satisfies Record<string, HomeTarget>

type GrantedMenu = { code?: string; children?: GrantedMenu[] }

/** 以安装模块与服务端菜单共同准入，隐藏路由和纯安装记录均不能授予查询权限。 */
export function getPrivateOverviewAccess() {
  const menu = useMenuStore()
  const codes = new Set<string>()
  const collect = (items: readonly GrantedMenu[]) => {
    for (const item of items) {
      if (item.code) codes.add(item.code)
      if (item.children) collect(item.children)
    }
  }
  if (menu.initialized && !menu.loading) collect(menu.menuResultCache)
  const granted = (target: HomeTarget) => target.menus.some(code => codes.has(code))
  const installed = (name: string) => moduleRegistry.hasModule(name)
  const deviceModule = installed('device-manager-ui')
  const mediaModule = installed('jetlinks-media-ui')
  const aiModule = installed('jetlinks-ai-ui')
  return {
    iot: deviceModule && granted(PRIVATE_TARGETS.devices),
    video: mediaModule && granted(PRIVATE_TARGETS.video),
    product: deviceModule && granted(PRIVATE_TARGETS.product),
    screen: installed('visualization-manager-ui') && granted(PRIVATE_TARGETS.screen),
    message: deviceModule && granted(PRIVATE_TARGETS.message),
    ai: aiModule && granted(PRIVATE_TARGETS.ai),
    iotAlarm: deviceModule && granted(PRIVATE_TARGETS.iotAlarm),
    videoAlarm: aiModule && granted(PRIVATE_TARGETS.videoAlarm),
    protocol: deviceModule && granted(PRIVATE_TARGETS.protocol),
    network: deviceModule && granted(PRIVATE_TARGETS.network),
    certificate: deviceModule && granted(PRIVATE_TARGETS.certificate),
    gateway: deviceModule && granted(PRIVATE_TARGETS.gateway),
    media: mediaModule && granted(PRIVATE_TARGETS.media),
    runtime: deviceModule && granted(PRIVATE_TARGETS.runtime) && useAuthStore().hasPermission('link/RuntimeMonitor:query'),
    applications: granted(PRIVATE_TARGETS.applications),
    scene: installed('rule-engine-manager-ui') && granted(PRIVATE_TARGETS.scene),
    task: aiModule && granted(PRIVATE_TARGETS.task),
  }
}
export type PrivateOverviewAccess = ReturnType<typeof getPrivateOverviewAccess>
