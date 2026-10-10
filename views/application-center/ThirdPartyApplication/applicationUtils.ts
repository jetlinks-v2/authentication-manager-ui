import type { ApiApplication } from '@authentication-manager-ui/api/application-center/apiApplication'
export const apiState = (application?: ApiApplication) => application?.state && typeof application.state === 'object'
  ? application.state.value : application?.state

export const applicationError = (error: unknown, t: (key: string) => string) => {
  const value = error as { response?: { data?: { message?: string } }; message?: string }
  const message = value?.response?.data?.message || value?.message || ''
  return message.startsWith('ThirdPartyApplication.') ? t(message) : message || t('ThirdPartyApplication.requestError')
}

export const responseBody = <T>(response: T | { result: T }): T => response && typeof response === 'object' && 'result' in response
  ? (response as { result: T }).result : response as T
