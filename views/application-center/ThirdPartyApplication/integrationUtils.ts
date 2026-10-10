import dayjs from 'dayjs'
import type { EnumState, ProjectIntegration } from '@authentication-manager-ui/api/application-center/thirdPartyIntegration'

export const integrationState = (state: EnumState) => typeof state === 'object' ? state.value : state
export const integrationStateLabel = (record: ProjectIntegration, t: (key: string) => string) =>
  typeof record.state === 'object' && record.state.text
    ? record.state.text : t('ThirdPartyApplication.project.state.' + integrationState(record.state))
export const formatTime = (value?: number) => value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'
export const reasonValid = (value: string) => !!value.trim() && value.trim().length <= 512 && !/[\r\n]/.test(value)
export const integrationError = (error: unknown, t: (key: string) => string) => {
  const value = error as { response?: { data?: { message?: string; code?: string } }; message?: string }
  const message = value?.response?.data?.message || value?.message || ''
  const code = value?.response?.data?.code || ''
  for (const id of ['authorization_conflict', 'authorization_context_mismatch', 'authorization_invalid',
    'state_conflict', 'active_exists', 'application_not_approved', 'environment_not_admitted',
    'environment_not_configured', 'runtime_required', 'runtime_unavailable', 'application_not_bound', 'not_found']) {
    if (message.includes(id) || code.includes(id)) return t('ThirdPartyApplication.project.error.' + id)
  }
  if (message.startsWith('ThirdPartyApplication.')) return t(message)
  return message || t('ThirdPartyApplication.project.requestError')
}
