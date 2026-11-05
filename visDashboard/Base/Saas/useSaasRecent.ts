import { computed, onActivated, onDeactivated, ref, shallowRef, watch } from 'vue'
import { useRouter, type RouteRecordRaw } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useNow } from '@vueuse/core'
import dayjs from 'dayjs'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { getSaasGrantedMenus } from './services/access'
import { HOME_TARGETS } from '../shared/navigation'
import type { HomeTarget } from '../shared/types'
import { cacheRecentVisitNames, ensureRecentVisitRecorder, readRecentVisits, recentVisitsRevision, recentVisitStorageKey } from './services/recentVisits'
import { loadRecentVisitNames } from './services/recentVisitResources'
import { resourceFromRecentVisit } from './services/recentVisitIdentity'
import { useRecentVisitNavigation, type RecentVisitLink } from './useRecentVisitNavigation'

interface RecentEntry extends RecentVisitLink { title: string; loadingTitle: boolean; description: string; icon: string; fullPath: string }
interface MenuPresentation { title: string; path: string[]; icon?: string }
interface RecentStart { id: string; icon: string; target: HomeTarget; status?: 'online' | 'offline' }
const starts: RecentStart[] = [
  { id: 'dashboard', icon: 'DashboardOutlined', target: { menus: ['resources/Dashboard'] } },
  { id: 'devices', icon: 'UnorderedListOutlined', target: HOME_TARGETS.devices },
  { id: 'alarms', icon: 'AlertOutlined', target: HOME_TARGETS.deviceAlarm },
  { id: 'events', icon: 'ScanOutlined', target: { menus: ['video/event'] } },
  { id: 'scenes', icon: 'ApartmentOutlined', target: HOME_TARGETS.scene },
  { id: 'login', icon: 'KeyOutlined', target: { menus: ['system/ThirdPartyLogin'] } },
]
// 设备运维可从产品与设备状态直接开始；两个状态入口复用统一设备列表的正式筛选参数。
const privateStarts: RecentStart[] = [
  { id: 'video', icon: 'VideoCameraOutlined', target: { menus: ['video/resources', 'media/Device'] } },
  { id: 'visionAlarm', icon: 'AlertOutlined', target: HOME_TARGETS.visionAlarm },
  { id: 'alarmDashboard', icon: 'DashboardOutlined', target: { menus: ['rule-engine/DashBoard'] } },
  { id: 'videoLive', icon: 'VideoCameraOutlined', target: { menus: ['video/live'] } },
  { id: 'visionTask', icon: 'PlayCircleOutlined', target: { menus: ['machine-vision/Task'] } },
  { id: 'products', icon: 'AppstoreOutlined', target: { menus: ['device/Product'] } },
  ...(['offline', 'online'] as const).map(status => ({
    id: `${status}Devices`, icon: 'UnorderedListOutlined', status,
    target: { ...HOME_TARGETS.devices, query: { status } },
  })),
]

