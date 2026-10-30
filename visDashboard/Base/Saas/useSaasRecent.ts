import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { getSaasGrantedMenus, hasSaasTarget } from './services/access'
import { HOME_TARGETS } from '../shared/navigation'
import type { HomeTarget } from '../shared/types'
import { ensureRecentVisitRecorder, readRecentVisits, recentVisitsRevision, recentVisitStorageKey } from './services/recentVisits'

interface RecentEntry { id: string; title: string; description: string; icon: string; target: HomeTarget }
const starts: { id: string; icon: string; target: HomeTarget }[] = [
  { id: 'dashboard', icon: 'DashboardOutlined', target: { menus: ['resources/Dashboard'] } },
  { id: 'devices', icon: 'UnorderedListOutlined', target: { ...HOME_TARGETS.devices, query: { type: 'device' } } },
  { id: 'alarms', icon: 'AlertOutlined', target: HOME_TARGETS.deviceAlarm },
  { id: 'events', icon: 'ScanOutlined', target: { menus: ['video/event'] } },
  { id: 'scenes', icon: 'ApartmentOutlined', target: HOME_TARGETS.scene },
  { id: 'login', icon: 'KeyOutlined', target: { menus: ['system/ThirdPartyLogin'] } },
]

/** 最近访问来自本机成功路由记录；首次访问以授权菜单起点填充，不伪造访问时间。 */
export function useSaasRecent() {
  const router = useRouter(), menu = useMenuStore()
  const { t } = useI18n()
  ensureRecentVisitRecorder(router)
  const history = computed(() => {
    void recentVisitsRevision.value
    const granted = getSaasGrantedMenus()
    try { return readRecentVisits(localStorage, recentVisitStorageKey())
      .filter(row => granted.has(row.ownerCode) && !!menu.getMenu(row.menuCode)).slice(0, 6) }
    catch { return [] }
  })
  const isStarting = computed(() => history.value.length === 0)
  const rows = computed<RecentEntry[]>(() => {
    if (!isStarting.value) return history.value.map(row => {
      const current = menu.getMenu(row.menuCode)
      return { id: row.id, title: row.title || String(current?.name || row.menuCode),
        description: dayjs(row.visitedAt).format('MM-DD HH:mm'), icon: 'HistoryOutlined', target: row.target }
    })
    const granted = getSaasGrantedMenus()
    return starts.filter(item => hasSaasTarget(granted, item.target)).map(item => ({ ...item,
      title: t(`saasRecent.start.${item.id}`), description: t(`saasRecent.group.${item.id}`),
    }))
  })
  function open(target: HomeTarget) {
    const code = target.menus.find(value => !!menu.getMenu(value))
    if (code) menu.jumpPage(code, { params: target.params, query: target.query })
  }
  return { rows, isStarting, open }
}
