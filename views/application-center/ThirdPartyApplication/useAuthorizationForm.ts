import { computed, reactive, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AuthorizationDraft, AvailableApplication } from '@authentication-manager-ui/api/application-center/thirdPartyIntegration'
import { reasonValid } from './integrationUtils'

export const scopeLabel = (scope: string, t: (key: string) => string) =>
  ['device.read', 'asset.read', 'alarm.read', 'organization.read', 'user.read'].includes(scope)
    ? t('ThirdPartyApplication.project.scope.' + scope) : scope
export const resourceLabel = (type: string, t: (key: string) => string) =>
  ['device', 'asset', 'alarm', 'organization', 'user'].includes(type)
    ? t('ThirdPartyApplication.project.resource.' + type) : type
export const useAuthorizationForm = (profile: MaybeRefOrGetter<AvailableApplication | undefined>) => {
  const { t } = useI18n()
  const draft = reactive<AuthorizationDraft>({ grantedScopes: [], resourceGrants: [], reason: '' })
  const reset = (value?: Pick<AuthorizationDraft, 'grantedScopes' | 'resourceGrants'>) => {
    draft.grantedScopes = [...(value?.grantedScopes || [])]
    draft.resourceGrants = (value?.resourceGrants || []).map(grant => ({ ...grant, resourceIds: [...grant.resourceIds] }))
    draft.reason = ''
  }
  const validation = computed(() => {
    const approved = toValue(profile)
    if (!approved) return t('ThirdPartyApplication.project.approvalUnavailable')
    if (!draft.grantedScopes.length) return t('ThirdPartyApplication.project.scopesRequired')
    if (draft.grantedScopes.some(scope => !approved.approvedScopes.includes(scope))) return t('ThirdPartyApplication.project.outsideApproval')
    const types = new Set<string>()
    for (const grant of draft.resourceGrants) {
      if (!approved.approvedResourceTypes.includes(grant.type) || types.has(grant.type)) return t('ThirdPartyApplication.project.invalidResourceType')
      types.add(grant.type)
      if (grant.mode === 'selected' && (!grant.resourceIds.length || grant.resourceIds.some(id => !id.trim() || id.trim() === '*'))) {
        return t('ThirdPartyApplication.project.resourcesRequired')
      }
      if (grant.mode !== 'selected' && grant.mode !== 'all_current') return t('ThirdPartyApplication.project.invalidResourceMode')
    }
    if (!reasonValid(draft.reason)) return t('ThirdPartyApplication.project.reasonRequired')
    return ''
  })
  const payload = (): AuthorizationDraft => ({
    grantedScopes: [...new Set(draft.grantedScopes)], reason: draft.reason.trim(),
    resourceGrants: draft.resourceGrants.map(grant => ({ ...grant,
      resourceIds: grant.mode === 'all_current' ? [] : [...new Set(grant.resourceIds.map(id => id.trim()))],
    })),
  })
  return { draft, reset, validation, payload }
}
