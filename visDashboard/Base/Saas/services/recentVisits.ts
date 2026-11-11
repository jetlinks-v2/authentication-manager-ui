import type { Router, RouteLocationNormalizedLoaded, RouteLocationNormalized } from 'vue-router'
import { shallowRef } from 'vue'
import md5 from 'crypto-js/md5'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { useUserStore } from '@jetlinks-web-core/store/user'
import { getProjectCodeFromLocation, getApplicationRuntimeEntry } from '@jetlinks-web-core/utils/project-runtime'
import { getBaseApi } from '@jetlinks-web-core/utils/request-context'
import { getSaasGrantedMenus } from './access'
import { recentVisitIdentity, resourceFromRecentVisit } from './recentVisitIdentity'
import type { HomeTarget } from '../../shared/types'

export interface RecentVisit {
  id: string
  menuCode: string
  ownerCode: string
  title: string
  resourceName?: string
  visitedAt: number
  target: HomeTarget
}

const maximum = 18
const queryKeys = new Set(['type', 'status', 'tab', 'tabKey', 'id', 'gatewayId', 'deviceId', 'productId', 'perspective'])
const recorders = new WeakMap<Router, () => void>()
export const recentVisitsRevision = shallowRef(0)

/** 历史及名称快照按账号/项目/API隔离，不保存令牌、任意查询串或设备详情。 */
export function recentVisitStorageKey(): string {
  const identity = [useUserStore().userInfo.id || '', getProjectCodeFromLocation(), getBaseApi(), getApplicationRuntimeEntry().applicationId || '']
  return `saas-recent:v1:${md5(JSON.stringify(identity)).toString()}`
}

/** 受控读取本地记录；损坏、跨版本或非法记录不进入最近访问。 */
export function readRecentVisits(storage: Pick<Storage, 'getItem'>, key: string,
  resolveRouteName: (code: string) => string = code => code): RecentVisit[] {
  try {
    const rows: unknown = JSON.parse(storage.getItem(key) || '[]')
    if (!Array.isArray(rows)) return []
    const valid = rows.filter((row): row is RecentVisit => !!row && typeof row.id === 'string'
      && typeof row.menuCode === 'string' && typeof row.ownerCode === 'string'
      && typeof row.title === 'string' && Number.isFinite(row.visitedAt)
      && (row.resourceName === undefined || typeof row.resourceName === 'string')
      && Array.isArray(row.target?.menus) && row.target.menus.length === 1
      && row.target.menus[0] === row.menuCode)
    const seen = new Set<string>()
    return valid.sort((a, b) => b.visitedAt - a.visitedAt).filter(row => {
      const identity = recentVisitIdentity(row, resolveRouteName(row.menuCode))
      if (seen.has(identity)) return false
      seen.add(identity)
      return true
    }).slice(0, maximum)
  } catch { return [] }
}

/** 只更新现存记录的名称快照，不改变访问时间、顺序或触发新查询；实时展示由调用方更新。 */
export function cacheRecentVisitNames(storage: Pick<Storage, 'getItem' | 'setItem'>, key: string,
  names: ReadonlyMap<string, string>, resolveRouteName: (code: string) => string = code => code): void {
  if (!names.size) return
  let changed = false
  const rows = readRecentVisits(storage, key, resolveRouteName).map(visit => {
    const name = names.get(visit.id)?.trim()
    if (!name || name === visit.resourceName || !resourceFromRecentVisit(visit, resolveRouteName(visit.menuCode))) return visit
    changed = true
    return { ...visit, resourceName: name }
  })
  if (changed) storage.setItem(key, JSON.stringify(rows))
}

/** 仅记录成功访问且当前授权可到达的页面；保存/创建页不成为日常回访入口。 */
export function visitFromRoute(route: RouteLocationNormalized | RouteLocationNormalizedLoaded,
  granted: ReadonlySet<string>, now = Date.now()): RecentVisit | undefined {
  const code = typeof route.name === 'string' ? route.name : ''
  if (!code || code === 'project/Overview' || /\/(Save|Create|Editor|Setting)(\/|$)/i.test(code)) return undefined
  const ownerCode = [...granted].sort((a, b) => b.length - a.length).find(item => code === item || code.startsWith(`${item}/`))
  if (!ownerCode) return undefined
  const params = Object.fromEntries(Object.entries(route.params).filter(([, value]) => typeof value === 'string')) as Record<string, string>
  const query = Object.fromEntries(Object.entries(route.query).filter(([key, value]) => queryKeys.has(key)
    && typeof value === 'string' && (key !== 'status' || ['online', 'offline', 'disabled'].includes(value)))) as Record<string, string>
  const visit: RecentVisit = { id: '', menuCode: code, ownerCode,
    title: String(route.meta.title || ''), visitedAt: now, target: { menus: [code], params, query } }
  visit.id = recentVisitIdentity(visit)
  return visit
}

/** 应用级监听在首次进入概览时安装一次，离开概览后继续记录；HMR会卸载旧监听。 */
export function ensureRecentVisitRecorder(router: Router) {
  if (recorders.has(router)) return
  const remove = router.afterEach((to, _from, failure) => {
    if (failure || !useUserStore().userInfo.id) return
    const visit = visitFromRoute(to, getSaasGrantedMenus())
    const menu = useMenuStore()
    if (!visit || !menu.getMenu(visit.menuCode)) return
    try {
      const key = recentVisitStorageKey()
      const resolveRouteName = (code: string) => String(menu.getMenu(code)?.routeName || code)
      visit.id = recentVisitIdentity(visit, resolveRouteName(visit.menuCode))
      const previous = readRecentVisits(localStorage, key, resolveRouteName)
      const sameResource = (item: RecentVisit) => recentVisitIdentity(item, resolveRouteName(item.menuCode)) === visit.id
      // 再次访问同一资源时保留已知名称，回概览仍会批量刷新，改名不会永久使用旧快照。
      visit.resourceName = previous.find(sameResource)?.resourceName
      const rows = previous.filter(item => !sameResource(item))
      localStorage.setItem(key, JSON.stringify([visit, ...rows].slice(0, maximum)))
      recentVisitsRevision.value += 1
    } catch { /* 浏览器禁用存储时，概览仍提供已授权起点页。 */ }
  })
  recorders.set(router, remove)
  if (import.meta.hot) import.meta.hot.dispose(() => { remove(); recorders.delete(router) })
}
