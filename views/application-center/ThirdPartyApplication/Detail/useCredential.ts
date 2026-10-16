import { onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  enableCredential, queryCredentialProviders, queryCredentials,
  revealCredential, revokeCredential, rotateCredential,
} from '@authentication-manager-ui/api/application-center/applicationCredential'
import type { ApplicationCredential, CredentialProvider, CredentialSecret } from '@authentication-manager-ui/api/application-center/applicationCredential'

const resultOf = <T>(response: { result: T }): T => response.result

export const useCredential = () => {
  const { t } = useI18n()
  const providers = ref<CredentialProvider[]>([])
  const credentials = ref<ApplicationCredential[]>([])
  const secret = ref<CredentialSecret>()
  const loading = ref(false)
  const saving = ref(false)
  const error = ref(false)

  let generation = 0
  const clearSecret = () => { secret.value = undefined }
  onBeforeUnmount(() => { generation++; clearSecret(); providers.value = []; credentials.value = [] })
  const load = async (applicationId: string) => {
    clearSecret()
    const current = ++generation
    loading.value = true
    error.value = false
    try {
      const [providerResponse, credentialResponse] = await Promise.all([
        queryCredentialProviders(), queryCredentials(applicationId),
      ])
      if (current !== generation) return
      providers.value = resultOf(providerResponse) || []
      credentials.value = resultOf(credentialResponse) || []
    } catch {
      if (current !== generation) return
      error.value = true
      providers.value = []
      credentials.value = []
    } finally { if (current === generation) loading.value = false }
  }
  const run = async (action: () => Promise<CredentialSecret>, applicationId: string) => {
    if (saving.value) return
    clearSecret()
    const current = generation
    saving.value = true
    try {
      const value = await action()
      if (current !== generation) return
      secret.value = value
      onlyMessage(t('ThirdPartyApplication.credential.saved'))
      const response = await queryCredentials(applicationId)
      if (current !== generation) return
      credentials.value = resultOf(response) || []
    } finally { if (current === generation) saving.value = false }
  }
  const enable = (applicationId: string, type: string, configuration: Record<string, unknown>) =>
    run(() => enableCredential(applicationId, type, configuration), applicationId)
  const reveal = (applicationId: string, type: string) =>
    run(() => revealCredential(applicationId, type), applicationId)
  const rotate = (applicationId: string, type: string) =>
    run(() => rotateCredential(applicationId, type), applicationId)
  const revoke = async (applicationId: string, type: string) => {
    if (saving.value) return
    clearSecret()
    const current = generation
    saving.value = true
    try {
      await revokeCredential(applicationId, type)
      if (current !== generation) return
      const response = await queryCredentials(applicationId)
      if (current !== generation) return
      credentials.value = resultOf(response) || []
      onlyMessage(t('ThirdPartyApplication.credential.revoked'))
    } finally { if (current === generation) saving.value = false }
  }
  return { providers, credentials, secret, loading, saving, error, load, clearSecret, enable, reveal, rotate, revoke }
}
