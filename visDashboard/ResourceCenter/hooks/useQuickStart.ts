import { computed, type Ref } from 'vue'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { isSaaS } from '@jetlinks-web-core/utils/consts'

const actions = [
  { key: 'edge', icon: 'ApiOutlined', menu: 'iot-user/edge-gateway' },
  { key: 'iot', icon: 'DatabaseOutlined', menu: 'iot-user/device/list' },
  { key: 'video', icon: 'VideoCameraAddOutlined', menu: 'media/Device' },
  { key: 'screen', icon: 'DashboardOutlined', menu: 'visualization/project' },
  { key: 'collector', icon: 'FundOutlined', menu: 'data-collect', privateOnly: true },
  { key: 'card', icon: 'WifiOutlined', menu: 'iot-card/CardManagement', privateOnly: true },
]

/** 只使用当前菜单编码；无访问权限显示禁用，设计预览不触发业务跳转。 */
export function useQuickStart(isEdit: Ref<boolean>) {
  const menu = useMenuStore()
  const visibleActions = computed(() => actions.filter(action => isEdit.value || !isSaaS || !action.privateOnly)
    .map(action => ({ ...action, disabled: !isEdit.value && !menu.getMenu(action.menu) })))
  function open(code: string) {
    if (!isEdit.value && menu.getMenu(code)) menu.jumpPage(code)
  }
  return { actions: visibleActions, open }
}
