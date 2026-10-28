import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { applicationDebugUrl } from '@authentication-manager-ui/api/application-center/applicationDebug'
import { getRequestTenantDomain } from '@jetlinks-web-core/utils/request-context'

export const useAccessGuide = () => {
  const { t } = useI18n()
  const tenantHeaders = computed(() => {
    const domain = getRequestTenantDomain()
    return domain ? [`X-Tenant-Domain: ${domain}`] : []
  })
  const tokenRequestExample = computed(() => [
    `POST ${applicationDebugUrl('/oauth2/token').href}`,
    'Content-Type: application/x-www-form-urlencoded',
    ...tenantHeaders.value,
    '',
    'grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET',
  ].join('\n'))
  const tokenResponseExample = JSON.stringify({ access_token: 'YOUR_ACCESS_TOKEN', token_type: 'Bearer', expires_in: 3600 }, null, 2)
  const bearerExample = computed(() => ['Authorization: Bearer YOUR_ACCESS_TOKEN', ...tenantHeaders.value].join('\n'))
  const signatureFields = '[X-Signature-Version, X-Application-Id, "", X-Key-Id, X-Timestamp, X-Event-Id, sha256Hex(rawBody)]'
  const signatureHeaders = computed(() => [
    { name: 'X-Signature-Version', description: t('ThirdPartyApplication.direct.accessGuide.headerVersion') },
    { name: 'X-Application-Id', description: t('ThirdPartyApplication.direct.accessGuide.headerApplication') },
    { name: 'X-Platform-Id', description: t('ThirdPartyApplication.direct.accessGuide.headerPlatform') },
    { name: 'X-Key-Id', description: t('ThirdPartyApplication.direct.accessGuide.headerKey') },
    { name: 'X-Timestamp', description: t('ThirdPartyApplication.direct.accessGuide.headerTimestamp') },
    { name: 'X-Event-Id', description: t('ThirdPartyApplication.direct.accessGuide.headerEvent') },
    { name: 'X-Signature', description: t('ThirdPartyApplication.direct.accessGuide.headerSignature') },
  ])
  return { signatureFields, signatureHeaders, tokenRequestExample, tokenResponseExample, bearerExample }
}
