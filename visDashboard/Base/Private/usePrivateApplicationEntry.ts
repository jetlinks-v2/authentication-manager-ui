import { computed, onScopeDispose, ref, watch, type Ref } from 'vue'
import dayjs from 'dayjs'
import { useAuthStore } from '@jetlinks-web-core/store/auth'
import { useBusinessApplicationStore } from '@jetlinks-web-core/store/businessApplication'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { useUserStore } from '@jetlinks-web-core/store/user'
import { applicationAvatar } from '../../../views/application-center/ProjectApplication/applicationModel'
import type { PrivateOverviewAccess } from './services/access'
import type { PrivateAccountProfile, PrivateApplicationEntry } from './types'

type EntryMode = 'checking' | 'normal' | 'applications' | 'error'

/** 没有项目功能权限时确认应用角色；SaaS 与私有化共用个人授权应用名单和切换流程。 */
export function usePrivateApplicationEntry(access: Readonly<Ref<PrivateOverviewAccess | boolean>>, ready: Readonly<Ref<boolean>>, scope: Readonly<Ref<string>>, options: { refreshOnEntry?: boolean } = {}) {
  const auth = useAuthStore(), applicationsStore = useBusinessApplicationStore()
  const menu = useMenuStore(), user = useUserStore()
  const mode = ref<EntryMode>('checking')
  const applicationsLoading = ref(false), applicationsError = ref(false)
  const openingId = ref<string>()
  const revision = ref(0)
  const hasProjectAccess = computed(() => typeof access.value === 'boolean' ? access.value : Object.values(access.value).some(Boolean))
  const validatedScope = ref<string>()
  let sequence = 0
  let requestedScope = ''

  // 切换身份、项目或授权时，迟到的角色与应用结果不能覆盖当前视图。
  watch([ready, scope, hasProjectAccess, () => user.userInfo.id, () => user.isAdmin, revision], async ([isReady, currentScope, hasAccess, userId, isAdmin], _old, onCleanup) => {
    const current = ++sequence
    onCleanup(() => { sequence++ })
    applicationsError.value = false
    applicationsLoading.value = false
    openingId.value = undefined
    validatedScope.value = undefined
    if (!isReady || !userId) { mode.value = 'checking'; return }
    if (hasAccess || isAdmin) { mode.value = 'normal'; return }
    mode.value = 'checking'
    try {
      const isApplicationOnly = await auth.hasOnlyApplicationRoles()
      if (current !== sequence) return
      if (!isApplicationOnly) { mode.value = 'normal'; return }
      mode.value = 'applications'
      applicationsLoading.value = true
      try {
        const scopeChanged = !!requestedScope && requestedScope !== currentScope
        requestedScope = currentScope
        if (scopeChanged || options.refreshOnEntry) await applicationsStore.refreshApplications()
        else await applicationsStore.initialize()
        if (current !== sequence) return
        applicationsError.value = !applicationsStore.scopeSupported
        if (!applicationsError.value) validatedScope.value = currentScope
      } catch {
        if (current === sequence) applicationsError.value = true
      } finally {
        if (current === sequence) applicationsLoading.value = false
      }
    } catch {
      if (current === sequence) mode.value = 'error'
    }
  }, { immediate: true, flush: 'sync' })
  onScopeDispose(() => { sequence++; validatedScope.value = undefined })

  const currentScopeReady = computed(() => mode.value === 'applications' && validatedScope.value === scope.value
    && !applicationsLoading.value && !applicationsError.value)
  const entries = computed<PrivateApplicationEntry[]>(() => !currentScopeReady.value ? [] : applicationsStore.applications
    .filter(item => item.runtimeType !== 'project')
    .map(item => {
      const name = typeof item.name === 'string' && item.name.trim() ? item.name : item.id
      return { id: item.id, name, description: item.description || '',
        avatar: applicationAvatar({ ...item, name }), disabled: (typeof item.state === 'object' ? item.state?.value : item.state) === 'disabled' }
    }))

  const names = (values: unknown[] = []) => values.flatMap(value => {
    if (!value || typeof value !== 'object' || !('name' in value)) return []
    return typeof value.name === 'string' && value.name.trim() ? [value.name.trim()] : []
  })
  const profile = computed<PrivateAccountProfile>(() => {
    const info = user.userInfo
    const time = Number(info.loginInfo?.loginTime)
    const date = dayjs(time)
    return { name: info.name || info.username || '—', username: info.username || '—',
      avatar: (info as { avatar?: string }).avatar, roles: [...new Set(names(info.roleList))],
      organizations: [...new Set(names(info.orgList))],
      latestLogin: Number.isFinite(time) && time > 0 && date.isValid() ? date.format('YYYY-MM-DD HH:mm:ss') : undefined }
  })

  /** 切换沿用应用切换器的菜单预检与目标作用域处理。 */
  async function openApplication(id: string) {
    const entry = entries.value.find(item => item.id === id)
    if (!entry || entry.disabled || openingId.value || applicationsLoading.value || applicationsError.value) return
    const current = sequence
    openingId.value = id
    try { await applicationsStore.switchApplication(id) }
    finally { if (current === sequence && openingId.value === id) openingId.value = undefined }
  }
  /** 个人中心沿用布局侧栏相同的路由与页签参数。 */
  function openAccount() {
    void menu.routerPush('account/center', { params: { tabKey: 'BindThirdAccount' }, query: { tab: 'BasicInfo' } })
  }
  const canOpenAll = computed(() => currentScopeReady.value && menu.hasMenu('application-center/ProjectApplication'))
  /** 完整名单只跳转已授权的应用管理入口，不把个人应用权限当成管理权限。 */
  function openAll() {
    if (canOpenAll.value) void menu.jumpPage('application-center/ProjectApplication')
  }
  async function retry() {
    if (!ready.value || !['applications', 'error'].includes(mode.value)) return
    if (mode.value === 'error') { revision.value++; return }
    validatedScope.value = undefined
    applicationsLoading.value = true
    applicationsError.value = false
    const current = sequence
    try {
      await applicationsStore.refreshApplications()
      if (current === sequence) {
        applicationsError.value = !applicationsStore.scopeSupported
        if (!applicationsError.value) validatedScope.value = scope.value
      }
    } catch {
      if (current === sequence) applicationsError.value = true
    } finally {
      if (current === sequence) applicationsLoading.value = false
    }
  }
  return { mode, entries, profile, applicationsLoading, applicationsError, openingId, openApplication, openAccount, canOpenAll, openAll, retry }
}
