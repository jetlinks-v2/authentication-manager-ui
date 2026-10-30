import { computed } from 'vue'
import { useRouter, type RouteRecordRaw } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useNow } from '@vueuse/core'
import dayjs from 'dayjs'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { getSaasGrantedMenus } from './services/access'
import { HOME_TARGETS } from '../shared/navigation'
import type { HomeTarget } from '../shared/types'
import { ensureRecentVisitRecorder, readRecentVisits, recentVisitsRevision, recentVisitStorageKey } from './services/recentVisits'

interface RecentEntry { id: string; title: string; description: string; icon: string; fullPath: string; target: HomeTarget }
interface MenuPresentation { title: string; path: string[]; icon?: string }
const starts: { id: string; icon: string; target: HomeTarget }[] = [
  { id: 'dashboard', icon: 'DashboardOutlined', target: { menus: ['resources/Dashboard'] } },
  { id: 'devices', icon: 'UnorderedListOutlined', target: { ...HOME_TARGETS.devices, query: { type: 'device' } } },
  { id: 'alarms', icon: 'AlertOutlined', target: HOME_TARGETS.deviceAlarm },
  { id: 'events', icon: 'ScanOutlined', target: { menus: ['video/event'] } },
  { id: 'scenes', icon: 'ApartmentOutlined', target: HOME_TARGETS.scene },
  { id: 'login', icon: 'KeyOutlined', target: { menus: ['system/ThirdPartyLogin'] } },
]

/** 真实访问优先，剩余位置用未重复的授权默认入口补齐，不伪造访问时间。 */
export function useSaasRecent() {
  const router = useRouter(), menu = useMenuStore()
  const { t } = useI18n()
  const now = useNow({ interval: 60_000 })
  ensureRecentVisitRecorder(router)
  // 从当前可见菜单树解析展示信息，旧访问记录也能跟随菜单重命名、图标和语言变化。
  const menuPresentations = computed(() => {
    const result = new Map<string, MenuPresentation>()
    function collect(nodes: RouteRecordRaw[], ancestors: string[] = [], parentIcon?: string) {
      nodes.forEach(node => {
        const title = node.meta?.title ? t(String(node.meta.title)) : ''
        const visible = node.meta?.hideInMenu !== true && !!title
        const path = visible ? [...ancestors, title] : ancestors
        // 独立入口统一使用所属二级菜单图标，三级及详情不覆盖；圆点不作为业务图标。
        const ownIcon = typeof node.meta?.icon === 'string' ? node.meta.icon : undefined
        const icon = visible && ancestors.length < 2 && ownIcon && ownIcon !== 'icon-yuandian'
          ? ownIcon : parentIcon
        if (visible && node.name) result.set(String(node.name), { title, path, icon })
        if (node.children?.length) collect(node.children, path, icon)
      })
    }
    collect(menu.siderMenus)
    return result
  })
  function presentation(code: string) {
    return menuPresentations.value.get(String(menu.getMenu(code)?.routeName || code))
  }
  function visitTime(visitedAt: number) {
    const visit = dayjs(visitedAt), today = dayjs(now.value)
    if (visit.isSame(today, 'day')) return t('saasRecent.todayTime', { time: visit.format('HH:mm') })
    if (visit.isSame(today.subtract(1, 'day'), 'day')) return t('saasRecent.yesterdayTime', { time: visit.format('HH:mm') })
    return visit.format('MM-DD HH:mm')
  }
  const history = computed(() => {
    void recentVisitsRevision.value
    const granted = getSaasGrantedMenus()
    try { return readRecentVisits(localStorage, recentVisitStorageKey())
      .filter(row => granted.has(row.ownerCode) && !!menu.getMenu(row.menuCode)).slice(0, 6) }
    catch { return [] }
  })
  const isStarting = computed(() => history.value.length === 0)
  const rows = computed<RecentEntry[]>(() => {
    const recent = history.value.map(row => {
      const current = menu.getMenu(row.menuCode)
      const leaf = presentation(row.menuCode), owner = presentation(row.ownerCode)
      const title = leaf?.title || t(String(current?.title || row.title || row.menuCode))
      // 隐藏详情路由沿用所属菜单的层级和图标，再追加当前详情页名称。
      const path = leaf?.path || [...(owner?.path || []), title]
      return { id: row.id, title, fullPath: path.join(' › '),
        description: `${path[0]} · ${visitTime(row.visitedAt)}`,
        icon: leaf?.icon || owner?.icon || 'FileOutlined', target: row.target }
    })
    const granted = getSaasGrantedMenus()
    const defaults = starts.flatMap(item => {
      // 同一入口已有真实访问时，不再展示默认副本；兼容菜单的别名编码。
      const code = item.target.menus.find(value => granted.has(value) && !!menu.getMenu(value))
      if (!code) return []
      const routeName = menu.getMenu(code)?.routeName || code
      if (history.value.some(row => item.target.menus.includes(row.menuCode)
        || (menu.getMenu(row.menuCode)?.routeName || row.menuCode) === routeName)) return []
      const current = presentation(code)
      const title = current?.title || t(`saasRecent.start.${item.id}`)
      const group = current?.path[0] || t(`saasRecent.group.${item.id}`)
      return [{ ...item, target: { ...item.target, menus: [code] },
        title, description: group, icon: current?.icon || item.icon,
        fullPath: current?.path.join(' › ') || `${group} › ${title}`,
      }]
    })
    return [...recent, ...defaults].slice(0, 6)
  })
  function open(target: HomeTarget) {
    const code = target.menus.find(value => !!menu.getMenu(value))
    if (code) menu.jumpPage(code, { params: target.params, query: target.query })
  }
  return { rows, isStarting, open }
}
