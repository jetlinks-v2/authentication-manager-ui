import { computed, inject, type Ref } from 'vue'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { isSaaS } from '@jetlinks-web-core/utils/consts'
import { getQuickStartActions } from '../services/quickStart'
import { resourceCapabilitiesKey, useResourceCapabilities } from './useResourceCapabilities'

/** 只使用当前菜单编码；无访问权限显示禁用，设计预览不触发业务跳转。 */
export function useQuickStart(isEdit: Ref<boolean>, isPreview?: Ref<boolean>) {
  const menu = useMenuStore()
  const preview = computed(() => isEdit.value || Boolean(isPreview?.value))
  // 正式页面复用一次检查；独立组件也检查能力，不能因缺少页面注入而展示全部入口。
  const resourceCapabilities = inject(resourceCapabilitiesKey, undefined) ?? useResourceCapabilities(preview)
  const visibleActions = computed(() => getQuickStartActions({
    ...resourceCapabilities.capabilities.value, edge: resourceCapabilities.modules.value.edge,
  }, isSaaS, preview.value).map(action => ({
    ...action,
    disabled: !preview.value && !menu.getMenu(action.menu),
  })))
  /** 独立路由新增页直接直达，弹层类新增跳转到列表并携带创建动作。 */
  function open(key: string) {
    const action = visibleActions.value.find(item => item.key === key)
    if (preview.value || !action) return
    if (!menu.getMenu(action.menu)) return
    menu.jumpPage(action.menu, {
      query: action.query,
    })
  }
  return { actions: visibleActions, open, ...resourceCapabilities }
}
