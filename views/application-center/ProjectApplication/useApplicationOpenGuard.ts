import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { prepareApplicationAccess } from '@jetlinks-web-core/utils/application-access'
import { getApplicationAccessContext } from '@jetlinks-web-core/utils/request-context'
import { getBusinessApplicationExternalUrl } from '../../../api/application-center/businessApplication'
import { isHttpExternalApplicationUrl } from './applicationConfiguration'
import {
  ensureBusinessApplicationMembership,
  hasOwnBusinessApplicationMenu,
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

  const openPreparedApplication = async (application: ProjectApplication, externalWindow?: Window | null) => {
    if (application.openMode === 'external') {
      if (!externalWindow || externalWindow.closed) return false
      const response = await getBusinessApplicationExternalUrl(application.id)
      const url = response.result?.url
      // 后端地址仍需在浏览器边界校验，避免不可信配置触发 javascript: 等协议。
      if (!isHttpExternalApplicationUrl(url)) {
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
    externalWindow?: Window | null,
  ) => {
    const changed = await ensureBusinessApplicationMembership(application.id)
    if (application.openMode !== 'external' && !await hasOwnBusinessApplicationMenu(application.id)) {
      onlyMessage($t('ProjectApplication.access.notConfigured', { name: application.name }), 'warning')
      return false
    }
    const opened = await openPreparedApplication(application, externalWindow)
    if (opened) void syncChangedDetail(application.id, changed).catch(() => undefined)
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
      opened = await requestApplicationAccess(application, externalWindow)
      return opened
    } finally {
      if (!opened) externalWindow?.close()
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

  return {
    openingApplicationIds,
    openApplication,
  }
}
