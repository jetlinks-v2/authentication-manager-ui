import type { Ref } from 'vue'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import type { HomeTarget } from './types'
export function useHomeNavigation(enabled: Ref<boolean>, isEdit: Ref<boolean>) {
  const menu = useMenuStore()
  const resolve = (target?: HomeTarget) => target?.menus.find(code => menu.getMenu(code))
  const canOpen = (target?: HomeTarget) => enabled.value && !!resolve(target)
  const open = (target?: HomeTarget) => {
    const code = resolve(target)
    if (!enabled.value || isEdit.value || !code) return
    menu.jumpPage(code, { params: target?.params, query: target?.query })
  }
  return { canOpen, open }
}
