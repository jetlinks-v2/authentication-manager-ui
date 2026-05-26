import i18n from '@jetlinks-web-core/locales'
import type {
  AuthorizationTemplateAction,
  AuthorizationTemplateItem,
  GrantScopePermit,
  ScopePermission,
} from './typings'

const t = i18n.global.t.bind(i18n.global)

export const normalizeGrantScopePermissions = (permissions?: GrantScopePermit[]): GrantScopePermit[] => {
  const grouped = new Map<string, Set<string>>()
  ;(permissions || [])
    .filter((item) => !!item?.id)
    .forEach((item) => {
      const actions = (item.actions || []).filter(Boolean)
      if (!actions.length) {
        return
      }
      const current = grouped.get(item.id) || new Set<string>()
      actions.forEach((action) => current.add(action))
      grouped.set(item.id, current)
    })
  return Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, actions]) => ({
      id,
      actions: Array.from(actions).sort(),
    }))
}

export const fromGrantScopePermissions = (permissions?: GrantScopePermit[]): ScopePermission[] => {
  return normalizeGrantScopePermissions(permissions)
    .map((item) => ({
      permission: item.id,
      actions: item.actions || [],
    }))
}

export const toGrantScopePermissions = (permissions: ScopePermission[]): GrantScopePermit[] => {
  return (permissions || [])
    .filter((item) => !!item?.permission && item.actions?.length)
    .map((item) => ({
      id: item.permission.trim(),
      actions: Array.from(new Set(item.actions.filter(Boolean))).sort(),
    }))
}

export const getTemplateActions = (template?: Partial<AuthorizationTemplateItem>): AuthorizationTemplateAction[] => {
  const actions = template?.actions || template?.configuration?.actions
  if (Array.isArray(actions) && actions.length) {
    return actions
      .filter((item) => item?.id)
      .map((item) => ({
        id: item.id,
        name: item.name || item.id,
        description: item.description || '',
        permissions: normalizeGrantScopePermissions(item.permissions),
      }))
  }

  const permissions = normalizeGrantScopePermissions(template?.scope?.permissions)
  if (permissions.length) {
    return [
      {
        id: 'all',
        name: t('AuthorizationTemplate.actionGroup.defaultAll'),
        description: '',
        permissions,
      },
    ]
  }
  return []
}

export const getTemplateActionCount = (template: AuthorizationTemplateItem) => {
  return getTemplateActions(template).length
}

export const compileActionPermissions = (actions: AuthorizationTemplateAction[]) => {
  return normalizeGrantScopePermissions(actions.flatMap((item) => item.permissions || []))
}

export const normalizeTemplateActions = (actions: AuthorizationTemplateAction[]) => {
  return (actions || [])
    .filter((item) => item?.id)
    .map((item) => ({
      id: item.id.trim(),
      name: (item.name || item.id).trim(),
      description: item.description?.trim() || undefined,
      permissions: normalizeGrantScopePermissions(item.permissions),
    }))
    .filter((item) => item.id && item.name && item.permissions.length)
}
