import { computed, onActivated, onDeactivated, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import { getProjectCodeFromLocation } from '@jetlinks-web-core/utils/project-runtime'
import { getRequestBaseApi } from '@jetlinks-web-core/utils/request-context'
import { useUserStore } from '@jetlinks-web-core/store/user'
import { getOverviewOrganization } from '../../../api/projectSummary'
import { getSaasOverviewAccess } from '../../../visDashboard/Base/Saas/services/access'
import { useHomeRuntime } from '../../../visDashboard/Base/shared/useHomeRuntime'
import { recordOf, textOf } from '../../../visDashboard/Base/shared/apiResult'
import { useSaasWelcome } from '../../../visDashboard/Base/Saas/useSaasWelcome'
import type { SaasUserSummary } from '../../../visDashboard/Base/Saas/components/presentation'

/** 用户身份复用当前会话；组织树独立读取，切换账号/项目及离页后丢弃旧请求。 */
export function useSaasSummary() {
  const route = useRoute()
  const user = useUserStore()
  const { t } = useI18n()
  const contextRevision = ref(0)
  const active = ref(true)
  const organization = ref<string>()
  const loading = ref(false)
  const error = ref(false)
  const scope = computed(() => {
    contextRevision.value
    route.fullPath
    return JSON.stringify([user.userInfo.id, getProjectCodeFromLocation(), getRequestBaseApi()])
  })
  let sequence = 0
  let controller: AbortController | undefined
  const enabled = computed(() => getSaasOverviewAccess().showResources)
  const runtime = useHomeRuntime('SaasResources', ref(false), ref(60), undefined, undefined, enabled)
  const welcome = useSaasWelcome(() => textOf(user.userInfo.name).trim() || textOf(user.userInfo.username).trim())
  const summary = computed<SaasUserSummary>(() => {
    // 保留接口角色顺序，多角色只展示首个名称与已分配总数。
    const roles = user.userInfo.roleList || []
    const firstRole = textOf(recordOf(roles[0]).name).trim()
    const role = firstRole && roles.length > 1
      ? t('packages.ProjectHome.saasRoleCount', { name: firstRole, count: roles.length }) : firstRole
    // 个人中心的超级管理员来自类型名；无角色时显示同一身份标签，排除主/子账号标签。
    const accountType = t(user.userInfo.type?.id === 'subAccount'
      ? 'components.LayoutSidebarUser.subAccount' : 'components.LayoutSidebarUser.mainAccount')
    const userType = textOf(user.userInfo.type?.name).trim()
    const identity = role || (userType !== accountType ? userType : '')
    // 此时间会在登录成功后更新，只称为“最近登录”；地点按当前展示要求固定为重庆。
    const loginTime = user.userInfo.loginInfo?.loginTime
    const recentLogin = typeof loginTime === 'number' && Number.isFinite(loginTime) && loginTime > 0 && dayjs(loginTime).isValid()
      ? t('packages.ProjectHome.saasRecentLogin', { time: dayjs(loginTime).format('YYYY-MM-DD HH:mm') }) : ''
    return {
      welcome: welcome.value,
      details: [organization.value, identity, recentLogin].filter((item): item is string => !!item),
      updatedAt: runtime.updatedAt.value ? dayjs(runtime.updatedAt.value).format('YYYY-MM-DD HH:mm') : undefined,
    }
  })
  /** 组织不可见或请求失败时省略该项，不能用缓存中的其他项目组织补位。 */
  async function reload() {
    controller?.abort()
    const current = ++sequence
    const currentScope = scope.value
    if (!active.value || !user.userInfo.id) return
    controller = new AbortController()
    loading.value = true
    error.value = false
    try {
      const name = await getOverviewOrganization(controller.signal)
      if (current !== sequence || currentScope !== scope.value) return
      organization.value = name
    } catch {
      if (current === sequence && currentScope === scope.value) {
        organization.value = undefined
        error.value = true
      }
    } finally {
      if (current === sequence) loading.value = false
    }
  }
  const invalidate = () => {
    sequence++
    controller?.abort()
    loading.value = false
  }
  const refreshContext = () => { contextRevision.value++ }
  watch([scope, active], () => {
    invalidate()
    organization.value = undefined
    error.value = false
    if (active.value) void reload()
  }, { immediate: true, flush: 'sync' })
  onMounted(() => window.addEventListener('storage', refreshContext))
  onActivated(() => {
    refreshContext()
    active.value = true
  })
  onDeactivated(() => { active.value = false })
  onUnmounted(() => {
    invalidate()
    window.removeEventListener('storage', refreshContext)
  })
  return { summary, loading, error, reload }
}
