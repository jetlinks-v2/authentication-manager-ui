import type { Router, RouteLocationNormalizedLoaded, RouteLocationNormalized } from 'vue-router'
import { shallowRef } from 'vue'
import md5 from 'crypto-js/md5'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { useUserStore } from '@jetlinks-web-core/store/user'
import { getProjectCodeFromLocation, getApplicationRuntimeEntry } from '@jetlinks-web-core/utils/project-runtime'
import { getBaseApi } from '@jetlinks-web-core/utils/request-context'
import { getSaasGrantedMenus } from './access'
import type { HomeTarget } from '../../shared/types'

export interface RecentVisit {
  id: string
  menuCode: string
  ownerCode: string
  title: string
  visitedAt: number
  target: HomeTarget
}

const maximum = 18
const queryKeys = new Set(['type', 'tab', 'tabKey', 'id', 'gatewayId', 'deviceId', 'productId', 'perspective'])
const recorders = new WeakMap<Router, () => void>()
export const recentVisitsRevision = shallowRef(0)

/** 浏览历史只记录当前账号/项目/API范围内的页面，不保存令牌、任意查询串或业务数据。 */
export function recentVisitStorageKey(): string {
  const identity = [useUserStore().userInfo.id || '', getProjectCodeFromLocation(), getBaseApi(), getApplicationRuntimeEntry().applicationId || '']
  return `saas-recent:v1:${md5(JSON.stringify(identity)).toString()}`
}

/** 受控读取本地记录；损坏、跨版本或非法记录不进入最近访问。 */
export function readRecentVisits(storage: Pick<Storage, 'getItem'>, key: string): RecentVisit[] {
  try {
    const rows: unknown = JSON.parse(storage.getItem(key) || '[]')
    if (!Array.isArray(rows)) return []
    return rows.filter((row): row is RecentVisit => !!row && typeof row.id === 'string'
      && typeof row.menuCode === 'string' && typeof row.ownerCode === 'string'
      && typeof row.title === 'string' && Number.isFinite(row.visitedAt)
      && Array.isArray(row.target?.menus) && row.target.menus.length === 1
      && row.target.menus[0] === row.menuCode).slice(0, maximum)
  } catch { return [] }
}

/** 仅记录成功访问且当前授权可到达的页面；保存/创建页不成为日常回访入口。 */
export function visitFromRoute(route: RouteLocationNormalized | RouteLocationNormalizedLoaded,
  granted: ReadonlySet<string>, now = Date.now()): RecentVisit | undefined {
  const code = typeof route.name === 'string' ? route.name : ''
  if (!code || code === 'project/Overview' || /\/(Save|Create|Editor|Setting)(\/|$)/i.test(code)) return undefined
  const ownerCode = [...granted].sort((a, b) => b.length - a.length).find(item => code === item || code.startsWith(`${item}/`))
  if (!ownerCode) return undefined
  const params = Object.fromEntries(Object.entries(route.params).filter(([, value]) => typeof value === 'string')) as Record<string, string>
  const query = Object.fromEntries(Object.entries(route.query).filter(([key, value]) => queryKeys.has(key) && typeof value === 'string')) as Record<string, string>
  return { id: JSON.stringify([code, params, query]), menuCode: code, ownerCode,
    title: String(route.meta.title || ''), visitedAt: now, target: { menus: [code], params, query } }
}

/** 应用级监听在首次进入概览时安装一次，离开概览后继续记录；HMR会卸载旧监听。 */
export function ensureRecentVisitRecorder(router: Router) {
  if (recorders.has(router)) return
  const remove = router.afterEach((to, _from, failure) => {
    if (failure || !useUserStore().userInfo.id) return
    const visit = visitFromRoute(to, getSaasGrantedMenus())
    if (!visit || !useMenuStore().getMenu(visit.menuCode)) return
    try {
      const key = recentVisitStorageKey()
      const rows = readRecentVisits(localStorage, key).filter(item => item.id !== visit.id)
      localStorage.setItem(key, JSON.stringify([visit, ...rows].slice(0, maximum)))
      recentVisitsRevision.value += 1
    } catch { /* 浏览器禁用存储时，概览仍提供已授权起点页。 */ }
  })
  recorders.set(router, remove)
  if (import.meta.hot) import.meta.hot.dispose(() => { remove(); recorders.delete(router) })
}
