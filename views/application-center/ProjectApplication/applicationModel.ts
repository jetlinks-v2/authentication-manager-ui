import dayjs from 'dayjs'
import { normalizeBasicLayoutVariant } from '@jetlinks-web-core/layout/runtime/layoutVariant'
import type {
  BusinessApplicationEntity,
  BusinessApplicationRoleEntity,
  BusinessApplicationTemplateEntity,
  DeviceEntity,
  EnumValue,
  MediaChannelEntity,
  MenuView,
  UserDetailEntity,
} from '@authentication-manager-ui/api/application-center/businessApplication'
import type {
  ApplicationCameraResource,
  ApplicationResourceGroup,
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

export const enumValue = (value: string | number | EnumValue | undefined, fallback: string) =>
  typeof value === 'object' ? String(value.value || fallback) : String(value || fallback)

export const enumText = (value: string | number | EnumValue | undefined, fallback: string) =>
  typeof value === 'object' ? String(value.text || value.value || fallback) : String(value || fallback)

const recordOf = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? value as Record<string, unknown> : {}

const textOf = (value: unknown) => value === undefined || value === null ? '' : String(value)

export const buildApplicationTerms = (projectId: string, filters: ApplicationFilters) => {
  const terms: Array<Record<string, unknown>> = [
    { column: 'projectId', termType: 'eq', value: projectId },
    ...filters.terms.map(term => ({ ...term })),
  ]
  return terms
}

const normalizeStatus = (value: string | EnumValue | undefined): ApplicationStatus =>
  enumValue(value, 'enabled') === 'disabled' ? 'disabled' : 'enabled'

// 历史模板可能没有布局配置，新增应用时继续使用应用端默认壳层。
const normalizeTemplateLayoutVariant = (value: unknown) =>
  normalizeBasicLayoutVariant(value) || 'application'

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
    timezone: String(entity.configuration?.timezone || 'Asia/Shanghai'),
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
    templateUrl: textOf(entity.templateUrl).trim(),
    status,
    statusText: enumText(entity.state, status),
    sortIndex: Number(entity.sortIndex || 0),
    layoutVariant: normalizeTemplateLayoutVariant(entity.layoutVariant),
      layout: entity.layout,
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
  const status = enumValue(entity.status, '1')
  return {
    id: entity.id,
    name: entity.name || entity.username,
    username: entity.username,
    phone: entity.telephone || '',
    email: entity.email || '',
    position: (entity.positions || []).map(item => item.name || item.id).filter(Boolean).join('、'),
    organization: (entity.orgList || []).map(item => item.name || item.id).filter(Boolean).join('、'),
    roleId: roleIds.find(id => applicationRoleIds.has(id)) || '',
    roleIds,
    orgIds: (entity.orgList || []).map(item => item.id).filter(Boolean),
    positionIds: (entity.positions || []).map(item => item.id).filter(Boolean),
    enabled: status !== '0' && status !== 'disabled',
  }
}

export const normalizeDevice = (
  entity: DeviceEntity,
  groups: ApplicationResourceGroup[] = [],
): ApplicationResource => {
  const status = enumValue(entity.state, 'offline')
  const product = entity.productName || entity.productId || entity.classifiedName || '--'
  const groupId = entity.groupId || ''
  const inferredGroups = groupId || entity.groupName
    ? [{ id: groupId || entity.groupName || '--', name: entity.groupName || groupId || '--' }]
    : []
  const resourceGroups = groups.length ? groups : inferredGroups
  const group = resourceGroups.map(item => item.name).filter(Boolean).join('、') || '--'
  const gateway = entity.parentName || entity.accessName || entity.parentId || entity.accessProvider || '--'
  return {
    id: entity.id,
    name: entity.name || entity.id,
    serial: entity.id,
    product,
    productId: entity.productId || product,
    category: product,
    groupId: resourceGroups[0]?.id || group,
    status,
    statusText: enumText(entity.state, status),
    group,
    gateway,
    gatewayId: entity.parentId || entity.accessId || gateway,
    groups: resourceGroups,
  }
}

export const normalizeCamera = (entity: MediaChannelEntity): ApplicationCameraResource => {
  const others = recordOf(entity.others)
  const status = enumValue(entity.status || entity.state, 'offline')
  const features = Array.isArray(entity.features) ? entity.features.map(item => enumValue(item, '')) : []
  const ptzType = enumValue(entity.ptzType, '0')
  const id = entity.id || `${entity.deviceId || ''}:${entity.channelId || ''}`
  const previewUrl = textOf(others.playerScreenshotCover) || textOf(others.latestSnapshotUrl) || entity.photoUrl

  return {
    id,
    deviceId: entity.deviceId || '',
    channelId: entity.channelId || id,
    name: entity.name || entity.channelId || id,
    serial: entity.channelId || id,
    product: entity.provider || entity.deviceName || '--',
    productId: entity.provider || entity.deviceId || '--',
    category: entity.deviceName || entity.provider || '--',
    groupId: entity.deviceId || entity.provider || '--',
    group: entity.deviceName || entity.provider || '--',
    gateway: entity.deviceName || entity.deviceId || entity.provider || '--',
    gatewayId: entity.deviceId || entity.deviceName || entity.provider || '--',
    area: textOf(others.areaName) || entity.address || entity.civilCode || '--',
    status,
    statusText: enumText(entity.status || entity.state, status),
    supportsPtz: features.includes('ptz') || ['1', '2', '4', 'ball', 'hemisphere', 'remoteControl'].includes(ptzType),
    previewUrl,
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
