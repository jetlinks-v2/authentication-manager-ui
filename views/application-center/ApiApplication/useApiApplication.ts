import { computed, ref } from 'vue'
import { onlyMessage } from '@jetlinks-web/utils'
import { useI18n } from 'vue-i18n'
import {
  deleteApiApplication,
  getApiApplication,
  queryApiApplications,
  queryApiGroups,
  queryBusinessApplications,
  saveApiApplication,
  updateApiApplication,
} from '@authentication-manager-ui/api/application-center/apiApplication'
import type {
  ApiApplication,
  ApiApplicationForm,
  ApiGroup,
  ApiGroupGrant,
  BusinessApplication,
  ConditionFilterPayload,
} from './types'

const resultOf = <T>(response: any): T => response?.result ?? response?.data ?? response

const enumValue = (value: unknown) =>
  typeof value === 'object' && value !== null && 'value' in value
    ? String((value as { value: unknown }).value)
    : String(value ?? '')

const randomKey = (length: number) => {
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('')
}
export const makeApiApplication = (form: ApiApplicationForm, groups: ApiGroup[]): {
  application: ApiApplication
  grants: ApiGroupGrant[]
  businessApplicationIds: string[]
} => {
  const id = randomKey(16)
  const secureKey = randomKey(32)
  const grants = groups
    .filter(group => enumValue(group.status) !== 'disabled')
    .map(group => ({
      targetType: 'api-client',
      targetId: id,
      groupId: group.id,
      operationIds: (group.operations || []).map(operation => operation.id),
      ...(group.accessSupport && enumValue(group.accessSupport) === 'support'
        ? {
            assetAccesses: {
              assetType: group.assetType || 'device',
              accesses: [{ supportId: 'business_application' }],
            },
          }
        : {}),
    }))

  return {
    application: {
      id,
      name: form.name.trim(),
      description: form.description?.trim(),
      provider: 'internal-standalone',
      integrationModes: ['apiServer'],
      state: 'enabled',
      apiServer: { secureKey, signature: 'MD5' },
    },
    grants,
    businessApplicationIds: form.businessApplicationIds,
  }
}

export function useApiApplication() {
  const { t: $t } = useI18n()
  const applications = ref<ApiApplication[]>([])
  const businessApplications = ref<BusinessApplication[]>([])
  const groups = ref<ApiGroup[]>([])
  const loading = ref(false)
  const loadingOptions = ref(false)
  const error = ref<unknown>()
  const total = ref(0)
  const pageIndex = ref(0)
  const pageSize = ref(20)
  const filter = ref<ConditionFilterPayload>({ terms: [] })

  const requestParams = computed(() => ({
    paging: true,
    pageIndex: pageIndex.value,
    pageSize: pageSize.value,
    sorts: [{ name: 'createTime', order: 'desc' }],
    terms: [
      { column: 'provider', termType: 'eq', value: 'internal-standalone' },
      { column: 'integrationModes', termType: 'like', value: 'apiServer' },
      ...(filter.value.terms || []),
    ],
  }))

  const refresh = async () => {
    loading.value = true
    error.value = undefined
    try {
      const response = await queryApiApplications(requestParams.value)
      const value = resultOf<any>(response)
      applications.value = Array.isArray(value) ? value : value?.data || []
      total.value = Array.isArray(value) ? applications.value.length : Number(value?.total || 0)
    } catch (cause) {
      error.value = cause
      applications.value = []
    } finally {
      loading.value = false
    }
  }

  const loadOptions = async () => {
    if (groups.value.length || businessApplications.value.length) return
    loadingOptions.value = true
    try {
      const [groupResponse, applicationResponse] = await Promise.all([
        queryApiGroups({ paging: false }),
        queryBusinessApplications({ paging: false }),
      ])
      groups.value = resultOf<ApiGroup[]>(groupResponse) || []
      businessApplications.value = resultOf<BusinessApplication[]>(applicationResponse) || []
    } finally {
      loadingOptions.value = false
    }
  }

  const create = async (form: ApiApplicationForm) => {
    await loadOptions()
    const payload = makeApiApplication(form, groups.value)
    await saveApiApplication(payload)
    onlyMessage($t('ApiApplication.message.created'))
    await refresh()
    return payload.application
  }

  const toggle = async (application: ApiApplication) => {
    const nextState = enumValue(application.state) === 'disabled' ? 'enabled' : 'disabled'
    await updateApiApplication(application.id, { state: nextState })
    onlyMessage($t('ApiApplication.message.statusUpdated'))
    await refresh()
  }

  const remove = async (application: ApiApplication) => {
    await deleteApiApplication(application.id)
    onlyMessage($t('ApiApplication.message.deleted'))
    await refresh()
  }

  const reveal = async (id: string) => {
    const response = await getApiApplication(id)
    return resultOf<ApiApplication>(response)
  }

  return {
    applications,
    businessApplications,
    groups,
    loading,
    loadingOptions,
    error,
    total,
    pageIndex,
    pageSize,
    filter,
    refresh,
    loadOptions,
    create,
    toggle,
    remove,
    reveal,
    enumValue,
  }
}
