import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useUserStore } from '@jetlinks-web-core/store/user'
import { prepareApplicationAccess } from '@jetlinks-web-core/utils/application-access'
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

  const openPreparedApplication = (application: ProjectApplication) => {
    const access = prepareApplicationAccess({
      applicationId: application.id,
      applicationName: application.name,
      domain: application.domain,
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
  ) => {
    const userId = await resolveCurrentUserId()
    if (!userId) {
      onlyMessage($t('ProjectApplication.access.noCurrentUser'), 'warning')
      return false
    }

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

    const opened = openPreparedApplication(application)
    if (opened) void syncChangedDetail(application.id, result.changed).catch(() => undefined)
    return opened
  }

  const openApplication = async (application: ProjectApplication) => {
    if (openingApplicationIds.value.includes(application.id)) return false
    setOpening(application.id, true)
    try {
      return await requestApplicationAccess(application)
    } finally {
      setOpening(application.id, false)
    }
  }

  const confirmSelectedRole = async (roleId: string) => {
    if (!pendingApplication.value || !pendingRoleBinding.value) return
    const application = pendingApplication.value
    const roleBindingContext = pendingRoleBinding.value
    roleBinding.value = true
    setOpening(application.id, true)
    try {
      await bindSelectedBusinessApplicationRole(
        application.id,
        roleBindingContext.userId,
        roleId,
        roleBindingContext.selection,
      )
      if (openPreparedApplication(application)) {
        resetRoleSelection()
        void syncChangedDetail(application.id, true).catch(() => undefined)
      }
    } finally {
      roleBinding.value = false
      setOpening(application.id, false)
    }
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
