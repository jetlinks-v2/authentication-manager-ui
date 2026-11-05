import { onScopeDispose, ref, watch, type Ref } from 'vue'
import { isNavigationFailure, NavigationFailureType, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { HOME_TARGETS } from '../shared/navigation'
import type { HomeTarget } from '../shared/types'
import { getSaasGrantedMenus } from './services/access'
import { recentVisitStorageKey, type RecentVisit } from './services/recentVisits'
import { resourceFromRecentVisit } from './services/recentVisitIdentity'
import { loadRecentVisitNames } from './services/recentVisitResources'

export interface RecentVisitLink {
  id: string
  scope: string
  target: HomeTarget
  visit?: RecentVisit
}
type NavigationResult = 'opened' | 'unavailable' | 'cancelled' | 'failed'
type Notice = 'resourceUnavailable' | 'entryUnavailable' | 'openFailed'

/** 最近访问在点击时重新确认权限和资源；失效详情仅回退到当前仍可访问的列表。 */
export function useRecentVisitNavigation(active: Ref<boolean>) {
  const router = useRouter(), menu = useMenuStore()
  const { t } = useI18n()
  const openingId = ref<string>()
  let sequence = 0
  const invalidate = () => { sequence++; openingId.value = undefined }
  // 切换账号、项目或离开概览后，迟到的校验结果不能再跳转或显示提示。
  watch([active, () => router.currentRoute.value.fullPath, () => recentVisitStorageKey()], invalidate, { flush: 'sync' })
  onScopeDispose(invalidate)

  /** 隐藏详情沿用所属菜单的授权，菜单对象和已注册路由必须同时有效。 */
  function resolveCode(target: HomeTarget, ownerCode?: string): string | undefined {
    const granted = getSaasGrantedMenus()
    if (ownerCode && !granted.has(ownerCode)) return undefined
    return target.menus.find(code => {
      const item = menu.getMenu(code)
      return !!item && (granted.has(code) || !!ownerCode)
        && router.hasRoute(item.routeName || code)
    })
  }

  /** 使用公共菜单导航保留项目上下文和兼容参数，取消导航不触发强制回退。 */
  async function navigate(target: HomeTarget, ownerCode?: string): Promise<NavigationResult> {
    const code = resolveCode(target, ownerCode)
    if (!code) return 'unavailable'
    try {
      const failure = await menu.jumpPage(code, { params: target.params, query: target.query })
      if (isNavigationFailure(failure, NavigationFailureType.cancelled | NavigationFailureType.aborted)) return 'cancelled'
      return failure && !isNavigationFailure(failure, NavigationFailureType.duplicated) ? 'failed' : 'opened'
    } catch { return 'failed' }
  }

  async function open(entry: RecentVisitLink): Promise<void> {
    const scope = recentVisitStorageKey()
    if (!active.value || openingId.value || entry.scope !== scope) return
    const currentSequence = ++sequence
    const origin = router.currentRoute.value
    const isCurrent = () => currentSequence === sequence && active.value
      && scope === recentVisitStorageKey() && router.currentRoute.value === origin
    openingId.value = entry.id
    const visit = entry.visit
    const resource = visit && resourceFromRecentVisit(visit, menu.getMenu(visit.menuCode)?.routeName || visit.menuCode)
    const owner = visit && !entry.target.menus.includes(visit.ownerCode) ? visit.ownerCode : undefined
    // 回退时丢弃详情 ID、页签和旧筛选；网关回到网关列表，普通设备回到设备列表。
    const fallback: HomeTarget | undefined = resource
      ? { menus: [...new Set([...HOME_TARGETS.devices.menus, ...(owner ? [owner] : [])])],
        query: resource.kind === 'gateway' ? HOME_TARGETS.gateway.query : HOME_TARGETS.devices.query }
      : owner ? { menus: [owner] } : undefined

    async function recover(notice: Notice) {
      if (!isCurrent()) return
      onlyMessage(t(`saasRecent.navigation.${notice}`, {
        resource: resource ? t(`saasRecent.resource.${resource.kind}`) : '',
      }), 'warning')
      if (!fallback) return
      const result = await navigate(fallback)
      if (isCurrent() && result === 'failed' && notice !== 'openFailed') {
        onlyMessage(t('saasRecent.navigation.openFailed'), 'warning')
      }
    }

    try {
      if (!resolveCode(entry.target, visit?.ownerCode)) {
        await recover('entryUnavailable')
        return
      }
      if (resource) {
        try {
          const result = await loadRecentVisitNames([resource])
          if (!isCurrent()) return
          if (result.unavailable.has(resource.visitId)) {
            await recover('resourceUnavailable')
            return
          }
        } catch {
          // 查询失败不能推断设备已删除，回到列表时保留可重试的提示。
          await recover('openFailed')
          return
        }
      }
      if (!isCurrent()) return
      const result = await navigate(entry.target, visit?.ownerCode)
      if (result === 'unavailable' || result === 'failed') {
        await recover(result === 'unavailable' ? 'entryUnavailable' : 'openFailed')
      }
    } finally {
      if (currentSequence === sequence) openingId.value = undefined
    }
  }

  return { openingId, open }
}
