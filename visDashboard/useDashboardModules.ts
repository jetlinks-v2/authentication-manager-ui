import { computed, onScopeDispose, ref, type Ref } from 'vue'
import { moduleRegistry } from '@jetlinks-web-core/utils/module-registry'
import { isSaaS } from '@jetlinks-web-core/utils/consts'
import { useMenuStore } from '@jetlinks-web-core/store/menu'

export interface DashboardModules {
  model: boolean
  edge: boolean
  vision: boolean
  collection: boolean
  networkCards: boolean
}

const moduleRequirements = {
  model: { module: 'visualization-model-ui', menu: 'visualization/resource/model' },
  // 当前设备列表统一承载物联设备与边缘节点，不再使用旧的独立网关菜单。
  edge: { module: 'edge-master-ui', menu: 'iot-user-device-list' },
  vision: { module: 'jetlinks-ai-ui', menu: 'algorithm-center' },
  collection: { module: 'data-collector-ui', menu: 'data-collect' },
  networkCards: { module: 'network-card-manager-ui', menu: 'iot-card/CardManagement' },
} as const

type GrantedMenu = { code?: string; children?: GrantedMenu[] }

/** 只读取服务端授权树；路由表中额外注册的预览、详情页不能当作模块授权。 */
function grantedMenuCodes(menus: readonly GrantedMenu[], codes = new Set<string>()): Set<string> {
  for (const menu of menus) {
    if (menu.code) codes.add(menu.code)
    if (menu.children) grantedMenuCodes(menu.children, codes)
  }
  return codes
}

/** 注册发生在业务模块加载之后，按使用时机读取，不能在文件顶层缓存模块状态。 */
export function getDashboardModules(): DashboardModules {
  const menu = useMenuStore()
  const codes = grantedMenuCodes(menu.initialized && !menu.loading ? menu.menuResultCache : [])
  // 安装不等于授权：私有化也不能为无菜单权限的用户展示模块统计或触发请求。
  const available = (key: keyof DashboardModules) => {
    const requirement = moduleRequirements[key]
    return codes.has(requirement.menu) && (isSaaS || moduleRegistry.hasModule(requirement.module))
  }
  return {
    model: available('model'), edge: available('edge'), vision: available('vision'),
    collection: available('collection'), networkCards: available('networkCards'),
  }
}

/** 页面与独立卡片共用模块规则；卸载时清理注册监听，预览不依赖实际安装模块。 */
export function useDashboardModules(preview: Ref<boolean> = ref(false)) {
  const revision = ref(0)
  onScopeDispose(moduleRegistry.onChange(() => { revision.value += 1 }))
  return computed(() => {
    void revision.value
    return preview.value
      ? { model: true, edge: true, vision: true, collection: true, networkCards: true }
      : getDashboardModules()
  })
}
