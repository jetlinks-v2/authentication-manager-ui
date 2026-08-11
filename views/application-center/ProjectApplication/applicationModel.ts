import dayjs from 'dayjs'
import type {
  BusinessApplicationEntity,
  BusinessApplicationRoleEntity,
  BusinessApplicationTemplateEntity,
  DeviceEntity,
  EnumValue,
  MenuView,
  UserDetailEntity,
} from '@authentication-manager-ui/api/application-center/businessApplication'
import type {
  ApplicationResource,
  ApplicationFilters,
  ApplicationRole,
  ApplicationStatus,
  ApplicationTemplate,
  ApplicationUser,
  ProjectApplication,
} from './types'

type ResultEnvelope<T> = { result: T }

const isResultEnvelope = <T>(value: unknown): value is ResultEnvelope<T> =>
  typeof value === 'object' && value !== null && Object.prototype.hasOwnProperty.call(value, 'result')

export const resultOf = <T>(response: unknown): T => isResultEnvelope<T>(response)
  ? response.result
  : response as T

export const listOf = <T>(response: unknown): T[] => {
  const result = resultOf<unknown>(response)
  if (Array.isArray(result)) return result as T[]
  if (typeof result === 'object' && result !== null && Array.isArray((result as { data?: unknown }).data)) {
    return (result as { data: T[] }).data
  }
  return []
}

export const enumValue = (value: string | EnumValue | undefined, fallback: string) =>
  typeof value === 'object' ? String(value.value || fallback) : String(value || fallback)

export const enumText = (value: string | EnumValue | undefined, fallback: string) =>
  typeof value === 'object' ? String(value.text || value.value || fallback) : String(value || fallback)

export const buildApplicationTerms = (projectId: string, filters: ApplicationFilters) => {
  const terms: Array<Record<string, unknown>> = [
    { column: 'projectId', termType: 'eq', value: projectId },
  ]
  if (filters.keyword.trim()) {
    terms.push({ column: 'name', termType: 'like', value: filters.keyword.trim() })
  }
  if (filters.status) terms.push({ column: 'state', termType: 'eq', value: filters.status })
  if (filters.templateId) terms.push({ column: 'templateId', termType: 'eq', value: filters.templateId })
  return terms
}

const normalizeStatus = (value: string | EnumValue | undefined): ApplicationStatus =>
  enumValue(value, 'enabled') === 'disabled' ? 'disabled' : 'enabled'

export const normalizeApplication = (entity: BusinessApplicationEntity): ProjectApplication => {
  const status = normalizeStatus(entity.state)
  return {
    id: entity.id,
    projectId: entity.projectId,
    templateId: entity.templateId,
    name: entity.name,
    icon: entity.icon,
    description: entity.description || '',
    status,
    statusText: enumText(entity.state, status),
    createdAt: entity.createTime ? dayjs(entity.createTime).format('YYYY-MM-DD HH:mm') : '--',
    defaultLanguage: String(entity.configuration?.defaultLanguage || 'zh-CN'),
    domain: String(entity.configuration?.customDomain || ''),
  }
}

export const normalizeTemplate = (
  entity: BusinessApplicationTemplateEntity,
): ApplicationTemplate => {
  const status = normalizeStatus(entity.state)
  return {
    id: entity.id,
    name: entity.name,
    code: entity.code,
    icon: entity.icon,
    description: entity.description || '',
    status,
    statusText: enumText(entity.state, status),
    sortIndex: Number(entity.sortIndex || 0),
    disabled: status !== 'enabled',
  }
}

export const normalizeRole = (entity: BusinessApplicationRoleEntity): ApplicationRole => {
  const status = normalizeStatus(entity.state)
  return {
    id: entity.id,
    name: entity.name,
    description: entity.description || '',
    status,
    statusText: enumText(entity.state, status),
  }
}

export const normalizeUser = (
  entity: UserDetailEntity,
  applicationRoleIds: ReadonlySet<string> = new Set(),
): ApplicationUser => {
  const roleIds = (entity.roleList || []).map(item => item.id).filter(Boolean)
  return {
    id: entity.id,
    name: entity.name || entity.username,
    username: entity.username,
    phone: entity.telephone || '',
    email: entity.email || '',
    roleId: roleIds.find(id => applicationRoleIds.has(id)) || '',
    roleIds,
    orgIds: (entity.orgList || []).map(item => item.id).filter(Boolean),
    positionIds: (entity.positions || []).map(item => item.id).filter(Boolean),
    enabled: entity.status !== 0,
  }
}

export const normalizeDevice = (entity: DeviceEntity): ApplicationResource => {
  const status = enumValue(entity.state, 'offline')
  return {
    id: entity.id,
    name: entity.name || entity.id,
    serial: entity.id,
    category: entity.productName || entity.classifiedName || '--',
    status,
    statusText: enumText(entity.state, status),
    group: entity.classifiedName || '--',
  }
}

const menuName = (menu: MenuView) => String(menu.i18nName || menu.name || menu.code || menu.id || '')

export const flattenMenuNames = (menus: MenuView[] = []) => {
  const result: string[] = []
  const visit = (items: MenuView[]) => items.forEach(item => {
    const name = menuName(item)
    if (name) result.push(name)
    visit(Array.isArray(item.children) ? item.children : [])
  })
  visit(menus)
  return [...new Set(result)]
}
