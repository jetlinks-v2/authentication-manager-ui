import { computed, type Ref } from 'vue'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { isSaaS } from '@jetlinks-web-core/utils/consts'

type QuickStartAction = {
  key: string
  icon: string
  menu: string
  query?: Record<string, string>
  privateOnly?: boolean
}

const actions: QuickStartAction[] = [
  { key: 'edge', icon: 'ApiOutlined', menu: 'iot-user/edge-gateway', query: { type: 'gateway', action: 'create' } },
  { key: 'iot', icon: 'DatabaseOutlined', menu: 'iot-user/device/list', query: { type: 'device', action: 'create' } },
  { key: 'video', icon: 'VideoCameraAddOutlined', menu: 'media/Device', query: { type: 'video' } },
  { key: 'screen', icon: 'DashboardOutlined', menu: 'visualization/project', query: { action: 'create', kind: 'screen' } },
  { key: 'collector', icon: 'FundOutlined', menu: 'data-collect', privateOnly: true },
  { key: 'card', icon: 'WifiOutlined', menu: 'iot-card/CardManagement', privateOnly: true },
]

/** 只使用当前菜单编码；无访问权限显示禁用，设计预览不触发业务跳转。 */
export function useQuickStart(isEdit: Ref<boolean>) {
  const menu = useMenuStore()
  const visibleActions = computed(() => actions.filter(action => isEdit.value || !isSaaS || !action.privateOnly)
    .map(action => ({ ...action, disabled: !isEdit.value && !menu.getMenu(action.menu) })))
  /** 仅已有新增弹层的入口携带创建动作，其余入口只跳转到目标页。 */
  function open(code: string) {
    const action = actions.find(item => item.menu === code)
    if (isEdit.value || !action || !menu.getMenu(code)) return
    menu.jumpPage(code, { query: action.query })
  }
  return { actions: visibleActions, open }
}
