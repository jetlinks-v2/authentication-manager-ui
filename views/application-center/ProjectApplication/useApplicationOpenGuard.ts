import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { hasOwnBusinessApplicationMenu } from '@jetlinks-web-core/api/system/menu'
import { prepareApplicationAccess } from '@jetlinks-web-core/utils/application-access'
import { getApplicationAccessContext } from '@jetlinks-web-core/utils/request-context'
import {
  ensureBusinessApplicationMembership,
} from './applicationAccessService'
import type { ProjectApplication } from './types'

interface ApplicationOpenGuardOptions {
  syncDetail?: (applicationId: string) => void | Promise<void>
}

export const useApplicationOpenGuard = (options: ApplicationOpenGuardOptions = {}) => {
  const { t: $t } = useI18n()
  const openingApplicationIds = ref<string[]>([])

  const syncChangedDetail = async (applicationId: string, changed: boolean) => {
    if (changed) await options.syncDetail?.(applicationId)
  }

  const setOpening = (applicationId: string, opening: boolean) => {
    openingApplicationIds.value = opening
      ? [...new Set([...openingApplicationIds.value, applicationId])]
      : openingApplicationIds.value.filter(id => id !== applicationId)
  }

  const openPreparedApplication = (application: ProjectApplication) => {
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

  const requestApplicationAccess = async (application: ProjectApplication) => {
    const changed = await ensureBusinessApplicationMembership(application.id)
    if (!await hasOwnBusinessApplicationMenu(application.id)) {
      onlyMessage($t('ProjectApplication.access.notConfigured', { name: application.name }), 'warning')
      return false
    }
    const opened = openPreparedApplication(application)
    if (opened) void syncChangedDetail(application.id, changed).catch(() => undefined)
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

  return {
    openingApplicationIds,
    openApplication,
  }
}
