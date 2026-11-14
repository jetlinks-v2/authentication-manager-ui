import globalI18n from '@jetlinks-web-core/locales'
import dayjs from 'dayjs'
import { normalizeBasicLayoutVariant } from '@jetlinks-web-core/layout/runtime/layoutVariant'
import type { CardAvatarData } from '@jetlinks-web-core/components/CardBox/types'
import type { ConditionTerm } from '@jetlinks-web-core/components/ConditionFilter'
import type {
  BusinessApplicationEntity,
  BusinessApplicationRoleEntity,
  BusinessApplicationTemplateEntity,
  DeviceEntity,
  EnumValue,
  MediaChannelEntity,
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

/** 卡片与筛选共用应用类型选项，语言切换时重新取展示文案。 */
export const getApplicationProviderOptions = (translate: (key: string) => string) => [
  { label: translate('ProjectApplication.create.businessApplication'), value: 'official' },
  { label: translate('ProjectApplication.create.thirdPartyApplication'), value: 'third-party' },
]

/** 类型是模板属性，包含此条件的查询需要先加载模板。 */
export const hasApplicationProviderFilter = (terms: readonly ConditionTerm[]): boolean =>
  terms.some(term => term.terms ? hasApplicationProviderFilter(term.terms) : term.column === 'provider')

/** 将虚拟类型条件转为模板 ID 条件，保留分组逻辑及后端资产权限过滤。 */
export const buildApplicationTerms = (
  filters: ApplicationFilters,
  templates: readonly Pick<ApplicationTemplate, 'id' | 'provider'>[],
) => {
  const convertTerm = (term: ConditionTerm): Record<string, unknown> => {
    if (term.terms) return { ...term, terms: term.terms.map(convertTerm) }
    if (term.column !== 'provider') return { ...term }

    const providers = Array.isArray(term.value) ? term.value : [term.value]
    const templateIds = templates
      .filter(template => providers.includes(template.provider || 'official'))
      .map(template => template.id)
    const excluded = term.termType === 'nin'
    // templateId 必填；空集合用空值条件表达，避免空 IN 被忽略而返回全部应用。
    return {
      ...term,
      column: 'templateId',
      termType: templateIds.length ? (excluded ? 'nin' : 'in') : (excluded ? 'notnull' : 'isnull'),
      value: templateIds.length ? templateIds : 1,
    }
  }
  return filters.terms.map(convertTerm)
}

const normalizeStatus = (value: string | EnumValue | undefined): ApplicationStatus =>
  enumValue(value, 'enabled') === 'disabled' ? 'disabled' : 'enabled'

// 历史模板可能没有布局配置，新增应用时继续使用应用端默认壳层。
const normalizeTemplateLayoutVariant = (value: unknown) =>
  normalizeBasicLayoutVariant(value) || 'application'

/** 应用图标规则：应用优先，其次模板，无图标时显示名称首字。 */
export function applicationAvatar(
  application: Pick<ProjectApplication, 'name' | 'icon'>,
  template?: Pick<ApplicationTemplate, 'icon'>,
): CardAvatarData {
  const icon = application.icon?.trim() || template?.icon?.trim()
  const usesImage = !!icon && (/^(https?:|data:|\/)/.test(icon) || icon.includes('.'))
  return {
    src: usesImage ? icon : undefined,
    icon: icon && !usesImage ? icon : undefined,
    text: application.name.slice(0, 1),
    tone: 'info',
  }
}

/** 详情图片沿用应用的图片地址；未配置图片时展示模板封面，不使用模板图标。 */
export function applicationImage(
  application: Pick<ProjectApplication, 'name' | 'icon'>,
  template?: Pick<ApplicationTemplate, 'coverImage'>,
): string {
  return applicationAvatar(application).src || template?.coverImage?.trim() || ''
}

/** 应用类型由关联模板决定，忽略历史实例打开配置。 */
export const normalizeApplication = (entity: BusinessApplicationEntity, template?: ApplicationTemplate): ProjectApplication => {
  const status = normalizeStatus(entity.state)
  return {
    id: entity.id,
    templateId: entity.templateId,
    name: entity.name,
    icon: entity.icon,
    description: entity.description || '',
    status,
    statusText: enumText(entity.state, status),
    createdAt: entity.createTime ? dayjs(entity.createTime).format('YYYY-MM-DD HH:mm') : globalI18n.global.t('comm.table.empty-2'),
    defaultLanguage: String(entity.configuration?.defaultLanguage || 'zh-CN'),
    timezone: String(entity.configuration?.timezone || 'Asia/Shanghai'),
    domain: String(entity.configuration?.customDomain || ''),
    provider: template?.provider,
  }
}

export const normalizeTemplate = (
  entity: BusinessApplicationTemplateEntity,
): ApplicationTemplate => {
  const status = normalizeStatus(entity.state)
  return {
    id: entity.id,
    name: entity.i18nName || entity.name,
    code: entity.code,
    icon: entity.icon,
    coverImage: textOf(entity.coverImage).trim(),
    description: entity.i18nDescription || entity.description || '',
    templateUrl: textOf(entity.templateUrl).trim(),
    status,
    statusText: enumText(entity.state, status),
    sortIndex: Number(entity.sortIndex || 0),
    layoutVariant: normalizeTemplateLayoutVariant(entity.layoutVariant),
    layout: String(entity.configuration?.layout || 'side'),
    provider: entity.provider,
    redirectUri: textOf(entity.configuration?.redirectUri).trim(),
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
  const product = entity.productName || entity.productId || entity.classifiedName || globalI18n.global.t('comm.table.empty')
  const groupId = entity.groupId || ''
  const inferredGroups = groupId || entity.groupName
    ? [{ id: groupId || entity.groupName || '', name: entity.groupName || groupId || globalI18n.global.t('comm.table.empty') }]
    : []
  const resourceGroups = groups.length ? groups : inferredGroups
  const group = resourceGroups.map(item => item.name).filter(Boolean).join('、') || globalI18n.global.t('comm.table.empty')
  const gateway = entity.parentName || entity.accessName || entity.parentId || entity.accessProvider || globalI18n.global.t('comm.table.empty')
  return {
    id: entity.id,
    name: entity.name || entity.id,
    serial: entity.id,
    product,
    productId: entity.productId || entity.productName || entity.classifiedName || '',
    category: product,
    groupId: resourceGroups[0]?.id || '',
    status,
    statusText: enumText(entity.state, status),
    group,
    gateway,
    gatewayId: entity.parentId || entity.accessId || entity.parentName || entity.accessName || entity.accessProvider || '',
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
    product: entity.provider || entity.deviceName || globalI18n.global.t('comm.table.empty'),
    productId: entity.provider || entity.deviceId || '',
    category: entity.deviceName || entity.provider || globalI18n.global.t('comm.table.empty'),
    groupId: entity.deviceId || entity.provider || '',
    group: entity.deviceName || entity.provider || globalI18n.global.t('comm.table.empty'),
    gateway: entity.deviceName || entity.deviceId || entity.provider || globalI18n.global.t('comm.table.empty'),
    gatewayId: entity.deviceId || entity.deviceName || entity.provider || '',
    area: textOf(others.areaName) || entity.address || entity.civilCode || globalI18n.global.t('comm.table.empty'),
    status,
    statusText: enumText(entity.status || entity.state, status),
    supportsPtz: features.includes('ptz') || ['1', '2', '4', 'ball', 'hemisphere', 'remoteControl'].includes(ptzType),
    previewUrl,
  }
}
