import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@jetlinks-web-core/store/auth'
import { createDefaults } from '../shared/config'
import { HOME_TARGETS } from '../shared/navigation'
import { useHomeNavigation } from '../shared/useHomeNavigation'
import { getSaasGrantedMenus, hasSaasTarget } from './services/access'
import { SAAS_QUICK_ACTIONS } from './targets'

/** 概览帮助文档使用正式文档地址，顺序与用户的接入流程一致。 */
export const SAAS_HELP_DOCUMENTS = [
  { id: 'device', titleKey: 'saasHelpDevice', url: 'https://hanta.yuque.com/px7kg1/rk46tv/e4294173d3f74837ff1891d50084c4b7?singleDoc#' },
  { id: 'gateway', titleKey: 'saasHelpGateway', url: 'https://hanta.yuque.com/px7kg1/rk46tv/4b41462f3aaa69f665e35410f816a8ea?singleDoc#' },
  { id: 'video', titleKey: 'saasHelpVideo', url: 'https://hanta.yuque.com/px7kg1/rk46tv/f0fe2963e862ce7b0a4c33521b168e12?singleDoc#' },
  { id: 'alarm', titleKey: 'saasHelpAlarm', url: 'https://hanta.yuque.com/px7kg1/rk46tv/1d9a3bea1d9f1efda0c8ae899cae96f3?singleDoc#' },
  { id: 'dashboard', titleKey: 'saasHelpDashboard', url: 'https://hanta.yuque.com/px7kg1/rk46tv/1c7ceeb3ac409447ddb63bc1dbefbd96?singleDoc#' },
  { id: 'application', titleKey: 'saasHelpApplication', url: 'https://hanta.yuque.com/px7kg1/rk46tv/4b939a760f186fff6fdc05c5bf268392?singleDoc#' },
  { id: 'faq', titleKey: 'saasHelpFaq', url: 'https://hanta.yuque.com/px7kg1/rk46tv/e90567388f9ff5cb184dc7b58ad17e9e?singleDoc#' },
]
export const SAAS_HELP_CENTER_URL = 'https://hanta.yuque.com/px7kg1/rk46tv/6da59c1ac931da9ee77cdf8e73f56aba?singleDoc#'

/** 快捷动作沿用已授权菜单；创建场景需要父菜单授权和真实编辑子路由同时可用。 */
export function useSaasUtilities(isEdit: () => boolean) {
  const { t } = useI18n()
  const navigation = useHomeNavigation(ref(true), computed(isEdit))
  const auth = useAuthStore()
  const rows = computed(() => {
    const menus = getSaasGrantedMenus()
    return SAAS_QUICK_ACTIONS.filter(row => hasSaasTarget(menus, row.id === 'scene' ? HOME_TARGETS.scene : row.target)
      && navigation.canOpen(row.target)
      && (row.id !== 'scene' || HOME_TARGETS.scene.menus.some(code => menus.has(code) && auth.hasPermission(`${code}:add`))))
  })
  // 概览仅保留四个常用入口，完整文档由帮助中心承接。
  const documents = computed(() => SAAS_HELP_DOCUMENTS.slice(0, 4).map(doc => ({ id: doc.id, title: t(`packages.ProjectHome.${doc.titleKey}`) })))
  const hasActions = computed(() => rows.value.length > 0)
  const chart = { ...createDefaults('QuickActions').chart, displayStyle: 'saas' }
  /** 只打开配置中的正式文档，编辑预览不触发外部跳转。 */
  function openHelp(id: string) {
    if (isEdit()) return
    const url = SAAS_HELP_DOCUMENTS.find(item => item.id === id)?.url
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }
  function openHelpCenter() {
    if (!isEdit()) window.open(SAAS_HELP_CENTER_URL, '_blank', 'noopener,noreferrer')
  }
  return { ...navigation, rows, hasActions, documents, chart, openHelp, openHelpCenter }
}
