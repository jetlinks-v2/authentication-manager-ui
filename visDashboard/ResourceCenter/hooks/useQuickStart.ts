import { computed, type Ref } from 'vue'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { isSaaS } from '@jetlinks-web-core/utils/consts'

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
  { key: 'edge', icon: 'ApiOutlined', menu: 'iot-user/edge-gateway', query: { type: 'gateway', action: 'create' } },
  { key: 'iot', icon: 'DatabaseOutlined', menu: 'iot-user/device/list', query: { type: 'device', action: 'create' } },
  { key: 'video', icon: 'VideoCameraAddOutlined', menu: 'media/Device/Save', fallbackMenu: 'media/Device', params: { id: ':id' }, query: { type: 'video', action: 'create' } },
  { key: 'screen', icon: 'DashboardOutlined', menu: 'visualization/project', query: { action: 'create', kind: 'screen' } },
  { key: 'collector', icon: 'FundOutlined', menu: 'data-collect', privateOnly: true },
  { key: 'card', icon: 'WifiOutlined', menu: 'iot-card/CardManagement', privateOnly: true },
]

/** 只使用当前菜单编码；无访问权限显示禁用，设计预览不触发业务跳转。 */
export function useQuickStart(isEdit: Ref<boolean>, isPreview?: Ref<boolean>) {
  const menu = useMenuStore()
  const resolveMenu = (action: QuickStartAction) => {
    if (menu.getMenu(action.menu)) return action.menu
    if (action.fallbackMenu && menu.getMenu(action.fallbackMenu)) return action.fallbackMenu
    return undefined
  }
  const visibleActions = computed(() => actions.map(action => ({
    ...action,
    disabled: !isEdit.value && !resolveMenu(action),
  })))
  /** 独立路由新增页直接直达，弹层类新增跳转到列表并携带创建动作。 */
  function open(code: string) {
    const action = actions.find(item => item.menu === code || item.fallbackMenu === code)
    if (isEdit.value || !action) return
    const targetMenu = resolveMenu(action)
    if (!targetMenu) return
    menu.jumpPage(targetMenu, {
      params: targetMenu === action.menu ? action.params : undefined,
      query: action.query,
    })
  }
  return { actions: visibleActions, open }
}
