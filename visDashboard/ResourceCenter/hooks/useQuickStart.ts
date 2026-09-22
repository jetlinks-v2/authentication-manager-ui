import { computed, type Ref } from 'vue'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { isSaaS } from '@jetlinks-web-core/utils/consts'
import { HOME_TARGETS } from '../../Base/shared/navigation'

type QuickStartAction = {
  key: string
  icon: string
  menu: string
  fallbackMenu?: string
  params?: Record<string, string>
  query?: Record<string, string>
  privateOnly?: boolean
}

const actions: QuickStartAction[] = [
  { key: 'edge', icon: 'ApiOutlined', menu: 'iot-user-device-list', query: { type: 'gateway' } },
  { key: 'iot', icon: 'DatabaseOutlined', menu: HOME_TARGETS.addDevice.menus[0], query: HOME_TARGETS.addDevice.query },
  { key: 'video', icon: 'VideoCameraAddOutlined', menu: HOME_TARGETS.addVideo.menus[0], query: HOME_TARGETS.addVideo.query },
  { key: 'screen', icon: 'DashboardOutlined', menu: 'visualization/project', query: { action: 'create', kind: 'screen' } },
  { key: 'collector', icon: 'FundOutlined', menu: 'data-collect', privateOnly: true },
  { key: 'card', icon: 'WifiOutlined', menu: 'iot-card/CardManagement', privateOnly: true },
]

/** 只使用当前菜单编码；无访问权限显示禁用，设计预览不触发业务跳转。 */
export function useQuickStart(isEdit: Ref<boolean>, isPreview?: Ref<boolean>) {
  const menu = useMenuStore()
  const preview = computed(() => isEdit.value || Boolean(isPreview?.value))
  const resolveMenu = (action: QuickStartAction) => {
    if (menu.getMenu(action.menu)) return action.menu
    if (action.fallbackMenu && menu.getMenu(action.fallbackMenu)) return action.fallbackMenu
    return undefined
  }
  const visibleActions = computed(() => actions.filter(action => !action.privateOnly || !isSaaS).map(action => ({
    ...action,
    disabled: !preview.value && !resolveMenu(action),
  })))
  /** 独立路由新增页直接直达，弹层类新增跳转到列表并携带创建动作。 */
  function open(key: string) {
    const action = visibleActions.value.find(item => item.key === key)
    if (preview.value || !action) return
    const targetMenu = resolveMenu(action)
    if (!targetMenu) return
    menu.jumpPage(targetMenu, {
      params: targetMenu === action.menu ? action.params : undefined,
      query: action.query,
    })
  }
  return { actions: visibleActions, open }
}
