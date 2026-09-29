import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useUserStore } from '@jetlinks-web-core/store/user'
import { prepareApplicationAccess } from '@jetlinks-web-core/utils/application-access'
import { getApplicationAccessContext } from '@jetlinks-web-core/utils/request-context'
import { getBusinessApplicationExternalUrl } from '../../../api/application-center/businessApplication'
import {
  bindSelectedBusinessApplicationRole,
  ensureBusinessApplicationMembership,
  ensureBusinessApplicationOpenAccess,
} from './applicationAccessService'
import type { ApplicationRoleSelection } from './applicationAccessService'
import type { ApplicationRole, ProjectApplication } from './types'

interface ApplicationOpenGuardOptions {
  syncDetail?: (applicationId: string) => void | Promise<void>
}

interface PendingRoleBinding {
  userId: string
  selection: ApplicationRoleSelection
}

export const useApplicationOpenGuard = (options: ApplicationOpenGuardOptions = {}) => {
  const { t: $t } = useI18n()
  const userStore = useUserStore()
  const roleSelectOpen = ref(false)
  const roleSelectRoles = ref<ApplicationRole[]>([])
  const pendingApplication = ref<ProjectApplication>()
  const pendingRoleBinding = ref<PendingRoleBinding>()
  const openingApplicationIds = ref<string[]>([])
  const roleBinding = ref(false)

  const resolveCurrentUserId = async () => {
    if (userStore.userInfo.id) return String(userStore.userInfo.id)
    await userStore.getUserInfo()
    return userStore.userInfo.id ? String(userStore.userInfo.id) : ''
  }

  const syncChangedDetail = async (applicationId: string, changed: boolean) => {
    if (changed) await options.syncDetail?.(applicationId)
  }

  const setOpening = (applicationId: string, opening: boolean) => {
    openingApplicationIds.value = opening
      ? [...new Set([...openingApplicationIds.value, applicationId])]
      : openingApplicationIds.value.filter(id => id !== applicationId)
  }

  const resetRoleSelection = () => {
    roleSelectOpen.value = false
    roleSelectRoles.value = []
    pendingApplication.value = undefined
    pendingRoleBinding.value = undefined
  }

  const openPreparedApplication = async (application: ProjectApplication, externalWindow?: Window | null) => {
    if (application.openMode === 'external') {
      if (!externalWindow || externalWindow.closed) return false
      const response = await getBusinessApplicationExternalUrl(application.id)
      const url = response.result?.url
      if (!url) {
        onlyMessage($t('ProjectApplication.detail.accessFailed'), 'warning')
        return false
      }
      externalWindow.location.replace(url)
      return true
    }

    const access = prepareApplicationAccess({
      applicationId: application.id,
      applicationName: application.name,
      domain: application.domain,
      accessContext: getApplicationAccessContext(),
    })

    if (!access.success) {
      onlyMessage($t('ProjectApplication.detail.accessFailed'), 'warning')
      return false
    }
    window.open(access.url, '_blank', 'noopener,noreferrer')
    return true
  }

  const requestApplicationAccess = async (
    application: ProjectApplication,
    selectedRoleId?: string,
    externalWindow?: Window | null,
  ) => {
    const userId = await resolveCurrentUserId()
    if (!userId) {
      onlyMessage($t('ProjectApplication.access.noCurrentUser'), 'warning')
      return false
    }

    // admin 无需应用成员或角色准入，直接复用登录上下文打开应用。
    if (userStore.isAdmin) return openPreparedApplication(application, externalWindow)

    const result = await ensureBusinessApplicationOpenAccess(application.id, userId, selectedRoleId)

    if (result.type === 'select-role') {
      pendingApplication.value = application
      pendingRoleBinding.value = {
        userId,
        selection: result.selection,
      }
      roleSelectRoles.value = result.roles
      roleSelectOpen.value = true
      return false
    }
    if (result.type === 'missing-role') {
      onlyMessage($t('ProjectApplication.access.noRole'), 'warning')
      return false
    }
    if (result.type === 'missing-user') {
      onlyMessage($t('ProjectApplication.access.noCurrentUser'), 'warning')
      return false
    }

    const opened = await openPreparedApplication(application, externalWindow)
    if (opened) void syncChangedDetail(application.id, result.changed).catch(() => undefined)
    return opened
  }

  const openApplication = async (application: ProjectApplication) => {
    if (openingApplicationIds.value.includes(application.id)) return false
    if (application.openMode === 'external' && !application.externalUrl) {
      onlyMessage($t('ProjectApplication.settings.externalUrlRequired'), 'warning')
      return false
    }
    // 在点击事件中预留窗口，避免异步准入和外链地址请求触发浏览器弹窗拦截。
    const externalWindow = reserveExternalWindow(application)
    if (application.openMode === 'external' && !externalWindow) return false
    let opened = false
    setOpening(application.id, true)
    try {
      opened = await requestApplicationAccess(application, undefined, externalWindow)
      return opened
    } finally {
      if (!opened) externalWindow?.close()
      setOpening(application.id, false)
    }
  }

  const confirmSelectedRole = async (roleId: string) => {
    if (!pendingApplication.value || !pendingRoleBinding.value) return
    const application = pendingApplication.value
    const roleBindingContext = pendingRoleBinding.value
    const externalWindow = reserveExternalWindow(application)
    if (application.openMode === 'external' && !externalWindow) return false
    let opened = false
    roleBinding.value = true
    setOpening(application.id, true)
    try {
      // 防止角色弹窗打开后登录身份变为 admin，继续提交角色绑定。
      if (userStore.isAdmin) {
        resetRoleSelection()
        opened = await openPreparedApplication(application, externalWindow)
        return opened
      }
      await bindSelectedBusinessApplicationRole(
        application.id,
        roleBindingContext.userId,
        roleId,
        roleBindingContext.selection,
      )
      opened = await openPreparedApplication(application, externalWindow)
      if (opened) {
        resetRoleSelection()
        void syncChangedDetail(application.id, true).catch(() => undefined)
      }
    } finally {
      if (!opened) externalWindow?.close()
      roleBinding.value = false
      setOpening(application.id, false)
    }
  }

  /** 外部站点不保留对 Runtime 窗口的 opener 引用。 */
  const reserveExternalWindow = (application: ProjectApplication) => {
    if (application.openMode !== 'external') return undefined
    const externalWindow = window.open('about:blank', '_blank')
    if (externalWindow) externalWindow.opener = null
    else onlyMessage($t('ProjectApplication.detail.accessFailed'), 'warning')
    return externalWindow
  }

  const ensureCurrentUserBound = async (applicationId: string, roles: ApplicationRole[] = []) => {
    const userId = await resolveCurrentUserId()
    if (!userId) {
      onlyMessage($t('ProjectApplication.access.noCurrentUser'), 'warning')
      return false
    }
    const changed = await ensureBusinessApplicationMembership(applicationId, userId, roles)
    await syncChangedDetail(applicationId, changed)
    return true
  }

  return {
    roleSelectOpen,
    roleSelectRoles,
    pendingApplication,
    openingApplicationIds,
    roleBinding,
    openApplication,
    confirmSelectedRole,
    resetRoleSelection,
    ensureCurrentUserBound,
  }
}
