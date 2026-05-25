import i18n from '@jetlinks-web-core/locales'
import {
  buildQueryFilter,
  decodeConditionFilterQuery,
  decodeLegacySearchQuery,
  normalizeInputTerms,
  type ConditionFilterTerm,
} from '@jetlinks-web-core/components/ConditionFilter'
import type {
  AuthorizationTemplateForm,
  AuthorizationTemplateEnumValue,
  AuthorizationTemplateItem,
  AuthorizationTemplateRiskLevel,
  AuthorizationTemplateScene,
  AuthorizationTemplateState,
  AuthorizationTemplateType,
  GrantScopePermit,
  ScopePermission,
} from './typings'

const t = i18n.global.t.bind(i18n.global)

export const getEnumValue = <T extends string = string>(value?: AuthorizationTemplateEnumValue<T>): T | undefined => {
  if (value && typeof value === 'object') {
    return value.value
  }
  return value
}

export const getEnumText = (value?: AuthorizationTemplateEnumValue) => {
  if (value && typeof value === 'object') {
    return value.text || value.label || value.value
  }
  return value
}

export const sceneOptions: { label: string; value: AuthorizationTemplateScene }[] = [
  { label: t('AuthorizationTemplate.scene.all'), value: 'all' },
  { label: t('AuthorizationTemplate.scene.personalToken'), value: 'personal_token' },
  { label: t('AuthorizationTemplate.scene.apiClient'), value: 'api_client' },
  { label: t('AuthorizationTemplate.scene.application'), value: 'application' },
  { label: t('AuthorizationTemplate.scene.automation'), value: 'automation' },
]

export const typeOptions: { label: string; value: AuthorizationTemplateType }[] = [
  { label: t('AuthorizationTemplate.type.system'), value: 'system' },
  { label: t('AuthorizationTemplate.type.tenant'), value: 'tenant' },
  { label: t('AuthorizationTemplate.type.user'), value: 'user' },
]

export const riskLevelOptions: { label: string; value: AuthorizationTemplateRiskLevel }[] = [
  { label: t('AuthorizationTemplate.risk.readonly'), value: 'readonly' },
  { label: t('AuthorizationTemplate.risk.write'), value: 'write' },
  { label: t('AuthorizationTemplate.risk.admin'), value: 'admin' },
]

export const stateOptions: { label: string; value: AuthorizationTemplateState }[] = [
  { label: t('AuthorizationTemplate.state.draft'), value: 'draft' },
  { label: t('AuthorizationTemplate.state.enabled'), value: 'enabled' },
  { label: t('AuthorizationTemplate.state.disabled'), value: 'disabled' },
  { label: t('AuthorizationTemplate.state.deprecated'), value: 'deprecated' },
]

export const stateStatusNames = {
  draft: 'processing',
  enabled: 'success',
  disabled: 'error',
  deprecated: 'warning',
}

export const columns = [
  {
    title: t('AuthorizationTemplate.field.name'),
    dataIndex: 'name',
    key: 'name',
    ellipsis: true,
    fixed: 'left',
    search: {
      type: 'string',
      first: true,
      componentProps: {
        placeholder: t('AuthorizationTemplate.placeholder.name'),
      },
    },
  },
  {
    title: t('AuthorizationTemplate.field.id'),
    dataIndex: 'id',
    key: 'id',
    ellipsis: true,
    search: {
      type: 'string',
      componentProps: {
        placeholder: t('AuthorizationTemplate.placeholder.id'),
      },
    },
  },
  {
    title: t('AuthorizationTemplate.field.scene'),
    dataIndex: 'scene',
    key: 'scene',
    scopedSlots: true,
    search: {
      type: 'select',
      options: sceneOptions,
      componentProps: {
        placeholder: t('AuthorizationTemplate.placeholder.scene'),
      },
    },
  },
  {
    title: t('AuthorizationTemplate.field.type'),
    dataIndex: 'type',
    key: 'type',
    scopedSlots: true,
    search: {
      type: 'select',
      options: typeOptions,
      componentProps: {
        placeholder: t('AuthorizationTemplate.placeholder.type'),
      },
    },
  },
  {
    title: t('AuthorizationTemplate.field.riskLevel'),
    dataIndex: 'riskLevel',
    key: 'riskLevel',
    scopedSlots: true,
    search: {
      type: 'select',
      options: riskLevelOptions,
      componentProps: {
        placeholder: t('AuthorizationTemplate.placeholder.riskLevel'),
      },
    },
  },
  {
    title: t('AuthorizationTemplate.field.state'),
    dataIndex: 'state',
    key: 'state',
    scopedSlots: true,
    search: {
      type: 'select',
      options: stateOptions,
      componentProps: {
        placeholder: t('AuthorizationTemplate.placeholder.state'),
      },
    },
  },
  {
    title: t('AuthorizationTemplate.field.scope'),
    dataIndex: 'scope',
    key: 'scope',
    scopedSlots: true,
  },
  {
    title: t('AuthorizationTemplate.field.version'),
    dataIndex: 'version',
    key: 'version',
    width: 90,
  },
  {
    title: t('AuthorizationTemplate.field.modifyTime'),
    dataIndex: 'modifyTime',
    key: 'modifyTime',
    scopedSlots: true,
    width: 180,
  },
  {
    title: t('AuthorizationTemplate.field.action'),
    dataIndex: 'action',
    key: 'action',
    fixed: 'right',
    scopedSlots: true,
    width: 150,
  },
]