/** 真实访问优先，剩余位置用未重复的授权默认入口补齐，不伪造访问时间。 */
export function useSaasRecent(variant?: 'private') {
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
    try { return readRecentVisits(localStorage, recentVisitStorageKey(), code => String(menu.getMenu(code)?.routeName || code))
      .filter(row => granted.has(row.ownerCode) && !!menu.getMenu(row.menuCode)) }
    catch { return [] }
  })
  const resources = computed(() => history.value.flatMap(row => {
    const resource = resourceFromRecentVisit(row, menu.getMenu(row.menuCode)?.routeName || row.menuCode)
    return resource ? [resource] : []
  }))
  const resourceNames = shallowRef<ReadonlyMap<string, string>>(new Map())
  const unavailableVisits = shallowRef<ReadonlySet<string>>(new Set())
  const resourceNamesLoading = ref(false)
  const active = ref(true)
  const { open, openingId } = useRecentVisitNavigation(active)
  let resourceNamesScope = ''
  watch(() => ({ scope: recentVisitStorageKey(), resources: resources.value, active: active.value }), async ({ scope, resources, active: isActive }, _old, onCleanup) => {
    let current = true
    onCleanup(() => { current = false })
    if (scope !== resourceNamesScope || !resources.length) {
      resourceNames.value = new Map()
      unavailableVisits.value = new Set()
      resourceNamesScope = scope
    }
    resourceNamesLoading.value = isActive && resources.length > 0
    if (!resourceNamesLoading.value) return
    try {
      const result = await loadRecentVisitNames(resources)
      if (current && active.value && scope === recentVisitStorageKey()) {
        resourceNames.value = result.names
        unavailableVisits.value = result.unavailable
        try {
          cacheRecentVisitNames(localStorage, scope, result.names, code => String(menu.getMenu(code)?.routeName || code))
        } catch { /* 存储不可用不影响本次名称展示，也不清空已知名称。 */ }
      }
    } catch { /* 查询失败保留已知名称；首次无快照时以设备 ID 展示，不把菜单标题当成设备名称。 */ }
    finally { if (current) resourceNamesLoading.value = false }
  }, { immediate: true, flush: 'sync' })
  // 首次挂载已由 immediate 查询；缓存页面返回时才再次刷新，离页期间不补查名称。
  onActivated(() => { active.value = true })
  onDeactivated(() => { active.value = false })
  // 先校验保留的历史，再取六项；失效记录不占位置，权限恢复后下次查询可重新显示。
  const visibleHistory = computed(() => history.value.filter(row => !unavailableVisits.value.has(row.id)).slice(0, 6))
  const isStarting = computed(() => visibleHistory.value.length === 0)
  const rows = computed<RecentEntry[]>(() => {
    const scope = recentVisitStorageKey()
    const recent = visibleHistory.value.map(row => {
      const current = menu.getMenu(row.menuCode)
      const leaf = presentation(row.menuCode), owner = presentation(row.ownerCode)
      const resource = resources.value.find(item => item.visitId === row.id)
      // 已知名称先显示、后台刷新；首次无快照只显示骨架，避免“设备详情 → 设备名称”闪变。
      const knownName = resourceNames.value.get(row.id) || row.resourceName?.trim()
      const loadingTitle = !!resource && !knownName && resourceNamesLoading.value
      const status = row.target.query?.status
      const deviceRoute = HOME_TARGETS.devices.menus.some(code => code === row.menuCode
        || (menu.getMenu(code)?.routeName && menu.getMenu(code)?.routeName === current?.routeName))
      const statusTitle = variant === 'private' && deviceRoute && (status === 'online' || status === 'offline')
        ? t(`saasRecent.start.${status}Devices`) : undefined
      const title = resource ? knownName || resource.id : statusTitle || leaf?.title || t(String(current?.title || row.title || row.menuCode))
      // 隐藏详情路由沿用所属菜单的层级和图标，再追加当前详情页名称。
      const path = leaf ? [...leaf.path.slice(0, -1), title] : [...(owner?.path || []), title]
      const group = resource ? t(`saasRecent.resource.${resource.kind}`) : path[0]
      return { id: row.id, scope, visit: row, title, loadingTitle, fullPath: path.join(' › '),
        description: `${group} · ${visitTime(row.visitedAt)}`,
        icon: leaf?.icon || owner?.icon || 'FileOutlined', target: row.target }
    })
    const granted = getSaasGrantedMenus()
    const defaultRoutes = new Set<string>()
    const defaults = [...starts, ...(variant === 'private' ? privateStarts : [])].flatMap(item => {
      // 同一入口已有真实访问时，不再展示默认副本；兼容菜单的别名编码。
      const code = item.target.menus.find(value => granted.has(value) && !!menu.getMenu(value))
      if (!code) return []
      const routeName = menu.getMenu(code)?.routeName || code
      if (visibleHistory.value.some(row => {
        const sameRoute = item.target.menus.includes(row.menuCode)
          || (menu.getMenu(row.menuCode)?.routeName || row.menuCode) === routeName
        if (!sameRoute) return false
        if (item.status) return row.target.query?.status === item.status
        if (variant === 'private' && item.id === 'devices') return !['online', 'offline'].includes(String(row.target.query?.status))
        return true
      })) return []
      // 菜单别名可能指向同一页面；状态筛选入口则保留各自的语义。
      const identity = JSON.stringify([routeName, item.status || ''])
      if (defaultRoutes.has(identity)) return []
      defaultRoutes.add(identity)
      const current = presentation(code)
      const title = item.status ? t(`saasRecent.start.${item.id}`) : current?.title || t(`saasRecent.start.${item.id}`)
      const group = current?.path[0] || t(`saasRecent.group.${item.id}`)
      return [{ ...item, scope, loadingTitle: false, target: { ...item.target, menus: [code] },
        title, description: group, icon: current?.icon || item.icon,
        fullPath: current?.path.join(' › ') || `${group} › ${title}`,
      }]
    })
    return [...recent, ...defaults].slice(0, 6)
  })
  return { rows, isStarting, open, openingId }
}
