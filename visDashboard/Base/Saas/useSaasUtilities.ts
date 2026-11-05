import { computed, inject, type InjectionKey } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { useUserStore } from '@jetlinks-web-core/store/user'
import dayjs from 'dayjs'
import { getSaasProjectEntries } from './services/access'
import type { PrivateAccountEntry, PrivateAccountProfile } from '../Private/types'
import type { usePrivateApplicationEntry } from '../Private/usePrivateApplicationEntry'

/** 页面持有唯一的应用授权状态，画布重排不会重复查询角色或个人应用名单。 */
export const saasApplicationEntryKey: InjectionKey<ReturnType<typeof usePrivateApplicationEntry>> = Symbol('saas-application-entry')

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

/** 账号信息来自当前会话；功能入口只从已授权且可导航的菜单树生成。 */
export function useSaasAccount(isEdit: () => boolean) {
  const user = useUserStore(), menu = useMenuStore(), { t } = useI18n()
  const applicationEntry = inject(saasApplicationEntryKey, undefined)
  const applicationMode = computed(() => applicationEntry?.mode.value === 'applications')
  const names = (values: unknown[] = []) => values.flatMap(value => {
    if (!value || typeof value !== 'object' || !('name' in value)) return []
    return typeof value.name === 'string' && value.name.trim() ? [value.name.trim()] : []
  })
  const profile = computed<PrivateAccountProfile>(() => {
    if (applicationMode.value && applicationEntry) return applicationEntry.profile.value
    const info = user.userInfo, time = Number(info.loginInfo?.loginTime)
    return { name: info.name || info.username || '—', username: info.username || '—',
      avatar: (info as { avatar?: string }).avatar, roles: [...new Set(names(info.roleList))],
      organizations: [...new Set(names(info.orgList))],
      latestLogin: Number.isFinite(time) && time > 0 && dayjs(time).isValid() ? dayjs(time).toISOString() : undefined }
  })
  const entries = computed<PrivateAccountEntry[]>(() => {
    if (applicationMode.value && applicationEntry) return applicationEntry.entries.value
    return getSaasProjectEntries().map(item => ({ id: item.id, name: t(item.titleKey), disabled: false }))
  })
  const openingId = computed(() => applicationMode.value ? applicationEntry?.openingId.value : undefined)
  function open(id: string) {
    if (isEdit() || !entries.value.some(item => item.id === id)) return
    if (applicationMode.value && applicationEntry) void applicationEntry.openApplication(id)
    else void menu.jumpPage(id)
  }
  function openAccount() {
    if (isEdit()) return
    if (applicationMode.value && applicationEntry) applicationEntry.openAccount()
    else void menu.routerPush('account/center', { params: { tabKey: 'BindThirdAccount' }, query: { tab: 'BasicInfo' } })
  }
  function openAll() {
    if (!isEdit() && applicationMode.value) applicationEntry?.openAll()
  }
  return { profile, entries, openingId, applicationEntry, open, openAccount, openAll }
}

/** 帮助文档复用正式地址；编辑态不触发外部导航。 */
export function useSaasUtilities(isEdit: () => boolean) {
  const { t } = useI18n()
  // 概览仅保留四个常用入口，完整文档由帮助中心承接。
  const documents = computed(() => SAAS_HELP_DOCUMENTS.slice(0, 4).map(doc => ({ id: doc.id, title: t(`packages.ProjectHome.${doc.titleKey}`) })))
  /** 只打开配置中的正式文档，编辑预览不触发外部跳转。 */
  function openHelp(id: string) {
    if (isEdit()) return
    const url = SAAS_HELP_DOCUMENTS.find(item => item.id === id)?.url
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }
  function openHelpCenter() {
    if (!isEdit()) window.open(SAAS_HELP_CENTER_URL, '_blank', 'noopener,noreferrer')
  }
  return { documents, openHelp, openHelpCenter }
}