export const normalizeRouteQuery = (value: unknown) => {
  if (Array.isArray(value)) {
    return value[0]
  }
  return typeof value === 'string' ? value : ''
}

export const buildAuthorizationTemplateFilter = (terms: ConditionFilterTerm[]) => {
  return buildQueryFilter(terms, columns)
}

const hasEffectiveTerms = (terms: ConditionFilterTerm[]) => {
  return buildAuthorizationTemplateFilter(terms).terms.length > 0
}

export const decodeAuthorizationTemplateRouteTerms = (value: unknown) => {
  const raw = normalizeRouteQuery(value)
  if (!raw) {
    return []
  }

  const candidates: string[] = []
  let current = raw
  for (let index = 0; index < 3; index += 1) {
    if (!candidates.includes(current)) {
      candidates.push(current)
    }
    try {
      const decoded = decodeURIComponent(current)
      if (decoded === current) {
        break
      }
      current = decoded
    } catch {
      break
    }
  }

  for (const item of candidates) {
    const terms = decodeConditionFilterQuery(item, columns)
    if (terms.length && hasEffectiveTerms(terms)) {
      return terms
    }

    const legacyTerms = decodeLegacySearchQuery(item, columns)
    if (legacyTerms.length && hasEffectiveTerms(legacyTerms)) {
      return legacyTerms
    }

    try {
      const payload = JSON.parse(item)
      const payloadTerms = Array.isArray(payload?.terms) ? payload.terms : []
      const normalizedTerms = normalizeInputTerms(payloadTerms, columns)
      if (normalizedTerms.length && hasEffectiveTerms(normalizedTerms)) {
        return normalizedTerms
      }
    } catch {
      // ignore invalid historical query payload
    }
  }

  return []
}

export const createEmptyForm = (): AuthorizationTemplateForm => ({
  id: '',
  name: '',
  description: '',
  scene: 'all',
  type: 'user',
  riskLevel: 'write',
  state: 'enabled',
  scopePermissions: [],
})

export const getOptionLabel = (options: { label: string; value: string }[], value?: AuthorizationTemplateEnumValue) => {
  const enumValue = getEnumValue(value)
  return options.find((item) => item.value === enumValue)?.label || getEnumText(value) || '--'
}

export const getScopePermissionCount = (template: AuthorizationTemplateItem) => {
  return template.scope?.permissions?.length || 0
}

export const toFormData = (data?: Partial<AuthorizationTemplateItem>): AuthorizationTemplateForm => {
  const form = createEmptyForm()
  if (!data?.id) {
    return form
  }
  return {
    ...form,
    id: data.id,
    name: data.name || '',
    description: data.description || '',
    scene: getEnumValue(data.scene) || form.scene,
    type: getEnumValue(data.type) || form.type,
    riskLevel: getEnumValue(data.riskLevel) || form.riskLevel,
    state: getEnumValue(data.state) || form.state,
    scopePermissions: fromGrantScopePermissions(data.scope?.permissions),
  }
}

export const fromGrantScopePermissions = (permissions?: GrantScopePermit[]): ScopePermission[] => {
  return (permissions || [])
    .filter((item) => !!item?.id)
    .map((item) => ({
      permission: item.id,
      actions: item.actions || [],
    }))
}

export const toGrantScopePermissions = (permissions: ScopePermission[]): GrantScopePermit[] => {
  return (permissions || [])
    .filter((item) => !!item?.permission && item.actions?.length)
    .map((item) => ({
      id: item.permission,
      actions: item.actions,
    }))
}

export const toTemplatePayload = (
  form: AuthorizationTemplateForm,
  source?: Partial<AuthorizationTemplateItem>,
) => {
  const sourceScope = source?.scope || {}

  return {
    ...source,
    id: form.id,
    name: form.name,
    description: form.description,
    scene: getEnumValue(form.scene),
    type: getEnumValue(form.type),
    riskLevel: getEnumValue(form.riskLevel),
    state: getEnumValue(form.state),
    scope: {
      ...sourceScope,
      // PermissionChoose 使用 permission 字段，后端 GrantScope.Permit 使用 id，集中转换避免各组件重复适配。
      permissions: toGrantScopePermissions(form.scopePermissions),
    },
  }
}
